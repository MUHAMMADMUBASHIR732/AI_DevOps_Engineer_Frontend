import { useEffect, useState } from 'react'
import type { JobSummary, Stage } from '../types'
import { listJobs } from '../lib/api'
import { StatusBadge } from './StatusBadge'

/** github.com/owner/repo → owner/repo */
function repoName(url: string): string {
  const m = url.match(/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i)
  return m?.[1] ?? url
}

function formatWhen(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** Deployment history — a list of past jobs. Click one to re-view it. */
export function History({ onOpen }: { onOpen: (jobId: string) => void }) {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    listJobs()
      .then((j) => alive && setJobs(j))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Failed to load history'))
    return () => {
      alive = false
    }
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm text-rose-300">
        {error}
      </div>
    )
  }

  if (jobs === null) {
    return <p className="text-sm text-slate-500">Loading history…</p>
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
        <p className="text-sm text-slate-400">No deployments yet.</p>
        <p className="mt-1 text-xs text-slate-500">Deploy a repo and it’ll show up here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <button
          key={job.job_id}
          type="button"
          onClick={() => onOpen(job.job_id)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-left transition hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">{repoName(job.repo_url)}</p>
            <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-slate-500">
              <span className="shrink-0">{formatWhen(job.created_at)}</span>
            </p>
          </div>
          <StatusBadge status={job.status as Stage} />
        </button>
      ))}
    </div>
  )
}
