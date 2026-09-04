import { useEffect, useMemo, useState } from 'react'
import type { JobEvent, JobStatus, Stage } from '../types'
import { subscribeToJob } from '../lib/stream'

export interface JobStreamState {
  /** All events received so far, in arrival order. */
  events: JobEvent[]
  /** Overall job status, derived from the event sequence. */
  status: JobStatus
  /** The most recent non-terminal stage (null before the first event). */
  currentStage: Stage | null
  /** Final deployed URL, once the `done` success event arrives. */
  deployedUrl: string | null
  /** True while the stream is open. */
  connected: boolean
  /** Set if the stream errors (e.g. real backend not wired yet). */
  error: string | null
}

/**
 * Subscribes to a job's event stream and accumulates it into render-ready
 * state. Pass null to stay idle. Transport-agnostic — works against the mock
 * stream today and the real WebSocket later (subscribeToJob decides which).
 */
export function useJobStream(
  jobId: string | null,
  initialEvents: JobEvent[] = [],
): JobStreamState {
  const [events, setEvents] = useState<JobEvent[]>(initialEvents)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Reset for each new job (and on StrictMode remount).
    setEvents(initialEvents)
    setConnected(false)
    setError(null)
    if (!jobId) return

    const seen = new Set(initialEvents.map((e) => `${e.timestamp}|${e.stage}|${e.message}`))

    const controller = subscribeToJob(jobId, {
      onEvent: (event) =>
        setEvents((prev) => {
          const key = `${event.timestamp}|${event.stage}|${event.message}`
          if (seen.has(key)) return prev
          seen.add(key)
          return [...prev, event]
        }),
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onError: (err) => setError(err.message),
    })
    return () => controller.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed only on jobId change
  }, [jobId])

  const status = useMemo<JobStatus>(() => {
    const done = events.find((e) => e.stage === 'done')
    if (done) return done.status === 'success' ? 'succeeded' : 'failed'
    return events.length > 0 ? 'running' : 'queued'
  }, [events])

  const currentStage = useMemo<Stage | null>(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].stage !== 'done') return events[i].stage
    }
    return null
  }, [events])

  const deployedUrl = useMemo<string | null>(() => {
    const done = events.find((e) => e.stage === 'done' && e.status === 'success')
    return done?.data?.url ?? null
  }, [events])

  return { events, status, currentStage, deployedUrl, connected, error }
}
