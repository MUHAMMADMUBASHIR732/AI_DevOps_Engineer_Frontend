import type { CreateJobRequest, Job } from '../types'
import { recordJob } from './mockStore'

/**
 * Simulates POST /api/jobs without a backend. Returns a freshly-queued job and
 * records it in the mock history store. The mock event stream (mockStream.ts)
 * drives it to completion and updates the stored status/URL as it goes.
 */
export function mockCreateJob(req: CreateJobRequest): Promise<Job> {
  const now = new Date().toISOString()
  const job: Job = {
    job_id: crypto.randomUUID(),
    status: 'queued',
    repo_url: req.repo_url,
    target_provider: req.target_provider,
    deployed_url: null,
    provider: null,
    created_at: now,
    updated_at: now,
    events: [],
  }
  recordJob(job)
  // Fake a little network latency so loading states are visible.
  return new Promise((resolve) => setTimeout(() => resolve(job), 400))
}
