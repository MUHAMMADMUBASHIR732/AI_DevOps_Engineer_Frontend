import type { JobStatus } from '../types'

const STATUS_BADGE: Record<JobStatus, { label: string; dot: string; ring: string }> = {
  queued: { label: 'Queued', dot: 'bg-slate-400', ring: 'bg-slate-700/40 text-slate-300 ring-slate-600/50' },
  running: { label: 'Running', dot: 'bg-sky-400 animate-pulse', ring: 'bg-sky-500/10 text-sky-300 ring-sky-500/30' },
  succeeded: { label: 'Succeeded', dot: 'bg-emerald-400', ring: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
  failed: { label: 'Failed', dot: 'bg-rose-400', ring: 'bg-rose-500/10 text-rose-300 ring-rose-500/30' },
}

export function StatusBadge({ status }: { status: JobStatus }) {
  const s = STATUS_BADGE[status]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${s.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
