import { useState } from 'react'
import { sendMessage } from '../lib/messages.js'

const CONTACT_EMAIL = 'sanrafaeltp@gmail.com'

export default function ContactSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit =
    name.trim().length > 0 &&
    emailValid &&
    message.trim().length > 0 &&
    !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await sendMessage({ name, email, message })
      setSent(true)
      setName('')
      setEmail('')
      setMessage('')
      setTimeout(() => setSent(false), 6000)
    } catch (err) {
      setError(
        'No pudimos enviar tu mensaje. Verifica tu conexión e intenta de nuevo.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="tp-card overflow-hidden">
      <div className="grid lg:grid-cols-5">
        {/* Izquierda — info */}
        <div className="lg:col-span-2 p-8 sm:p-10 bg-gradient-to-br from-tp-blue-dark via-tp-blue to-tp-blue text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-tp-red/20 blur-3xl pointer-events-none" />
          <span className="text-xs uppercase tracking-widest font-semibold text-white/80">
            ¿Tienes una pregunta?
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3 leading-tight">
            Contáctanos
          </h2>
          <p className="mt-4 text-white/90 leading-relaxed">
            Puedes escribirnos directamente al mail{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-bold underline decoration-white/60 hover:decoration-white"
            >
              {CONTACT_EMAIL}
            </a>{' '}
            o mandarnos un mensaje desde acá.
          </p>
        </div>

        {/* Derecha — formulario */}
        <div className="lg:col-span-3 p-6 sm:p-10 bg-tp-paper">
          <h3 className="font-display text-xl font-bold text-tp-blue-dark mb-1">
            Envíanos un mensaje
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Tu mensaje llega directo al equipo. Te respondemos a la brevedad.
          </p>

          {sent && (
            <div className="tp-pop rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 mb-4 text-sm">
              ✓ ¡Mensaje enviado! Lo vamos a leer pronto.
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="tp-label" htmlFor="contact-name">
                Tu nombre *
              </label>
              <input
                id="contact-name"
                type="text"
                className="tp-input"
                placeholder="Ej: María González"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="tp-label" htmlFor="contact-email">
                Tu mail * <span className="text-slate-400 font-normal text-xs">(para responderte)</span>
              </label>
              <input
                id="contact-email"
                type="email"
                className="tp-input"
                placeholder="tu@correo.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={120}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="tp-label" htmlFor="contact-message">
                Mensaje *
              </label>
              <textarea
                id="contact-message"
                className="tp-input"
                rows={5}
                placeholder="Cuéntanos en qué te podemos ayudar…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
              />
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="tp-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting
                ? 'Enviando…'
                : !name.trim()
                  ? 'Completa tu nombre'
                  : !emailValid
                    ? 'Ingresa un mail válido'
                    : !message.trim()
                      ? 'Escribe tu mensaje'
                      : 'Enviar mensaje'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
