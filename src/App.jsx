import { useEffect, useMemo, useRef, useState } from 'react'
import {
  donationParts,
  totalGoal,
  tiers,
} from './data/donationParts.js'
import {
  fetchDonations,
  createDonation,
  subscribeNewDonations,
} from './lib/donations.js'
import Hero from './components/Hero.jsx'
import ProgressPanel from './components/ProgressPanel.jsx'
import DonationTiers from './components/DonationTiers.jsx'
import DonorList from './components/DonorList.jsx'
import DonationForm from './components/DonationForm.jsx'
import TransferModal from './components/TransferModal.jsx'

export default function App() {
  const [donors, setDonors] = useState([])
  const [selectedTierId, setSelectedTierId] = useState(null)
  const [flashPartId, setFlashPartId] = useState(null)
  const [pendingDonation, setPendingDonation] = useState(null)
  const formRef = useRef(null)

  // Cargar donaciones existentes + suscribirse a nuevas
  useEffect(() => {
    let cancelled = false
    fetchDonations().then((data) => {
      if (!cancelled) setDonors(data)
    })
    const unsubscribe = subscribeNewDonations((newDonor) => {
      setDonors((prev) => {
        if (prev.some((d) => d.id === newDonor.id)) return prev
        return [newDonor, ...prev]
      })
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Combinar piezas con donaciones — soporta donaciones parciales múltiples.
  const partsWithStatus = useMemo(() => {
    const donationsByPart = new Map()
    donors.forEach((d) => {
      if (!donationsByPart.has(d.partId)) donationsByPart.set(d.partId, [])
      donationsByPart.get(d.partId).push(d)
    })
    return donationParts.map((part) => {
      const partDonations = donationsByPart.get(part.id) || []
      const fundedAmount = partDonations.reduce(
        (s, d) => s + (d.amount || 0),
        0
      )
      const cappedAmount = Math.min(part.price, fundedAmount)
      const fundedPercent =
        part.price > 0 ? Math.min(100, (fundedAmount / part.price) * 100) : 0
      return {
        ...part,
        donations: partDonations,
        donor: partDonations[0] || null, // último/primero (compat)
        fundedAmount,
        cappedAmount,
        fundedPercent,
        donated: fundedAmount >= part.price,
      }
    })
  }, [donors])

  // Estadísticas globales — usa amount cap (no contar excedente al sobre-aportar)
  const stats = useMemo(() => {
    const raised = partsWithStatus.reduce(
      (sum, p) => sum + p.cappedAmount,
      0
    )
    const donatedParts = partsWithStatus.filter((p) => p.donated).length
    const totalParts = partsWithStatus.length
    return {
      raised,
      goal: totalGoal,
      donorsCount: donors.length,
      donatedParts,
      totalParts,
      percent: Math.min(100, Math.round((raised / totalGoal) * 100)),
    }
  }, [donors, partsWithStatus])

  const handleSelectTier = (tierId, opts = {}) => {
    setSelectedTierId(tierId)
    if (opts.scroll && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Al donar, se elige la primera pieza disponible del tier.
  // Si la donación es de empresa, se omiten piezas marcadas con `excludeCompanyLogo`.
  const findNextPartForTier = (tierId, { isCompany = false } = {}) => {
    return partsWithStatus.find(
      (p) =>
        p.tier === tierId &&
        p.fundedPercent < 100 &&
        !(isCompany && p.excludeCompanyLogo)
    )
  }

  // Abre el modal de transferencia. Devuelve una promise que se resuelve
  // cuando el usuario confirma con comprobante, o rechaza si cancela.
  const handleRegisterDonation = ({
    name,
    message,
    amount,
    tierId,
    isCompany,
    logoFile,
  }) => {
    return new Promise((resolve, reject) => {
      if (!tierId) {
        reject(new Error('Tier inválido'))
        return
      }
      const target = findNextPartForTier(tierId, { isCompany: !!isCompany })
      if (!target) {
        reject(new Error('No hay piezas disponibles'))
        return
      }
      const numericAmount = Number(amount)
      if (!numericAmount || numericAmount <= 0) {
        reject(new Error('Monto inválido'))
        return
      }
      setPendingDonation({
        name,
        message,
        amount: numericAmount,
        isCompany: !!isCompany,
        logoFile: logoFile || null,
        targetPart: target,
        resolve,
        reject,
      })
    })
  }

  const handleConfirmTransfer = async ({
    receiptFile,
    firstName,
    lastName,
    rut,
  }) => {
    const pd = pendingDonation
    if (!pd) return
    try {
      const saved = await createDonation(
        {
          partId: pd.targetPart.id,
          name: pd.name,
          message: pd.message,
          amount: pd.amount,
          isCompany: pd.isCompany,
          transferFirstName: firstName,
          transferLastName: lastName,
          transferRut: rut,
        },
        pd.logoFile,
        receiptFile
      )

      setDonors((prev) =>
        prev.some((d) => d.id === saved.id) ? prev : [saved, ...prev]
      )
      setFlashPartId(pd.targetPart.id)
      setTimeout(() => {
        const el = document.getElementById('modelo')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      setTimeout(() => setFlashPartId(null), 5000)
      pd.resolve(saved)
      setPendingDonation(null)
    } catch (err) {
      console.error('[App] No se pudo registrar la donación:', err)
      if (typeof window !== 'undefined') {
        window.alert(
          'No se pudo registrar tu aporte. Verifica tu conexión e intenta de nuevo.'
        )
      }
      throw err
    }
  }

  const handleCancelTransfer = () => {
    if (pendingDonation) {
      pendingDonation.reject(new Error('Cancelado'))
      setPendingDonation(null)
    }
  }

  const scrollToForm = () => {
    if (formRef.current)
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToTiers = () => {
    const el = document.getElementById('tiers')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToCompany = () => {
    const el = document.getElementById('empresas')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen pb-20">
      <Header onDonateClick={scrollToForm} />

      <main className="space-y-24">
        <Hero
          stats={stats}
          parts={partsWithStatus}
          flashPartId={flashPartId}
          flashPart={
            flashPartId
              ? partsWithStatus.find((p) => p.id === flashPartId)
              : null
          }
          onDonateClick={scrollToForm}
          onCompanyClick={scrollToCompany}
          onViewParts={scrollToTiers}
          onPartClick={(part) =>
            handleSelectTier(part.tier, { scroll: true })
          }
        />

        <section className="tp-section">
          <ProgressPanel stats={stats} />
        </section>

        <section id="tiers" className="tp-section">
          <SectionHeader
            eyebrow="Categorías de aporte"
            title="Elige cómo quieres aportar"
            subtitle="Cada categoría tiene un costo total. Podés aportar la pieza entera o un porcentaje — cada peso suma."
          />
          <div className="mt-8">
            <DonationTiers
              tiers={tiers}
              parts={partsWithStatus}
              onPickTier={(tierId) =>
                handleSelectTier(tierId, { scroll: true })
              }
            />
          </div>
        </section>

        <section className="tp-section space-y-10">
          <div ref={formRef}>
            <SectionHeader
              eyebrow="Quiero aportar"
              title="Pon tu ladrillo"
              subtitle="Elige qué quieres aportar, ingresa el monto y tu nombre quedará marcado en el modelo."
              compact
            />
            <div className="mt-6">
              <DonationForm
                tiers={tiers}
                parts={partsWithStatus}
                selectedTierId={selectedTierId}
                onSelectTier={setSelectedTierId}
                onSubmit={handleRegisterDonation}
              />
            </div>
          </div>

          <div>
            <SectionHeader
              eyebrow="Últimos donantes"
              title="Quienes ya pusieron su ladrillo"
              subtitle="Esta es la pared viva del salón."
              compact
            />
            <div className="mt-6">
              <DonorList donors={donors} parts={partsWithStatus} limit={12} />
            </div>
          </div>
        </section>

        <section id="empresas" className="tp-section">
          <SectionHeader
            eyebrow="Donación empresas"
            title="¿Tu empresa quiere ser parte del salón?"
            subtitle="Las empresas que aporten desde $250.000 verán su logo en el modelo 3D del salón, sobre la pieza apadrinada."
          />
          <div className="mt-6 relative">
            <div className="tp-card p-8 sm:p-10 grayscale opacity-60 pointer-events-none select-none">
              <div className="flex flex-col items-center text-center gap-3">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-stone-200 text-3xl">
                  🏢
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-600">
                  Donaciones de empresas
                </h3>
                <p className="text-slate-500 max-w-md text-sm">
                  Pronto las empresas podrán apadrinar paneles o piezas de
                  techo del salón y dejar su logo visible en el modelo 3D.
                </p>
              </div>
            </div>
            <div className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-full bg-amber-100 border border-amber-300 px-4 py-2 text-amber-800 font-bold text-sm uppercase tracking-wider shadow-tp-soft">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Próximamente
            </div>
          </div>
        </section>

      </main>

      <Footer />

      {/* Modal de transferencia bancaria */}
      {pendingDonation && (
        <TransferModal
          donation={pendingDonation}
          onConfirm={handleConfirmTransfer}
          onCancel={handleCancelTransfer}
        />
      )}
    </div>
  )
}

function Header({ onDonateClick }) {
  return (
    <header className="tp-section flex items-center justify-between pt-4 pb-4 sm:pt-6 sm:pb-6">
      <a href="#" className="flex items-center gap-7">
        <img
          src="/logotp.png"
          alt="Trabajo País 2026"
          className="h-32 sm:h-44 w-auto"
        />
        <span className="hidden sm:block h-24 w-px bg-stone-300" />
        <span className="hidden sm:inline-flex flex-col leading-tight">
          <span className="text-base uppercase tracking-[0.22em] text-slate-500 font-semibold">
            Campaña
          </span>
          <span className="font-display text-4xl sm:text-5xl font-extrabold text-tp-blue-dark mt-1.5">
            Pon tu ladrillo
          </span>
          <span className="inline-flex items-center gap-2 mt-2 text-tp-red text-base font-bold uppercase tracking-[0.18em]">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
            Zona San Rafael
          </span>
        </span>
      </a>
      <div className="flex items-center gap-3">
        <button
          onClick={onDonateClick}
          className="tp-btn-primary text-lg py-3.5 px-7"
        >
          Quiero donar
        </button>
      </div>
    </header>
  )
}

function SectionHeader({ eyebrow, title, subtitle, compact }) {
  return (
    <div className={compact ? '' : 'max-w-2xl'}>
      <span className="tp-eyebrow">{eyebrow}</span>
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-tp-blue-dark mt-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-slate-600 mt-3 text-base sm:text-lg">{subtitle}</p>
      )}
    </div>
  )
}

function Footer() {
  return (
    <footer className="tp-section mt-24 border-t border-stone-200 pt-8 text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img src="/logotp.png" alt="Trabajo País 2026" className="h-10 w-auto" />
        <p>
          Campaña{' '}
          <strong className="text-tp-blue-dark">Pon tu ladrillo</strong> ·{' '}
          <span className="text-tp-blue-dark font-semibold">Trabajo País 2026</span>{' '}
          ·{' '}
          <span className="text-tp-red font-bold">Zona San Rafael</span>
        </p>
      </div>
    </footer>
  )
}
