import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True once both Supabase env vars are present. Lets the app run before keys are set. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * The Supabase client, or null when env vars are missing.
 * Consumers should guard on `isSupabaseConfigured` / a null check.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null
