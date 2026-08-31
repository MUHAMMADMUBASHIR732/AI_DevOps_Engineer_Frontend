import type { JobEvent } from '../types'

type HealPhase = 'diagnosing' | 'retrying' | 'healed' | 'failed'

interface HealInfo {
  phase: HealPhase
  errorSummary: string | null
  errorExcerpt: string | null
  patch: string | null
  failedAttempt: number
  maxAttempts: number
  retryAttempt: number
}

function findLastIndex<T>(arr: T[], pred: (x: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i
  return -1
}

/** Reconstruct the self-heal story from the event stream, or null if it hasn't happened. */
function deriveHeal(events: JobEvent[]): HealInfo | null {
  const lastHealIdx = findLastIndex(events, (e) => e.stage === 'self_heal')
  if (lastHealIdx === -1) return null

  const healRunning = events.find((e) => e.stage === 'self_heal' && e.status === 'running')
  const healSuccess = events.find((e) => e.stage === 'self_heal' && e.status === 'success')
  const failedBuild = events.find((e) => e.stage === 'build' && e.status === 'failed')

  // Build events after the latest self_heal are the retry.
  const buildsAfter = events.filter((e, i) => i > lastHealIdx && e.stage === 'build')
  const retrySucceeded = buildsAfter.some((e) => e.status === 'success')
  const retryFailed = buildsAfter.some((e) => e.status === 'failed')

  let phase: HealPhase
  if (retrySucceeded) phase = 'healed'
  else if (retryFailed) phase = 'failed'
  else if (healSuccess) phase = 'retrying' // fix applied, rebuilding (or about to)
  else phase = 'diagnosing' // reading the error, writing the patch

  const failedAttempt = failedBuild?.attempt ?? healRunning?.attempt ?? 1
  const maxAttempts = healRunning?.data?.max_attempts ?? failedBuild?.data?.max_attempts ?? 3
  const retryAttempt = buildsAfter[0]?.attempt ?? failedAttempt + 1

  return {
    phase,
    errorSummary: healRunning?.data?.error_summary ?? null,
    errorExcerpt: failedBuild?.data?.error_excerpt ?? null,
    patch: healSuccess?.data?.patch_summary ?? null,
    failedAttempt,
    maxAttempts,
    retryAttempt,
  }
}

const CARD: Record<HealPhase, string> = {
  diagnosing: 'border-amber-500/40 bg-amber-500/5',
  retrying: 'border-amber-500/40 bg-amber-500/5',
  healed: 'border-emerald-500/40 bg-emerald-500/5',
  failed: 'border-rose-500/40 bg-rose-500/5',
}

const BADGE: Record<HealPhase, string> = {
  diagnosing: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  retrying: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  healed: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
}

const TITLE: Record<HealPhase, string> = {
  diagnosing: 'Self-healing in progress',
  retrying: 'Fix applied — rebuilding',
  healed: 'Self-healed automatically',
  failed: 'Self-heal didn’t resolve it',
}

function PhaseIcon({ phase }: { phase: HealPhase }) {
  if (phase === 'healed') return <span className="text-lg">✓</span>
  if (phase === 'failed') return <span className="text-lg">✗</span>
  return <span className="animate-pulse text-lg">🔧</span>
}

function Spinner({ tone = 'amber' }: { tone?: 'amber' | 'sky' }) {
  const color =
    tone === 'sky' ? 'border-sky-400/30 border-t-sky-400' : 'border-amber-400/30 border-t-amber-400'
  return <span className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${color}`} />
}

/**
 * The demo's hero moment. When a build fails and the agent patches its own
 * Dockerfile, this card animates in and narrates error → patch → retry so a
 * judge sees the AI fix itself at a glance. Renders nothing until self-heal starts.
 */
export function SelfHealCallout({ events }: { events: JobEvent[] }) {
  const info = deriveHeal(events)
  if (!info) return null
  const { phase, errorSummary, errorExcerpt, patch, failedAttempt, maxAttempts, retryAttempt } = info
  const busy = phase === 'diagnosing' || phase === 'retrying'

  const subtitle =
    phase === 'diagnosing'
      ? `Build failed on attempt ${failedAttempt} of ${maxAttempts}. Reading the error and rewriting the Dockerfile…`
      : phase === 'retrying'
        ? `Patch applied. Rebuilding — attempt ${retryAttempt} of ${maxAttempts}…`
        : phase === 'healed'
          ? `The AI fixed the Dockerfile and the rebuild passed on attempt ${retryAttempt}.`
          : `The patch didn’t clear the build error.`

  return (
    <div className={`animate-heal-in mb-4 rounded-xl border p-4 transition-colors duration-500 ${CARD[phase]}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ${BADGE[phase]}`}>
          <PhaseIcon phase={phase} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{TITLE[phase]}</h3>
            {busy && <Spinner />}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${BADGE[phase]}`}>
          {failedAttempt}/{maxAttempts}
        </span>
      </div>

      {/* What broke */}
      {(errorSummary || errorExcerpt) && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-300">
            <span>✗</span> Error detected
          </div>
          {errorSummary && <p className="mt-1 text-xs text-rose-200">{errorSummary}</p>}
          {errorExcerpt && (
            <pre className="mt-1 overflow-x-auto text-[11px] leading-relaxed text-rose-300/80">{errorExcerpt}</pre>
          )}
        </div>
      )}

      {/* The AI's intervention */}
      <div className="my-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <span className="text-base leading-none">↓</span>
        <span>AI rewrote the Dockerfile</span>
      </div>

      {patch ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            <span>✓</span> Patch applied
          </div>
          <pre className="mt-1 overflow-x-auto text-[11px] leading-relaxed text-emerald-200">{patch}</pre>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <Spinner />
            <span className="animate-pulse">Generating Dockerfile patch…</span>
          </div>
        </div>
      )}

      {/* Outcome */}
      {phase === 'retrying' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-sky-300">
          <Spinner tone="sky" />
          <span>
            Rebuilding — attempt {retryAttempt} of {maxAttempts}…
          </span>
        </div>
      )}
      {phase === 'healed' && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-300">
          <span>✓</span> Rebuild passed on attempt {retryAttempt}. The agent fixed itself — no human touched it.
        </div>
      )}
      {phase === 'failed' && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-rose-300">
          <span>✗</span> Still failing after the patch.
        </div>
      )}
    </div>
  )
}
