import { useEffect, useMemo, useState } from 'react'
import { formatCLP } from '../utils/format.js'

// ────────────────────────────────────────────────────────────────────────────
// CompanyDonationForm
// - Tres opciones (panel, techo, puerta) — las piezas grandes donde el logo
//   se ve bien en el modelo.
// - Monto mínimo: $250.000.
// - Pide nombre de la empresa + logo + mensaje opcional.
// - El logo se sube como data URL y aparece sobre la pieza en el modelo 3D.
// ────────────────────────────────────────────────────────────────────────────

const COMPANY_TIER_IDS = ['panel', 'techo']
const COMPANY_MIN = 250000
const MAX_LOGO_BYTES = 800 * 1024 // 800 KB → cabe en localStorage sin reventarlo

export default function CompanyDonationForm({ tiers, parts, onSubmit }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [amount, setAmount] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState(null) // preview
  const [logoFile, setLogoFile] = useState(null) // archivo real
  const [logoError, setLogoError] = useState(null)
  const [tierId, setTierId] = useState(null)
  const [success, setSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const companyTiers = useMemo(
    () => tiers.filter((t) => COMPANY_TIER_IDS.includes(t.id)),
    [tiers]
  )

  const tierStats = useMemo(() => {
    const map = new Map()
    companyTiers.forEach((t) => {
      const tierParts = parts.filter((p) => p.tier === t.id)
      const next = tierParts.find((p) => p.fundedPercent < 100)
      const completed = tierParts.filter((p) => p.fundedPercent >= 100).length
      map.set(t.id, {
        tier: t,
        total: tierParts.length,
        completed,
        next,
        soldOut: !next,
      })
    })
    return map
  }, [companyTiers, parts])

  const selectedTier = companyTiers.find((t) => t.id === tierId) || null
  const selectedStats = selectedTier ? tierStats.get(selectedTier.id) : null
  const nextPart = selectedStats?.next || null

  useEffect(() => {
    if (selectedTier && !amount) {
      const suggested = Math.max(COMPANY_MIN, selectedTier.price)
      setAmount(String(suggested))
    }
  }, [tierId]) // eslint-disable-line react-hooks/exhaustive-deps

  const numericAmount = Number(amount) || 0
  const livePercent = selectedTier
    ? Math.min(100, Math.round((numericAmount / selectedTier.price) * 100))
    : 0
  const meetsMin = numericAmount >= COMPANY_MIN

  const handleLogoFile = (file) => {
    if (!file) {
      setLogoDataUrl(null)
      setLogoFile(null)
      setLogoError(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setLogoError('El archivo debe ser una imagen.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(
        `El logo debe pesar menos de 800 KB (este pesa ${Math.round(
          file.size / 1024
        )} KB).`
      )
      return
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setLogoDataUrl(String(reader.result))
      setLogoError(null)
    }
    reader.onerror = () => setLogoError('No se pudo leer el archivo.')
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!selectedTier || !nextPart) return
    if (!meetsMin) return
    if (!logoFile) return
    if (!name.trim()) return

    setSubmitting(true)
    try {
      await onSubmit({
        tierId: selectedTier.id,
        name,
        message,
        amount: numericAmount,
        isCompany: true,
        logoFile,
      })

      setSuccess({
        name: name.trim(),
        partName: nextPart.name,
        tierTitle: selectedTier.title,
      })
      setName('')
      setMessage('')
      setAmount('')
      setLogoDataUrl(null)
      setLogoFile(null)
      setTierId(null)
      setTimeout(() => setSuccess(null), 6000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tp-card p-6 sm:p-8 space-y-6">
      {success && (
        <div className="tp-pop rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4">
          <p className="font-semibold">
            ¡Bienvenida al salón, {success.name}! 🏢
          </p>
          <p className="text-sm mt-1">
            Su logo quedó en <strong>{success.partName}</strong>. ¡Gracias por
            apoyar a la comunidad!
          </p>
        </div>
      )}

      <div className="rounded-xl bg-tp-blue/5 border border-tp-blue/20 p-4 text-sm text-tp-blue-dark">
        <p className="font-semibold">Aporte mínimo: {formatCLP(COMPANY_MIN)}</p>
        <p className="text-slate-600 mt-1 text-xs">
          Las empresas que aporten desde {formatCLP(COMPANY_MIN)} verán su logo
          en el modelo 3D del salón, sobre la pieza apadrinada.
        </p>
      </div>

      {/* PASO 1 · Tipo */}
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
          1. ¿Qué quieren apadrinar?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {companyTiers.map((t) => {
            const stats = tierStats.get(t.id)
            const active = tierId === t.id
            const soldOut = stats?.soldOut
            return (
              <button
                key={t.id}
                type="button"
                disabled={soldOut}
                onClick={() => setTierId(t.id)}
                className={`group rounded-xl border p-4 text-left transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? 'border-tp-red bg-tp-red/5 shadow-tp-soft'
                    : 'border-stone-200 bg-white hover:border-tp-blue/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-white text-lg ${t.color}`}
                  >
                    {t.badge}
                  </span>
                  <span className="font-display font-bold text-tp-blue-dark">
                    {t.title}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Costo total: <strong>{formatCLP(t.price)}</strong>
                </p>
                <p className="text-xs text-slate-500">
                  {soldOut
                    ? '✓ Todas completas'
                    : `${stats.completed}/${stats.total} listas`}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* PASO 2 · Monto */}
      {selectedTier && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            2. ¿Cuánto van a aportar?
          </p>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <input
              type="number"
              min={COMPANY_MIN}
              step={50000}
              className="tp-input text-2xl font-bold font-display text-tp-blue-dark"
              placeholder={String(COMPANY_MIN)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              {[250000, 500000, 1000000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="text-xs px-2.5 py-2 rounded-lg border border-stone-300 bg-white hover:border-tp-blue/50 text-slate-600 font-semibold"
                >
                  {formatCLP(v).replace('CLP', '').trim()}
                </button>
              ))}
            </div>
          </div>
          {!meetsMin && numericAmount > 0 && (
            <p className="text-xs text-tp-red font-semibold">
              El aporte de empresas es desde {formatCLP(COMPANY_MIN)}.
            </p>
          )}

          <div className="rounded-xl bg-tp-blue/5 border border-tp-blue/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-tp-blue font-semibold uppercase tracking-wider">
                  Su aporte equivale a
                </p>
                <p className="font-display text-3xl font-extrabold text-tp-red mt-1">
                  {livePercent}%{' '}
                  <span className="text-base font-semibold text-tp-blue-dark">
                    de un/a {selectedTier.title.toLowerCase()}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Costo total</p>
                <p className="font-display font-bold text-tp-blue-dark text-lg">
                  {formatCLP(selectedTier.price)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-3 w-full rounded-full bg-white overflow-hidden border border-tp-blue/20">
              <div
                className="h-full bg-tp-red rounded-full transition-all duration-300"
                style={{ width: `${livePercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* PASO 3 · Datos */}
      {selectedTier && (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            3. Datos de la empresa
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="tp-label" htmlFor="company-name">
                Nombre de la empresa *
              </label>
              <input
                id="company-name"
                type="text"
                className="tp-input"
                placeholder="Ej: Constructora Pucón Ltda."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <label className="tp-label" htmlFor="company-message">
                Mensaje (opcional)
              </label>
              <input
                id="company-message"
                type="text"
                className="tp-input"
                placeholder="Ej: Orgullosos de ser parte del salón"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>

          <div>
            <label className="tp-label" htmlFor="company-logo">
              Logo de la empresa * (PNG / JPG / SVG · máx 800 KB)
            </label>
            <div className="flex items-start gap-4 mt-1">
              <input
                id="company-logo"
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoFile(e.target.files?.[0])}
                className="block text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-tp-blue file:text-white file:px-4 file:py-2 file:font-semibold file:cursor-pointer hover:file:bg-tp-blue-dark"
              />
              {logoDataUrl && (
                <div className="flex-shrink-0">
                  <div className="h-20 w-20 rounded-lg border border-stone-300 bg-white p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={logoDataUrl}
                      alt="Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    className="text-[11px] text-tp-red mt-1 hover:underline"
                    onClick={() => {
                      setLogoDataUrl(null)
                      setLogoFile(null)
                    }}
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
            {logoError && (
              <p className="text-xs text-tp-red mt-2">{logoError}</p>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={
          submitting ||
          !selectedTier ||
          !nextPart ||
          !meetsMin ||
          !logoFile ||
          !name.trim()
        }
        className="tp-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitting
          ? 'Subiendo logo y registrando aporte…'
          : !selectedTier
          ? 'Elija qué quieren apadrinar'
          : !nextPart
            ? 'Todas las piezas de este tipo ya están completas'
            : !meetsMin
              ? `Aporte mínimo ${formatCLP(COMPANY_MIN)}`
              : !logoFile
                ? 'Suban el logo de la empresa'
                : !name.trim()
                  ? 'Ingresen el nombre de la empresa'
                  : `Registrar aporte de ${formatCLP(numericAmount)} (${livePercent}%)`}
      </button>

    </form>
  )
}
