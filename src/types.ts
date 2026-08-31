// Types mirroring API_CONTRACT.md §5 — keep in sync with the backend.

export type Stage =
  | 'queued'
  | 'clone'
  | 'analyze'
  | 'generate'
  | 'build'
  | 'self_heal'
  | 'deploy'
  | 'done'

export type EventStatus = 'running' | 'success' | 'failed' | 'info'

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export type Provider = 'render' | 'railway' | 'fly' | 'alibaba'

/** A single streamed event — a WebSocket frame, or an item in Job.events. */
export interface JobEvent {
  job_id: string
  stage: Stage
  status: EventStatus
  message: string
  timestamp: string // ISO 8601 UTC
  attempt?: number
  data?: JobEventData
}

/** Stage-specific structured payloads (all optional; see contract §5). */
export interface JobEventData {
  // analyze
  language?: string
  framework?: string
  entrypoint?: string
  port?: number
  package_manager?: string
  // generate
  dockerfile?: string
  // build / self_heal
  attempt?: number
  max_attempts?: number
  error_excerpt?: string
  error_summary?: string
  patch_summary?: string
  // deploy / done
  url?: string
  provider?: Provider
  duration_ms?: number
  reason?: string
  [key: string]: unknown
}

export interface Job {
  job_id: string
  status: JobStatus
  repo_url: string
  user_id?: string
  target_provider?: Provider
  deployed_url?: string | null
  provider?: Provider | null
  created_at: string
  updated_at?: string
  events?: JobEvent[]
}

export interface JobSummary {
  job_id: string
  repo_url: string
  status: JobStatus
  deployed_url?: string | null
  provider?: Provider | null
  created_at: string
}

export interface CreateJobRequest {
  repo_url: string
  target_provider?: Provider
}

// ── Streaming ────────────────────────────────────────────────────────────
// A transport-agnostic contract so the mock stream and the real WebSocket
// client are interchangeable behind subscribeToJob().

export interface JobStreamHandlers {
  onEvent: (event: JobEvent) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (err: Error) => void
}

export interface JobStreamController {
  close: () => void
}
