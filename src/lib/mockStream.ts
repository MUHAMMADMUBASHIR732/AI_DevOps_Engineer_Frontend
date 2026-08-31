import type {
  EventStatus,
  JobEvent,
  JobEventData,
  JobStreamController,
  JobStreamHandlers,
  Provider,
  Stage,
} from '../types'
import { getMockJob, updateMockJob } from './mockStore'

/**
 * A scripted mock of the live event stream. Given a job_id, it emits the exact
 * API_CONTRACT.md §6 sequence on realistic timers — including the self-heal
 * moment (build fails → LLM patches Dockerfile → rebuild succeeds → deploy).
 * Also updates the mock history store so the History view reflects the outcome.
 */

interface Step {
  /** ms after the previous step */
  delay: number
  stage: Stage
  status: EventStatus
  message: string
  attempt?: number
  data?: JobEventData
}

const PROVIDER_DOMAIN: Record<Provider, string> = {
  render: 'onrender.com',
  railway: 'up.railway.app',
  fly: 'fly.dev',
  alibaba: 'alicloudapp.com',
}

const PROVIDER_LABEL: Record<Provider, string> = {
  render: 'Render',
  railway: 'Railway',
  fly: 'Fly.io',
  alibaba: 'Alibaba Cloud',
}

/** Pull "repo" out of a github.com/owner/repo URL for a nicer fake deploy URL. */
function repoSlug(repoUrl: string): string {
  const m = repoUrl.match(/github\.com\/[\w.-]+\/([\w.-]+?)(?:\.git)?\/?$/i)
  return (m?.[1] ?? 'app').toLowerCase()
}

export function subscribeMockStream(
  jobId: string,
  handlers: JobStreamHandlers,
): JobStreamController {
  const job = getMockJob(jobId)
  const provider: Provider = job?.target_provider ?? 'render'
  const slug = repoSlug(job?.repo_url ?? 'app')
  const url = `https://${slug}-${jobId.slice(0, 6)}.${PROVIDER_DOMAIN[provider]}`
  const repoLabel = job?.repo_url ?? 'repository'

  const steps: Step[] = [
    { delay: 300, stage: 'clone', status: 'running', message: `Cloning ${repoLabel}…` },
    { delay: 900, stage: 'clone', status: 'success', message: 'Repository cloned (42 files)' },
    { delay: 500, stage: 'analyze', status: 'running', message: 'Analyzing codebase with Gemini…' },
    {
      delay: 1600,
      stage: 'analyze',
      status: 'success',
      message: 'Detected Node + Express, listens on port 3000',
      data: { language: 'node', framework: 'express', entrypoint: 'index.js', port: 3000, package_manager: 'npm' },
    },
    { delay: 500, stage: 'generate', status: 'running', message: 'Generating Dockerfile…' },
    {
      delay: 1400,
      stage: 'generate',
      status: 'success',
      message: 'Dockerfile generated',
      data: {
        dockerfile:
          'FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nEXPOSE 3000\nCMD ["node", "index.js"]',
      },
    },
    {
      delay: 700,
      stage: 'build',
      status: 'running',
      message: 'Building image (attempt 1)…',
      attempt: 1,
      data: { attempt: 1, max_attempts: 3 },
    },
    {
      delay: 1900,
      stage: 'build',
      status: 'failed',
      message: 'Build failed: node-gyp requires python3',
      attempt: 1,
      data: {
        attempt: 1,
        max_attempts: 3,
        error_excerpt: 'gyp ERR! find Python — Python is not set from command line or npm configuration',
      },
    },
    {
      delay: 800,
      stage: 'self_heal',
      status: 'running',
      message: 'Reading build error, patching Dockerfile…',
      attempt: 1,
      data: { attempt: 1, max_attempts: 3, error_summary: 'node-gyp missing python3 / build tools' },
    },
    {
      delay: 1700,
      stage: 'self_heal',
      status: 'success',
      message: 'Patched Dockerfile: added python3 + build-base before npm ci',
      attempt: 1,
      data: { patch_summary: 'RUN apk add --no-cache python3 make g++ (added before npm ci)' },
    },
    {
      delay: 700,
      stage: 'build',
      status: 'running',
      message: 'Rebuilding image (attempt 2)…',
      attempt: 2,
      data: { attempt: 2, max_attempts: 3 },
    },
    { delay: 2100, stage: 'build', status: 'success', message: 'Image built; container passed health check', attempt: 2 },
    {
      delay: 700,
      stage: 'deploy',
      status: 'running',
      message: `Deploying to ${PROVIDER_LABEL[provider]}…`,
      data: { provider },
    },
    { delay: 2200, stage: 'deploy', status: 'success', message: 'Deployment is live', data: { url, provider } },
    {
      delay: 500,
      stage: 'done',
      status: 'success',
      message: 'Deployed successfully 🎉',
      data: { url, provider, duration_ms: 15200 },
    },
  ]

  const timers: ReturnType<typeof setTimeout>[] = []
  let closed = false

  // Announce "connected" on the next tick (mirrors a WebSocket open event).
  timers.push(setTimeout(() => !closed && handlers.onOpen?.(), 0))

  let elapsed = 0
  steps.forEach((step, idx) => {
    elapsed += step.delay
    timers.push(
      setTimeout(() => {
        if (closed) return
        const event: JobEvent = {
          job_id: jobId,
          stage: step.stage,
          status: step.status,
          message: step.message,
          timestamp: new Date().toISOString(),
          ...(step.attempt !== undefined ? { attempt: step.attempt } : {}),
          ...(step.data ? { data: step.data } : {}),
        }
        handlers.onEvent(event)

        // Keep the mock history store in sync with the run.
        if (idx === 0) {
          updateMockJob(jobId, { status: 'running', updated_at: event.timestamp })
        }
        if (step.stage === 'deploy' && step.status === 'success') {
          updateMockJob(jobId, { deployed_url: url, provider, updated_at: event.timestamp })
        }
        if (step.stage === 'done') {
          updateMockJob(jobId, {
            status: step.status === 'success' ? 'succeeded' : 'failed',
            deployed_url: url,
            provider,
            updated_at: event.timestamp,
          })
          handlers.onClose?.()
        }
      }, elapsed),
    )
  })

  return {
    close: () => {
      closed = true
      timers.forEach(clearTimeout)
    },
  }
}
