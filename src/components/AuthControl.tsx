import { useAuth } from '../auth/AuthContext'

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

/** Header auth control: shows sign-in, the current user, or a config hint. */
export function AuthControl() {
  const { user, loading, configured, signInWithGitHub, signOut } = useAuth()

  if (!configured) {
    return (
      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
        Supabase not configured
      </span>
    )
  }

  if (loading) {
    return <span className="text-xs text-slate-500">Loading…</span>
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={signInWithGitHub}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-white"
      >
        <GitHubIcon />
        Sign in with GitHub
      </button>
    )
  }

  const meta = user.user_metadata ?? {}
  const name: string = meta.user_name || meta.full_name || user.email || 'User'
  const avatar: string | undefined = meta.avatar_url

  return (
    <div className="flex items-center gap-3">
      {avatar ? (
        <img src={avatar} alt="" className="h-7 w-7 rounded-full ring-1 ring-slate-700" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-medium">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="hidden text-sm text-slate-300 sm:inline">{name}</span>
      <button
        type="button"
        onClick={signOut}
        className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
      >
        Sign out
      </button>
    </div>
  )
}
