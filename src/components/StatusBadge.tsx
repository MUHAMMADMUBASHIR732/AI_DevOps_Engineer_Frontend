import type { Stage } from '../types'

const STATUS_BADGE: Record<Stage, { label: string; dot: string; ring: string }> = {
  queued: { label: 'Queued', dot: 'bg-slate-400', ring: 'bg-slate-700/40 text-slate-300 ring-slate-600/50' },
  cloning: { label: 'Cloning', dot: 'bg-sky-400 animate-pulse', ring: 'bg-sky-500/10 text-sky-300 ring-sky-500/30' },
  analyzing: { label: 'Analyzing', dot: 'bg-indigo-400 animate-pulse', ring: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30' },
  generating: { label: 'Generating', dot: 'bg-purple-400 animate-pulse', ring: 'bg-purple-500/10 text-purple-300 ring-purple-500/30' },
  building: { label: 'Building', dot: 'bg-amber-400 animate-pulse', ring: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' },
  healing: { label: 'Healing', dot: 'bg-orange-400 animate-pulse', ring: 'bg-orange-500/10 text-orange-300 ring-orange-500/30' },
  deploying: { label: 'Deploying', dot: 'bg-emerald-400 animate-pulse', ring: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
  done: { label: 'Done', dot: 'bg-green-400', ring: 'bg-green-500/10 text-green-300 ring-green-500/30' },
  failed: { label: 'Failed', dot: 'bg-rose-400', ring: 'bg-rose-500/10 text-rose-300 ring-rose-500/30' },
  needs_review: { label: 'Needs Review', dot: 'bg-yellow-400', ring: 'bg-yellow-500/10 text-yellow-300 ring-yellow-500/30' },
}

export function StatusBadge({ status }: { status: Stage }) {
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
