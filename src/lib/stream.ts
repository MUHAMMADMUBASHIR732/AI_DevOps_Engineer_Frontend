import type { JobEvent, JobStreamController, JobStreamHandlers, Stage } from '../types'
import { getJob, USE_MOCK } from './api'
import { subscribeMockStream } from './mockStream'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function wsUrl(jobId: string): string {
  const base = API_BASE.replace(/^http/, 'ws').replace(/\/$/, '')
  return `${base}/ws/jobs/${encodeURIComponent(jobId)}`
}

function eventKey(e: Pick<JobEvent, 'timestamp' | 'stage' | 'message' | 'status'>): string {
  return `${e.timestamp}|${e.stage}|${e.status}|${e.message}`
}

/**
 * Subscribe to a job's live event stream.
 * Mock mode → scripted local timeline; otherwise → WebSocket + HTTP poll fallback.
 */
export function subscribeToJob(jobId: string, handlers: JobStreamHandlers): JobStreamController {
  if (USE_MOCK) {
    return subscribeMockStream(jobId, handlers)
  }

  let socket: WebSocket | null = null
  let closed = false
  let lastStage: Stage | null = null
  const seen = new Set<string>()
  let pollTimer: ReturnType<typeof setInterval> | null = null

  function emit(raw: JobEvent) {
    if (!raw?.job_id || !raw?.stage) return
    const key = eventKey(raw)
    if (seen.has(key)) return
    seen.add(key)

    if (
      lastStage &&
      lastStage !== 'done' &&
      raw.stage !== lastStage &&
      raw.status !== 'failed'
    ) {
      const bridge: JobEvent = {
        job_id: raw.job_id,
        stage: lastStage,
        status: 'success',
        message: `${lastStage} complete`,
        timestamp: raw.timestamp,
      }
      const bKey = eventKey(bridge)
      if (!seen.has(bKey)) {
        seen.add(bKey)
        handlers.onEvent(bridge)
      }
    }

    handlers.onEvent(raw)
    lastStage = raw.stage === 'done' ? 'done' : raw.stage
  }

  async function syncFromHttp() {
    if (closed) return
    try {
      const job = await getJob(jobId)
      for (const ev of job.events ?? []) emit(ev)
      // Stop polling once terminal.
      if (job.status === 'succeeded' || job.status === 'failed') {
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
      }
    } catch {
      /* ignore transient poll errors */
    }
  }

  try {
    socket = new WebSocket(wsUrl(jobId))
  } catch (err) {
    handlers.onError?.(err instanceof Error ? err : new Error(String(err)))
    // Still poll so the UI works without WS.
    void syncFromHttp()
    pollTimer = setInterval(() => void syncFromHttp(), 2000)
    return {
      close: () => {
        closed = true
        if (pollTimer) clearInterval(pollTimer)
      },
    }
  }

  socket.onopen = () => {
    if (closed) {
      try {
        socket?.close()
      } catch {
        /* ignore */
      }
      return
    }
    handlers.onOpen?.()
    try {
      socket?.send(jobId)
    } catch {
      /* ignore */
    }
    void syncFromHttp()
  }

  socket.onmessage = (ev) => {
    if (closed) return
    try {
      emit(JSON.parse(String(ev.data)) as JobEvent)
    } catch (err) {
      handlers.onError?.(err instanceof Error ? err : new Error('Bad WS payload'))
    }
  }

  socket.onerror = () => {
    // CONNECTING→close from React StrictMode cleanup often surfaces here; don't
    // treat intentional teardown as a hard failure. Polling covers gaps.
    if (!closed && socket?.readyState === WebSocket.CLOSED) {
      handlers.onError?.(
        new Error('WebSocket dropped — falling back to status polling.'),
      )
    }
  }

  socket.onclose = () => {
    handlers.onClose?.()
  }

  // HTTP poll as safety net (StrictMode remount / missed WS frames).
  void syncFromHttp()
  pollTimer = setInterval(() => void syncFromHttp(), 2000)

  return {
    close: () => {
      closed = true
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      const s = socket
      socket = null
      if (!s) return
      // Avoid "closed before the connection is established" noise:
      // if still connecting, wait for open (onopen checks `closed`) instead of
      // calling close() immediately.
      if (s.readyState === WebSocket.CONNECTING) {
        return
      }
      if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CLOSING) {
        try {
          s.close()
        } catch {
          /* ignore */
        }
      }
    },
  }
}
