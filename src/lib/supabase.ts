import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** null sin .env: la app sigue funcionando solo en local (Dexie). */
export const supabase = url && key ? createClient(url, key) : null

