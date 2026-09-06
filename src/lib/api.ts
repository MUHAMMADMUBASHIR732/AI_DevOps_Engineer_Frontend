import { supabase } from './supabase'
import { mockCreateJob } from './mock'
import { getMockJob, listMockJobs } from './mockStore'
import type { CreateJobRequest, Job, JobSummary, DeploymentResult } from '../types'

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

/** POST /jobs — create a deployment job. */
export async function createJob(req: CreateJobRequest): Promise<Job> {
  if (USE_MOCK) return mockCreateJob(req)
  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  return (await res.json()) as Job
}

/** GET /jobs/{id} — full job state incl. event history (used on reconnect). */
export async function getJob(jobId: string): Promise<Job> {
  if (USE_MOCK) {
    const job = getMockJob(jobId)
    if (!job) throw new ApiError(404, 'Job not found')
    return job
  }
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    headers: { ...(await authHeader()) },
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  return (await res.json()) as Job
}

/** GET /jobs — deployment history for the signed-in user. */
export async function listJobs(): Promise<JobSummary[]> {
  if (USE_MOCK) return listMockJobs()
  const res = await fetch(`${API_BASE}/jobs`, {
    headers: { ...(await authHeader()) },
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  const body = (await res.json()) as JobSummary[]
  return body ?? []
}

/** GET /deployments/{service_id}/status — get Render deployment status. */
export async function getDeploymentStatus(serviceId: string): Promise<Record<string, unknown>> {
  if (USE_MOCK) return { status: 'ready', url: 'https://mock-render-url.onrender.com' }
  const res = await fetch(`${API_BASE}/deployments/${serviceId}/status`, {
    headers: { ...(await authHeader()) },
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  return (await res.json()) as Record<string, unknown>
}

/** GET /deployments/jobs/{job_id}/deployment — get deployment info for a job. */
export async function getJobDeployment(jobId: string): Promise<DeploymentResult> {
  if (USE_MOCK) {
    return {
      platform: 'render',
      deployment_url: 'https://mock-deployment-url.onrender.com',
      deployment_id: 'mock-service-id',
      status: 'ready',
      message: 'Mock deployment successful',
    }
  }
  const res = await fetch(`${API_BASE}/deployments/jobs/${jobId}/deployment`, {
    headers: { ...(await authHeader()) },
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  return (await res.json()) as DeploymentResult
}
