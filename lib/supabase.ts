import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Track = {
  id: string
  title: string
  created_at: string
  vocals_url: string | null
  drums_url: string | null
  bass_url: string | null
  guitar_url: string | null
  piano_url: string | null
  other_url: string | null
}
