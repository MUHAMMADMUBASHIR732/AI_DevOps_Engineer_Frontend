import { useState, type ReactNode } from 'react'
import { AuthControl } from './components/AuthControl'
import { RepoUrlForm } from './components/RepoUrlForm'
import { PipelineRail } from './components/PipelineRail'
import { JobLog } from './components/JobLog'
import { SelfHealCallout } from './components/SelfHealCallout'
import { StatusBadge } from './components/StatusBadge'
import { History } from './components/History'
import { useAuth } from './auth/AuthContext'
import { useJobStream } from './hooks/useJobStream'
import { getJob, USE_MOCK } from './lib/api'
import type { Job } from './types'

type View = 'new' | 'history'

function App() {
  const { user, configured } = useAuth()
  const [view, setView] = useState<View>('new')
  const [activeJob, setActiveJob] = useState<Job | null>(null)

  // Auth is optional for the hackathon demo — keys enable GitHub OAuth when
  // configured in Supabase, but unsigned users can still submit jobs.
  const canUse = true
  const showAuthHint = configured && !user

  function switchView(next: View) {
    setView(next)
    setActiveJob(null)
  }

  async function openJob(jobId: string) {
    try {
      setActiveJob(await getJob(jobId))
    } catch {
      // Job should exist for anything shown in history; ignore for now.
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-lg shadow-indigo-500/20">
              ⚙
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">AI DevOps Engineer</h1>
              <p className="text-xs text-slate-400">Autonomous Repo-to-Deployment Agent</p>
            </div>
          </div>
          <AuthControl />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
        {canUse ? (
          <>
            {showAuthHint && (
              <div className="mb-6 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs text-sky-300">
                Signed out — jobs still work. Sign in with GitHub (top-right) after enabling the
                GitHub provider in Supabase Auth.
              </div>
            )}
            {!configured && (
              <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
                Supabase keys missing in <code className="text-amber-200">.env.local</code> — auth
                disabled. Backend URL: <code className="text-amber-200">{import.meta.env.VITE_API_BASE_URL || 'not set'}</code>
              </div>
            )}

            <nav className="mb-6 flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1 text-sm">
              <TabButton active={view === 'new'} onClick={() => switchView('new')}>
                New deploy
              </TabButton>
              <TabButton active={view === 'history'} onClick={() => switchView('history')}>
                History
              </TabButton>
            </nav>

            {activeJob ? (
              <ActiveJob job={activeJob} onReset={() => setActiveJob(null)} />
            ) : view === 'history' ? (
              <History onOpen={openJob} />
            ) : (
              <RepoUrlForm onJobCreated={setActiveJob} />
            )}
          </>
        ) : (
          <SignInPrompt />
        )}
      </main>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
        active ? 'bg-slate-700/60 text-white' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function ActiveJob({ job, onReset }: { job: Job; onReset: () => void }) {
  const { events, status, deployedUrl, error } = useJobStream(job.job_id, job.logs ?? [])

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Deployment job</h2>
          <p className="mt-0.5 truncate text-sm text-slate-400">{job.repo_url}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-6 px-2">
        <PipelineRail events={events} />
      </div>

      <SelfHealCallout events={events} />

      {deployedUrl &&
        (USE_MOCK ? (
          // Mock mode: the URL is simulated (nothing was really deployed), so
          // show it as a labelled, non-clickable banner — no dead-link surprises.
          <div
            title="Simulated URL — real deployments go live once the backend is connected"
            className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/30"
          >
            <span className="min-w-0 truncate">🎉 Live at {deployedUrl}</span>
            <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-500/40">
              Demo
            </span>
          </div>
        ) : (
          <div
            title="Configuration created — link your GitHub repo in Vercel/Render dashboard for actual deployment"
            className="mb-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300 ring-1 ring-amber-500/30"
          >
            <span className="min-w-0 truncate">⚙️ Configuration: {deployedUrl}</span>
            <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-amber-500/40">
              Setup Required
            </span>
          </div>
        ))}

      {error && (
        <p className="mb-4 rounded-lg bg-rose-500/10 px-4 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
          {error}
        </p>
      )}

      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Live logs</span>
        {(status === 'cloning' || status === 'analyzing' || status === 'generating' || status === 'deploying') && (
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
        )}
      </div>
      <JobLog events={events} />

      <button
        type="button"
        onClick={onReset}
        className="mt-4 text-sm text-indigo-400 transition hover:text-indigo-300"
      >
        ← Back
      </button>
    </div>
  )
}

function SignInPrompt() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-xl">
        <h2 className="text-2xl font-semibold text-white">Deploy any GitHub repo</h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in with GitHub to paste a repository URL and watch the AI clone,
          containerize, self-heal, and deploy it — live.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Use the “Sign in with GitHub” button in the top-right.
        </p>
      </div>
    </div>
  )
}

export default App
