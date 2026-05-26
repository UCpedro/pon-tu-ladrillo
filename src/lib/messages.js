import { supabase } from './supabase.js'

// ────────────────────────────────────────────────────────────────────────────
// sendMessage — inserta un mensaje de contacto en la tabla `messages`.
// La tabla tiene RLS con política de INSERT público (no de SELECT) para que
// cualquier visitante pueda mandar mensajes pero solo el admin (Supabase
// dashboard) los lea.
// ────────────────────────────────────────────────────────────────────────────
export async function sendMessage({ name, email, message }) {
  if (!supabase) throw new Error('Supabase no está configurado')
  const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const row = {
    id,
    name: name?.trim() || 'Anónimo',
    email: email?.trim() || null,
    message: message?.trim() || '',
  }
  const { error } = await supabase.from('messages').insert(row)
  if (error) {
    console.error('[messages] insert error:', error)
    throw error
  }
  return row
}
