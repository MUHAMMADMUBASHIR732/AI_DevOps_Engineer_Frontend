import type { CreateJobRequest, Job, Stage } from '../types'
import { recordJob } from './mockStore'

/**
 * Simulates POST /jobs without a backend. Returns a freshly-queued job and
 * records it in the mock history store. The mock event stream (mockStream.ts)
 * drives it to completion and updates the stored status/URL as it goes.
 */
export function mockCreateJob(req: CreateJobRequest): Promise<Job> {
  const now = new Date().toISOString()
  const job: Job = {
    job_id: crypto.randomUUID(),
    status: 'queued' as Stage,
    repo_url: req.repo_url,
    created_at: now,
    logs: [],
  }
  recordJob(job)
  // Fake a little network latency so loading states are visible.
  return new Promise((resolve) => setTimeout(() => resolve(job), 400))
}
