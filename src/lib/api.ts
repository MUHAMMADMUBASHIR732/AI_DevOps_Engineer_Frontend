import { supabase } from './supabase'
import { mockCreateJob } from './mock'
import { getMockJob, listMockJobs } from './mockStore'
import type { CreateJobRequest, Job, JobSummary } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL

/** Mock mode: on when explicitly forced, or when no backend URL is configured. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !API_BASE

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Attach the Supabase access token as a Bearer header when signed in. */
async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readError(res: Response): Promise<string> {
  try {
    return (await res.text()) || res.statusText
  } catch {
    return res.statusText
  }
}

/** POST /api/jobs — create a deployment job. */
export async function createJob(req: CreateJobRequest): Promise<Job> {
  if (USE_MOCK) return mockCreateJob(req)
  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  return (await res.json()) as Job
}

/** GET /api/jobs/{id} — full job state incl. event history (used on reconnect). */
export async function getJob(jobId: string): Promise<Job> {
  if (USE_MOCK) {
    const job = getMockJob(jobId)
    if (!job) throw new ApiError(404, 'Job not found')
    return job
  }
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    headers: { ...(await authHeader()) },
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  return (await res.json()) as Job
}

/** GET /api/jobs — deployment history for the signed-in user. */
export async function listJobs(): Promise<JobSummary[]> {
  if (USE_MOCK) return listMockJobs()
  const res = await fetch(`${API_BASE}/api/jobs`, {
    headers: { ...(await authHeader()) },
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  const body = (await res.json()) as { jobs: JobSummary[] }
  return body.jobs ?? []
}
