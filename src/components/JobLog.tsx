import { useEffect, useRef } from 'react'
import type { JobEvent, Stage } from '../types'
import { STAGE_LABEL } from '../lib/stageMeta'
import { USE_MOCK } from '../lib/api'

const STAGE_COLOR: Record<Stage, string> = {
  queued: 'text-slate-400',
  cloning: 'text-sky-400',
  analyzing: 'text-indigo-400',
  generating: 'text-purple-400',
  building: 'text-amber-400',
  healing: 'text-orange-400',
  deploying: 'text-emerald-400',
  done: 'text-green-400',
  failed: 'text-rose-400',
  needs_review: 'text-yellow-400',
}

const GLYPH: Record<Stage, string> = {
  queued: '•',
  cloning: '●',
  analyzing: '●',
  generating: '●',
  building: '●',
  healing: '⚡',
  deploying: '🚀',
  done: '✓',
  failed: '✗',
  needs_review: '?',
}

/** Scrolling, styled log with per-event structured data surfaced inline. */
export function JobLog({ events }: { events: JobEvent[] }) {
  const ref = useRef<HTMLDivElement>(null)

  // Follow the stream: keep the newest line in view.
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events])

  return (
    <div
      ref={ref}
      className="max-h-96 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 py-1 text-xs"
    >
      {events.length === 0 ? (
        <p className="px-3 py-2 text-slate-600">Waiting for events…</p>
      ) : (
        events.map((event, i) => <LogRow key={i} event={event} />)
      )}
    </div>
  )
}

function LogRow({ event }: { event: JobEvent }) {
  const color = STAGE_COLOR[event.stage]
  const isRunning = event.stage === 'cloning' || event.stage === 'analyzing' || 
                   event.stage === 'generating' || event.stage === 'deploying'
  return (
    <div className="flex gap-3 border-b border-slate-800/50 px-3 py-1.5 last:border-0">
      <span className={`mt-px w-3 shrink-0 text-center ${color} ${isRunning ? 'animate-pulse' : ''}`}>
        {GLYPH[event.stage]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
            {STAGE_LABEL[event.stage]}
          </span>
          <span className="min-w-0 flex-1 text-slate-200">{event.message}</span>
          <span className="shrink-0 text-[10px] text-slate-600">{event.timestamp.slice(11, 19)}</span>
        </div>
        <LogData event={event} />
      </div>
    </div>
  )
}

/** Renders structured data from event messages for new backend format. */
function LogData({ event }: { event: JobEvent }) {
  const { stage, message } = event

  // Show deployment URLs in deploy/done stages
  if ((stage === 'deploying' || stage === 'done') && message.includes('http')) {
    const urlMatch = message.match(/https?:\/\/[^\s]+/)
    if (urlMatch) {
      const url = urlMatch[0]
      return USE_MOCK ? (
        <span className="mt-1 inline-block text-[11px] text-emerald-400/80">{url}</span>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block text-[11px] text-amber-400">{url}</span>
          <span className="text-[10px] text-amber-500/80">(Configuration created - link GitHub repo in dashboard)</span>
        </div>
      )
    }
  }

  // Show detection information
  if (stage === 'analyzing' && message.includes('detected')) {
    return (
      <p className="mt-1 rounded-md border border-indigo-500/30 bg-indigo-500/5 px-2 py-1 text-[11px] text-indigo-300">
        {message}
      </p>
    )
  }

  // Show configuration messages
  if (stage === 'done' && message.includes('configured')) {
    return (
      <p className="mt-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-300">
        {message}
      </p>
    )
  }

  // Show error messages
  if (stage === 'failed') {
    return (
      <pre className="mt-1 overflow-x-auto rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-300">
        {message}
      </pre>
    )
  }

  return null
}
