import { supabase } from './supabase.js'

// ────────────────────────────────────────────────────────────────────────────
// Conversión entre filas de Supabase (snake_case) y donantes en JS (camelCase)
// ────────────────────────────────────────────────────────────────────────────
function rowToDonor(row) {
  return {
    id: row.id,
    partId: row.part_id,
    name: row.name,
    message: row.message || '',
    amount: row.amount,
    timestamp: row.created_at,
    isCompany: !!row.is_company,
    logoDataUrl: row.logo_url || null,
    receiptUrl: row.receipt_url || null,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// fetchDonations — lee toda la tabla, ordenada por created_at DESC
// ────────────────────────────────────────────────────────────────────────────
export async function fetchDonations() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[donations] fetch error:', error)
    return []
  }
  return (data || []).map(rowToDonor)
}

// ────────────────────────────────────────────────────────────────────────────
// uploadLogo — sube un File al bucket "logos" y devuelve la URL pública
// ────────────────────────────────────────────────────────────────────────────
async function uploadLogo(file) {
  if (!supabase || !file) return null
  const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
  const rand = Math.random().toString(36).slice(2, 10)
  const path = `logo-${Date.now()}-${rand}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, {
      contentType: file.type || 'image/png',
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadError) {
    console.error('[donations] upload error:', uploadError)
    throw uploadError
  }
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return data.publicUrl
}

// ────────────────────────────────────────────────────────────────────────────
// uploadReceipt — sube el comprobante de transferencia al bucket "comprobantes"
// ────────────────────────────────────────────────────────────────────────────
async function uploadReceipt(file) {
  if (!supabase || !file) return null
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const rand = Math.random().toString(36).slice(2, 10)
  const path = `comp-${Date.now()}-${rand}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('comprobantes')
    .upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadError) {
    console.error('[donations] upload receipt error:', uploadError)
    throw uploadError
  }
  const { data } = supabase.storage.from('comprobantes').getPublicUrl(path)
  return data.publicUrl
}

// ────────────────────────────────────────────────────────────────────────────
// createDonation — inserta una donación (sube logo y comprobante si vienen)
// ────────────────────────────────────────────────────────────────────────────
export async function createDonation(
  donation,
  logoFile = null,
  receiptFile = null
) {
  if (!supabase) throw new Error('Supabase no está configurado')

  let logoUrl = null
  if (donation.isCompany && logoFile) {
    logoUrl = await uploadLogo(logoFile)
  }

  let receiptUrl = null
  if (receiptFile) {
    receiptUrl = await uploadReceipt(receiptFile)
  }

  const id = `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const row = {
    id,
    part_id: donation.partId,
    name: donation.name?.trim() || (donation.isCompany ? 'Empresa' : 'Anónimo'),
    message: donation.message?.trim() || '',
    amount: Number(donation.amount) || 0,
    is_company: !!donation.isCompany,
    logo_url: logoUrl,
    receipt_url: receiptUrl,
    transfer_first_name: donation.transferFirstName?.trim() || null,
    transfer_last_name: donation.transferLastName?.trim() || null,
    transfer_rut: donation.transferRut?.trim() || null,
  }
  const { data, error } = await supabase
    .from('donations')
    .insert(row)
    .select()
    .single()
  if (error) {
    console.error('[donations] insert error:', error)
    throw error
  }
  return rowToDonor(data)
}

// ────────────────────────────────────────────────────────────────────────────
// subscribeNewDonations — escucha INSERTs en realtime y llama al callback
// Devuelve función para desuscribirse.
// ────────────────────────────────────────────────────────────────────────────
export function subscribeNewDonations(onInsert) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('donations-feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'donations' },
      (payload) => {
        try {
          onInsert(rowToDonor(payload.new))
        } catch (e) {
          console.error('[donations] realtime callback error:', e)
        }
      }
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
