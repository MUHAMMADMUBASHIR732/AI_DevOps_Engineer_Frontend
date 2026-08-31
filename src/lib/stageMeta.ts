import type { Stage } from '../types'

export interface StageMeta {
  key: Stage
  label: string
}

/** Core stages shown as nodes in the pipeline rail, in execution order. */
export const PIPELINE_STAGES: StageMeta[] = [
  { key: 'clone', label: 'Clone' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'generate', label: 'Generate' },
  { key: 'build', label: 'Build' },
  { key: 'deploy', label: 'Deploy' },
]

/** Human labels for every stage (used by the log). */
export const STAGE_LABEL: Record<Stage, string> = {
  queued: 'Queued',
  clone: 'Clone',
  analyze: 'Analyze',
  generate: 'Generate',
  build: 'Build',
  self_heal: 'Self-heal',
  deploy: 'Deploy',
  done: 'Done',
}
