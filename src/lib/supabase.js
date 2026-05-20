import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  // No reventamos la app si faltan — useamos fallback a localStorage en App.jsx
  console.warn(
    '[supabase] VITE_SUPABASE_URL o VITE_SUPABASE_KEY no están definidas. ' +
      'La app va a funcionar en modo local sin persistencia compartida.'
  )
}

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        realtime: { params: { eventsPerSecond: 5 } },
      })
    : null

export const isSupabaseEnabled = !!supabase
