import type { Job, JobSummary } from '../types'

/**
 * localStorage-backed store for mock deployment history, so the History view
 * populates and survives reloads with zero backend. When the real backend is
 * wired, GET /api/jobs replaces listMockJobs — this module goes unused.
 */

const KEY = 'aidevops.mock.jobs'
const MAX = 50

function load(): Job[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Job[]) : []
  } catch {
    return []
  }
}

function save(jobs: Job[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(jobs.slice(0, MAX)))
  } catch {
    /* storage unavailable — history just won't persist */
  }
}

/** Insert (or replace) a job at the top of the mock history. */
export function recordJob(job: Job): void {
  const jobs = load().filter((j) => j.job_id !== job.job_id)
  jobs.unshift(job)
  save(jobs)
}

/** Shallow-merge a patch into a stored job. No-op if the job is unknown. */
export function updateMockJob(jobId: string, patch: Partial<Job>): void {
  const jobs = load()
  const idx = jobs.findIndex((j) => j.job_id === jobId)
  if (idx === -1) return
  jobs[idx] = { ...jobs[idx], ...patch }
  save(jobs)
}

export function getMockJob(jobId: string): Job | undefined {
  return load().find((j) => j.job_id === jobId)
}

export function listMockJobs(): JobSummary[] {
  return load().map((j) => ({
    job_id: j.job_id,
    repo_url: j.repo_url,
    status: j.status,
    deployed_url: j.deployed_url ?? null,
    provider: j.provider ?? j.target_provider ?? null,
    created_at: j.created_at,
  }))
}
