/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL — Settings → API */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon/public key — Settings → API */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Backend REST/WebSocket base URL (set once the backend is running) */
  readonly VITE_API_BASE_URL?: string
  /** Force mock mode ('true') or real API ('false'); defaults to mock when no API base URL */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
