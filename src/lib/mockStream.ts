import type {
  JobEvent,
  JobStreamController,
  JobStreamHandlers,
  Stage,
} from '../types'
import { getMockJob, updateMockJob } from './mockStore'

/**
 * A scripted mock of the live event stream. Given a job_id, it emits the exact
 * backend sequence on realistic timers — including deployment to Vercel/Render.
 * Also updates the mock history store so the History view reflects the outcome.
 */

interface Step {
  /** ms after the previous step */
  delay: number
  stage: Stage
  message: string
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
  const slug = repoSlug(job?.repo_url ?? 'app')
  const url = `https://${slug}-${jobId.slice(0, 6)}.vercel.app`
  const repoLabel = job?.repo_url ?? 'repository'

  const steps: Step[] = [
    { delay: 300, stage: 'queued', message: 'Job queued' },
    { delay: 900, stage: 'cloning', message: `Cloning ${repoLabel}…` },
    { delay: 1500, stage: 'cloning', message: 'Repository cloned (42 files)' },
    { delay: 500, stage: 'analyzing', message: 'Detecting deployment type' },
    { delay: 1600, stage: 'analyzing', message: 'Detected Next.js framework, deploying to Vercel' },
    { delay: 500, stage: 'deploying', message: 'Configuring Vercel deployment…' },
    { delay: 2200, stage: 'deploying', message: 'Vercel deployment configured' },
    { delay: 500, stage: 'done', message: `Vercel deployment configured: ${url}. Link your GitHub repo in Vercel dashboard to complete deployment.` },
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
          message: step.message,
          timestamp: new Date().toISOString(),
        }
        handlers.onEvent(event)

        // Keep the mock history store in sync with the run.
        if (idx === 0) {
          updateMockJob(jobId, { status: 'cloning' as any })
        }
        if (step.stage === 'done') {
          updateMockJob(jobId, {
            status: 'done' as any,
            deployment: {
              platform: 'vercel',
              deployment_url: url,
              deployment_id: jobId,
              status: 'created',
              message: 'Vercel deployment configured. Link your GitHub repo in Vercel dashboard to complete deployment.',
            },
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
