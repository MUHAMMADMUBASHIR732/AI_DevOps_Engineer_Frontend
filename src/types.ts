// Types mirroring backend contracts — keep in sync with backend/app/contracts.py

export type Stage =
  | 'queued'
  | 'cloning'
  | 'analyzing'
  | 'generating'
  | 'building'
  | 'healing'
  | 'deploying'
  | 'done'
  | 'failed'
  | 'needs_review'

export type EventStatus = 'running' | 'success' | 'failed' | 'info'

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export type Provider = 'vercel' | 'render'

export type DeploymentType = 'static' | 'vercel_native' | 'container' | 'ambiguous'

/** A single streamed event — a WebSocket frame, or an item in Job.events. */
export interface JobEvent {
  job_id: string
  stage: Stage
  message: string
  timestamp: string // ISO 8601 UTC
}

/** Deployment detection result */
export interface DetectionResult {
  deployment_type: DeploymentType
  confidence: 'high' | 'medium' | 'low'
  detected_framework: string
  entry_point?: string
  listen_port?: number
  reasoning: string
  needs_dockerfile: boolean
  ambiguous_reason?: string
  detection_method: 'rule_based' | 'llm'
}

/** Deployment result from Vercel or Render */
export interface DeploymentResult {
  platform: 'vercel' | 'render'
  deployment_url: string
  deployment_id: string
  status: string
  message: string
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
  status: Stage
  repo_url: string
  created_at: string
  logs: JobEvent[]
  result?: DockerfileResult
  error?: string
  repo_path?: string
  detection?: DetectionInfo
  deployment?: DeploymentResult
}

export interface DetectionInfo {
  deployment_type: DeploymentType
  needs_dockerfile: boolean
  detected_framework: string
  entry_point?: string
  listen_port?: number
  reasoning: string
  detection_method: string
}

export interface DockerfileResult {
  language: string
  framework: string
  entry_point: string
  port: number
  start_command: string
  dockerfile_content: string
  metadata?: {
    raw_response: {
      language: string
      framework: string
      entry_point: string
      port: number
      start_command: string
      dockerfile_content: string
    }
  }
}

export interface JobSummary {
  job_id: string
  repo_url: string
  status: Stage
  created_at: string
}

export interface CreateJobRequest {
  repo_url: string
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
