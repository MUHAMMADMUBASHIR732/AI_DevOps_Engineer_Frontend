import type { JobEvent } from '../types'

type DeployPhase = 'detecting' | 'generating' | 'deploying' | 'done' | 'failed'

interface DeployInfo {
  phase: DeployPhase
  framework: string | null
  platform: string | null
  message: string
}

/** Reconstruct the deployment story from the event stream, or null if it hasn't happened. */
function deriveDeploy(events: JobEvent[]): DeployInfo | null {
  if (events.length === 0) return null

  const lastEvent = events[events.length - 1]
  const analyzingEvent = events.find((e) => e.stage === 'analyzing')
  const deployingEvent = events.find((e) => e.stage === 'deploying')

  let phase: DeployPhase
  if (lastEvent.stage === 'done') phase = 'done'
  else if (lastEvent.stage === 'failed') phase = 'failed'
  else if (deployingEvent) phase = 'deploying'
  else if (analyzingEvent) phase = 'generating'
  else phase = 'detecting'

  // Extract framework from analyzing event
  const framework = analyzingEvent?.message.includes('Detected') 
    ? analyzingEvent.message.match(/Detected (.+?) framework/)?.[1] ?? null
    : null

  // Determine platform from message
  const platform = lastEvent.message.includes('Vercel') ? 'Vercel' 
    : lastEvent.message.includes('Render') ? 'Render' 
    : null

  return {
    phase,
    framework,
    platform,
    message: lastEvent.message,
  }
}

const CARD: Record<DeployPhase, string> = {
  detecting: 'border-indigo-500/40 bg-indigo-500/5',
  generating: 'border-purple-500/40 bg-purple-500/5',
  deploying: 'border-emerald-500/40 bg-emerald-500/5',
  done: 'border-emerald-500/40 bg-emerald-500/5',
  failed: 'border-rose-500/40 bg-rose-500/5',
}

const BADGE: Record<DeployPhase, string> = {
  detecting: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
  generating: 'bg-purple-500/15 text-purple-300 ring-purple-500/30',
  deploying: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  done: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
}

const TITLE: Record<DeployPhase, string> = {
  detecting: 'Analyzing repository',
  generating: 'AI generating deployment',
  deploying: 'Configuring deployment',
  done: 'Configuration complete',
  failed: 'Deployment failed',
}

function PhaseIcon({ phase }: { phase: DeployPhase }) {
  if (phase === 'done') return <span className="text-lg">✓</span>
  if (phase === 'failed') return <span className="text-lg">✗</span>
  if (phase === 'deploying') return <span className="animate-pulse text-lg">🚀</span>
  return <span className="animate-pulse text-lg">⚡</span>
}

function Spinner({ tone = 'indigo' }: { tone?: 'indigo' | 'emerald' }) {
  const color =
    tone === 'emerald' ? 'border-emerald-400/30 border-t-emerald-400' : 'border-indigo-400/30 border-t-indigo-400'
  return <span className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${color}`} />
}

/**
 * Shows the AI-powered deployment process. Displays framework detection,
 * AI generation, and cloud deployment progress.
 */
export function SelfHealCallout({ events }: { events: JobEvent[] }) {
  const info = deriveDeploy(events)
  if (!info) return null
  const { phase, framework, platform, message } = info
  const busy = phase === 'detecting' || phase === 'generating' || phase === 'deploying'

  const subtitle =
    phase === 'detecting'
      ? 'AI is analyzing the repository to detect the technology stack...'
      : phase === 'generating'
        ? `Detected ${framework || 'unknown'}. AI is generating optimized deployment configuration...`
        : phase === 'deploying'
          ? `Configuring deployment for ${platform || 'cloud'}...`
          : phase === 'done'
            ? `Deployment configuration created for ${platform || 'cloud'}!`
            : 'Deployment encountered an error.'

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
            {busy && <Spinner tone={phase === 'deploying' ? 'emerald' : 'indigo'} />}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
        {platform && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${BADGE[phase]}`}>
            {platform}
          </span>
        )}
      </div>

      {/* Framework detection info */}
      {framework && (
        <div className="mt-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
            <span>⚡</span> Framework detected
          </div>
          <p className="mt-1 text-xs text-indigo-200">{framework}</p>
        </div>
      )}

      {/* Current status message */}
      {message && phase !== 'done' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
          {busy && <Spinner tone={phase === 'deploying' ? 'emerald' : 'indigo'} />}
          <span className={busy ? 'animate-pulse' : ''}>{message}</span>
        </div>
      )}

      {/* Success message */}
      {phase === 'done' && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-300">
          <span>✓</span> {message}
        </div>
      )}

      {/* Error message */}
      {phase === 'failed' && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-300">
            <span>✗</span> Error
          </div>
          <p className="mt-1 text-xs text-rose-200">{message}</p>
        </div>
      )}
    </div>
  )
}
