import type { Stage } from '../types'

export interface StageMeta {
  key: Stage
  label: string
}

/** Core stages shown as nodes in the pipeline rail, in execution order. */
export const PIPELINE_STAGES: StageMeta[] = [
  { key: 'cloning', label: 'Clone' },
  { key: 'analyzing', label: 'Analyze' },
  { key: 'generating', label: 'Generate' },
  { key: 'deploying', label: 'Deploy' },
]

/** Human labels for every stage (used by the log). */
export const STAGE_LABEL: Record<Stage, string> = {
  queued: 'Queued',
  cloning: 'Cloning',
  analyzing: 'Analyzing',
  generating: 'Generating',
  building: 'Building',
  healing: 'Healing',
  deploying: 'Deploying',
  done: 'Done',
  failed: 'Failed',
  needs_review: 'Needs Review',
}
