import { useEffect, useRef, type ReactNode } from 'react'
import type { EventStatus, JobEvent } from '../types'
import { STAGE_LABEL } from '../lib/stageMeta'
import { USE_MOCK } from '../lib/api'

const STATUS_TEXT: Record<EventStatus, string> = {
  running: 'text-sky-400',
  success: 'text-emerald-400',
  failed: 'text-rose-400',
  info: 'text-slate-400',
}

const GLYPH: Record<EventStatus, string> = {
  running: '●',
  success: '✓',
  failed: '✗',
  info: '•',
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
  const color = STATUS_TEXT[event.status]
  return (
    <div className="flex gap-3 border-b border-slate-800/50 px-3 py-1.5 last:border-0">
      <span className={`mt-px w-3 shrink-0 text-center ${color} ${event.status === 'running' ? 'animate-pulse' : ''}`}>
        {GLYPH[event.status]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
            {STAGE_LABEL[event.stage]}
          </span>
          {event.attempt !== undefined && (
            <span className="shrink-0 rounded bg-slate-800 px-1 text-[10px] text-slate-400">
              try {event.attempt}
            </span>
          )}
          <span className="min-w-0 flex-1 text-slate-200">{event.message}</span>
          <span className="shrink-0 text-[10px] text-slate-600">{event.timestamp.slice(11, 19)}</span>
        </div>
        <LogData event={event} />
      </div>
    </div>
  )
}

/** Renders the structured `data` payload for events that carry one. */
function LogData({ event }: { event: JobEvent }) {
  const d = event.data
  if (!d) return null
  const { stage, status } = event

  if (stage === 'analyze' && status === 'success') {
    const chips = [
      d.language,
      d.framework,
      d.package_manager,
      d.port ? `port ${d.port}` : undefined,
    ].filter((x): x is string => Boolean(x))
    if (chips.length === 0) return null
    return (
      <div className="mt-1 flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <Chip key={i}>{c}</Chip>
        ))}
      </div>
    )
  }

  if (stage === 'generate' && status === 'success' && d.dockerfile) {
    return (
      <details className="mt-1">
        <summary className="cursor-pointer text-[11px] text-indigo-400 hover:text-indigo-300">
          View Dockerfile
        </summary>
        <pre className="mt-1 overflow-x-auto rounded-md border border-slate-800 bg-black/40 p-2 text-[11px] leading-relaxed text-slate-300">
          {d.dockerfile}
        </pre>
      </details>
    )
  }

  if (stage === 'build' && status === 'failed' && d.error_excerpt) {
    return (
      <pre className="mt-1 overflow-x-auto rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-300">
        {d.error_excerpt}
      </pre>
    )
  }

  if (stage === 'self_heal') {
    const text = d.patch_summary ?? d.error_summary
    if (text) {
      return (
        <p className="mt-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-300">
          {text}
        </p>
      )
    }
  }

  if ((stage === 'deploy' || stage === 'done') && status === 'success' && d.url) {
    // Non-clickable in mock mode — the URL is simulated.
    return USE_MOCK ? (
      <span className="mt-1 inline-block text-[11px] text-emerald-400/80">{d.url}</span>
    ) : (
      <a
        href={d.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block text-[11px] text-emerald-400 hover:underline"
      >
        {d.url}
      </a>
    )
  }

  return null
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-slate-700">
      {children}
    </span>
  )
}
