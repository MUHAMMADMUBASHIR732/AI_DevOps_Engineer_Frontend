import { Fragment } from 'react'
import type { EventStatus, JobEvent, Stage } from '../types'
import { PIPELINE_STAGES } from '../lib/stageMeta'

type ChipState = 'pending' | 'running' | 'success' | 'failed'

/** Latest status seen per stage (events are chronological, so last write wins). */
function latestStatusByStage(events: JobEvent[]): Map<Stage, EventStatus> {
  const m = new Map<Stage, EventStatus>()
  for (const e of events) m.set(e.stage, e.status)
  return m
}

function toChipState(status: EventStatus | undefined): ChipState {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'failed'
  if (status === 'running' || status === 'info') return 'running'
  return 'pending'
}

const NODE_CLASS: Record<ChipState, string> = {
  pending: 'border-slate-700 bg-slate-900 text-slate-600',
  running: 'border-sky-500 bg-sky-500/15 text-sky-300 animate-pulse',
  success: 'border-emerald-500 bg-emerald-500/15 text-emerald-300',
  failed: 'border-rose-500 bg-rose-500/15 text-rose-300',
}

const LABEL_CLASS: Record<ChipState, string> = {
  pending: 'text-slate-600',
  running: 'text-sky-300',
  success: 'text-emerald-300',
  failed: 'text-rose-300',
}

const GLYPH: Record<ChipState, string> = {
  pending: '○',
  running: '●',
  success: '✓',
  failed: '✗',
}

/** Horizontal stage tracker. Each node lights up as its stage runs / succeeds / fails. */
export function PipelineRail({ events }: { events: JobEvent[] }) {
  const byStage = latestStatusByStage(events)

  return (
    <div className="flex items-center pb-6">
      {PIPELINE_STAGES.map((stage, i) => {
        const state = toChipState(byStage.get(stage.key))
        const prevState =
          i > 0 ? toChipState(byStage.get(PIPELINE_STAGES[i - 1].key)) : 'success'
        return (
          <Fragment key={stage.key}>
            {i > 0 && (
              <div
                className={`h-0.5 flex-1 rounded ${
                  prevState === 'success' ? 'bg-emerald-500/50' : 'bg-slate-700'
                }`}
              />
            )}
            <div className="relative flex flex-col items-center">
              <div
                className={`z-10 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${NODE_CLASS[state]}`}
              >
                {GLYPH[state]}
              </div>
              <span
                className={`absolute top-10 whitespace-nowrap text-[11px] font-medium ${LABEL_CLASS[state]}`}
              >
                {stage.label}
              </span>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
