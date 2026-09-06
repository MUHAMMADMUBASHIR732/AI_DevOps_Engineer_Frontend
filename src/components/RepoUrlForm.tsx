import { useState, type FormEvent } from 'react'
import { createJob, USE_MOCK } from '../lib/api'
import type { Job } from '../types'

const GITHUB_URL_RE = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/i

export function RepoUrlForm({ onJobCreated }: { onJobCreated: (job: Job) => void }) {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = url.trim()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!GITHUB_URL_RE.test(trimmed)) {
      setError('Enter a valid public GitHub repo URL, e.g. https://github.com/owner/repo')
      return
    }
    setSubmitting(true)
    try {
      const job = await createJob({ repo_url: trimmed })
      onJobCreated(job)
      setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Deploy a repository</h2>
        {USE_MOCK && (
          <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-300 ring-1 ring-sky-500/30">
            Mock mode
          </span>
        )}
      </div>
      <p className="mb-5 text-sm text-slate-400">
        Paste a public GitHub repo URL. The agent will automatically detect the stack and deploy to the appropriate platform (Vercel for frontend, Render for backend).
      </p>

      <label htmlFor="repo" className="mb-1.5 block text-xs font-medium text-slate-400">
        GitHub repository URL
      </label>
      <input
        id="repo"
        type="url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          if (error) setError(null)
        }}
        placeholder="https://github.com/owner/repo"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
      />

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting || !trimmed}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Deploy'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
    </form>
  )
}
