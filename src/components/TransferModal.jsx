import { useEffect, useState } from 'react'
import { formatCLP } from '../utils/format.js'

// Datos bancarios para la transferencia
const TRANSFER_DATA = {
  banco: 'Itaú',
  nombre: 'Pontificia Universidad Católica de Chile',
  rut: '81.698.900-0',
  tipoCuenta: 'Cuenta Corriente',
  numeroCuenta: '231392483',
  correo: 'donaciones.uc@uc.cl',
}

const TRANSFER_TEXT = `Banco: ${TRANSFER_DATA.banco}
Nombre: ${TRANSFER_DATA.nombre}
RUT: ${TRANSFER_DATA.rut}
Tipo de cuenta: ${TRANSFER_DATA.tipoCuenta}
N° de cuenta: ${TRANSFER_DATA.numeroCuenta}
Correo: ${TRANSFER_DATA.correo}`

const MAX_RECEIPT_BYTES = 3 * 1024 * 1024 // 3 MB

export default function TransferModal({ donation, onConfirm, onCancel }) {
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptError, setReceiptError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Cerrar con tecla Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, submitting])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TRANSFER_TEXT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  const handleFile = (file) => {
    if (!file) {
      setReceiptFile(null)
      setReceiptError(null)
      return
    }
    const ok =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    if (!ok) {
      setReceiptError('El archivo debe ser una imagen o PDF.')
      return
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setReceiptError(
        `El comprobante debe pesar menos de 3 MB (este pesa ${Math.round(
          file.size / 1024
        )} KB).`
      )
      return
    }
    setReceiptFile(file)
    setReceiptError(null)
  }

  const handleConfirm = async () => {
    if (!receiptFile || submitting) return
    setSubmitting(true)
    try {
      await onConfirm(receiptFile)
    } catch (e) {
      setSubmitting(false)
    }
  }

  const part = donation?.targetPart

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel?.()
      }}
    >
      <div className="tp-card max-w-lg w-full p-6 sm:p-8 my-8 tp-pop relative">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          aria-label="Cerrar"
          className="absolute top-3 right-3 h-9 w-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          ✕
        </button>

        <span className="tp-eyebrow">Casi listo</span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-tp-blue-dark mt-1">
          Realiza tu transferencia
        </h2>
        <p className="text-slate-600 text-sm mt-2">
          Aporte de{' '}
          <strong className="text-tp-red">
            {formatCLP(donation?.amount || 0)}
          </strong>{' '}
          {part && (
            <>
              · irá a <strong>{part.name}</strong>
            </>
          )}
        </p>

        {/* Datos bancarios */}
        <div className="mt-5 rounded-xl bg-tp-cream border border-stone-200 p-4 space-y-2">
          <DataRow label="Banco" value={TRANSFER_DATA.banco} />
          <DataRow label="Nombre" value={TRANSFER_DATA.nombre} />
          <DataRow label="RUT" value={TRANSFER_DATA.rut} />
          <DataRow label="Tipo de cuenta" value={TRANSFER_DATA.tipoCuenta} />
          <DataRow label="N° de cuenta" value={TRANSFER_DATA.numeroCuenta} />
          <DataRow label="Correo" value={TRANSFER_DATA.correo} />
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`mt-3 w-full rounded-full px-4 py-2.5 text-sm font-bold transition ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-tp-blue text-white hover:bg-tp-blue-dark'
          }`}
        >
          {copied ? '✓ Datos copiados al portapapeles' : '📋 Copiar datos'}
        </button>

        {/* Comprobante */}
        <div className="mt-6">
          <label
            htmlFor="receipt-file"
            className="tp-label flex items-center gap-2"
          >
            Subir comprobante de transferencia *
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Imagen (PNG/JPG) o PDF, máximo 3 MB.
          </p>

          <label
            htmlFor="receipt-file"
            className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition ${
              receiptFile
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-stone-300 bg-white hover:border-tp-blue/50 hover:bg-tp-blue/5'
            }`}
          >
            <input
              id="receipt-file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="sr-only"
            />
            {receiptFile ? (
              <>
                <span className="text-3xl">📄</span>
                <p className="text-sm font-semibold text-emerald-700 text-center truncate max-w-full">
                  {receiptFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {Math.round(receiptFile.size / 1024)} KB · Click para cambiar
                </p>
              </>
            ) : (
              <>
                <span className="text-3xl text-slate-400">📤</span>
                <p className="text-sm font-semibold text-tp-blue-dark">
                  Subir comprobante
                </p>
                <p className="text-xs text-slate-500">
                  Click para seleccionar archivo
                </p>
              </>
            )}
          </label>
          {receiptError && (
            <p className="text-xs text-tp-red mt-2">{receiptError}</p>
          )}
        </div>

        {/* Botones */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-full px-6 py-3 font-semibold text-slate-600 bg-white border border-stone-300 hover:bg-stone-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!receiptFile || submitting}
            className="flex-1 tp-btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting ? 'Enviando aporte…' : 'Confirmar aporte'}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 text-center mt-4">
          Tu aporte queda registrado cuando subas el comprobante. La
          organización lo verificará y aparecerá en el modelo del salón.
        </p>
      </div>
    </div>
  )
}

function DataRow({ label, value }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-tp-blue-dark break-all">{value}</span>
    </div>
  )
}
