import { useEffect, useMemo, useRef, useState } from 'react'
import {
  donationParts,
  sampleDonors,
  totalGoal,
  tiers,
} from './data/donationParts.js'
import {
  fetchDonations,
  insertDonation,
  uploadLogo,
  uploadReceipt,
  subscribeNewDonations,
} from './lib/donations.js'
import Hero from './components/Hero.jsx'
import ProgressPanel from './components/ProgressPanel.jsx'
import DonationTiers from './components/DonationTiers.jsx'
import DonorList from './components/DonorList.jsx'
import DonationForm from './components/DonationForm.jsx'
import TransferModal from './components/TransferModal.jsx'
import ContactSection from './components/ContactSection.jsx'

export default function App() {
  const [donors, setDonors] = useState([])
  const [selectedTierId, setSelectedTierId] = useState(null)
  // Si el usuario clickea una pieza específica en el modelo 3D, queremos que
  // su donación vaya PRIMERO a esa pieza (en vez de la "primera disponible").
  const [preferredPartId, setPreferredPartId] = useState(null)
  const [flashPartId, setFlashPartId] = useState(null)
  const [pendingDonation, setPendingDonation] = useState(null)
  const formRef = useRef(null)

  // Cargar donaciones existentes + suscribirse a nuevas
  useEffect(() => {
    let cancelled = false
    fetchDonations().then((data) => {
      if (!cancelled) {
        // Mezclar preview locales (sampleDonors) con las reales de Supabase
        const existingIds = new Set(data.map((d) => d.id))
        const previews = sampleDonors.filter((s) => !existingIds.has(s.id))
        setDonors([...previews, ...data])
      }
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
      // Piezas marcadas isPreviewOnly: aparecen siempre llenas (visualmente)
      // pero no reciben donaciones ni cuentan para las estadísticas.
      if (part.isPreviewOnly) {
        return {
          ...part,
          donations: [],
          donor: null,
          fundedAmount: part.price,
          cappedAmount: 0, // no cuenta como plata recaudada
          fundedPercent: 100,
          donated: true,
        }
      }
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
        donor: partDonations[0] || null,
        fundedAmount,
        cappedAmount,
        fundedPercent,
        donated: fundedAmount >= part.price,
      }
    })
  }, [donors])

  // Estadísticas globales — "raised" suma TODOS los aportes reales recibidos
  // (sin capear por pieza). Las piezas preview no cuentan para el conteo.
  const stats = useMemo(() => {
    const raised = donors.reduce((sum, d) => sum + (d.amount || 0), 0)
    const realParts = partsWithStatus.filter((p) => !p.isPreviewOnly)
    const donatedParts = realParts.filter((p) => p.donated).length
    const totalParts = realParts.length
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

  // Devuelve la pieza inicial: si el usuario clickeó una específica y todavía
  // hay capacidad, esa; si no, la primera disponible del tier.
  // Las piezas marcadas isPreviewOnly se ignoran (no reciben donaciones).
  const findStartingPart = (
    tierId,
    { isCompany = false, preferredId = null } = {}
  ) => {
    if (preferredId) {
      const preferred = partsWithStatus.find(
        (p) =>
          p.id === preferredId &&
          p.tier === tierId &&
          p.fundedPercent < 100 &&
          !p.isPreviewOnly &&
          !(isCompany && p.excludeCompanyLogo)
      )
      if (preferred) return preferred
    }
    return partsWithStatus.find(
      (p) =>
        p.tier === tierId &&
        p.fundedPercent < 100 &&
        !p.isPreviewOnly &&
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
      const target = findStartingPart(tierId, {
        isCompany: !!isCompany,
        preferredId: preferredPartId,
      })
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

  // Reparte un monto entre piezas del mismo tier hasta agotarlo.
  // Cada chunk respeta el remaining de la pieza para no sobrellenar.
  const planSpillover = (startPart, amount) => {
    const chunks = []
    let amountLeft = amount

    // Lista de piezas candidatas del mismo tier, en orden: empezar por la
    // pieza target, luego seguir con el resto que estén disponibles.
    // Las isPreviewOnly se excluyen del flujo de donaciones.
    const samesTier = partsWithStatus.filter(
      (p) => p.tier === startPart.tier && !p.isPreviewOnly
    )
    const orderedParts = [
      startPart,
      ...samesTier.filter((p) => p.id !== startPart.id),
    ]

    for (const part of orderedParts) {
      if (amountLeft <= 0) break
      const fundedSoFar = part.fundedAmount || 0
      const remaining = Math.max(0, part.price - fundedSoFar)
      if (remaining <= 0) continue
      const take = Math.min(amountLeft, remaining)
      chunks.push({ partId: part.id, amount: take })
      amountLeft -= take
    }

    // Si después de llenar todas las piezas todavía sobra,
    // lo metemos en la última pieza (sobre-aporte registrado).
    if (amountLeft > 0) {
      if (chunks.length > 0) {
        chunks[chunks.length - 1].amount += amountLeft
      } else {
        chunks.push({ partId: startPart.id, amount: amountLeft })
      }
    }

    return chunks
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
      // 1) Subir archivos UNA sola vez (logo + comprobante)
      const logoUrl = pd.isCompany && pd.logoFile ? await uploadLogo(pd.logoFile) : null
      const receiptUrl = receiptFile ? await uploadReceipt(receiptFile) : null

      // 2) Calcular reparto entre piezas
      const chunks = planSpillover(pd.targetPart, pd.amount)

      // 3) Insertar una fila por cada chunk (mismo donante, distintas piezas)
      const baseDonor = {
        name: pd.name,
        message: pd.message,
        isCompany: pd.isCompany,
        transferFirstName: firstName,
        transferLastName: lastName,
        transferRut: rut,
        logoUrl,
        receiptUrl,
      }
      const savedAll = []
      for (const c of chunks) {
        const saved = await insertDonation({
          ...baseDonor,
          partId: c.partId,
          amount: c.amount,
        })
        savedAll.push(saved)
      }

      // 4) Actualizar estado local (Realtime también los traerá, evitamos dup)
      setDonors((prev) => {
        const news = savedAll.filter(
          (s) => !prev.some((p) => p.id === s.id)
        )
        return news.length ? [...news, ...prev] : prev
      })

      // 5) Flash + scroll a la primera pieza tocada
      setFlashPartId(pd.targetPart.id)
      setTimeout(() => {
        const el = document.getElementById('modelo')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      setTimeout(() => setFlashPartId(null), 5000)

      pd.resolve(savedAll[0])
      setPendingDonation(null)
      setPreferredPartId(null)
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
      setPreferredPartId(null)
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

  const scrollToContact = () => {
    const el = document.getElementById('contacto')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen pb-20">
      <Header
        onDonateClick={scrollToForm}
        onContactClick={scrollToContact}
      />

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
          onPartClick={(part) => {
            setPreferredPartId(part.id)
            handleSelectTier(part.tier, { scroll: true })
          }}
        />

        <section className="tp-section">
          <ProgressPanel stats={stats} />
        </section>

        <section id="tiers" className="tp-section">
          <SectionHeader
            eyebrow="Categorías de aporte"
            title="Elige cómo quieres aportar"
            subtitle={
              <>
                Cada categoría tiene un costo total.{' '}
                <span className="text-tp-red font-semibold">
                  Puedes aportar la pieza entera o un porcentaje
                </span>{' '}
                — cada peso suma.
              </>
            }
          />
          <div className="mt-8">
            <DonationTiers
              tiers={tiers}
              parts={partsWithStatus}
              onPickTier={(tierId) => {
                setPreferredPartId(null) // se eligió tier, no pieza puntual
                handleSelectTier(tierId, { scroll: true })
              }}
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
                preferredPartId={preferredPartId}
                onSelectTier={(tierId) => {
                  setPreferredPartId(null) // cambió tier → ya no apunta a pieza concreta
                  setSelectedTierId(tierId)
                }}
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

        <section id="contacto" className="tp-section">
          <ContactSection />
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

function Header({ onDonateClick, onContactClick }) {
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
        <button
          onClick={onContactClick}
          className="tp-btn-secondary text-lg py-3.5 px-7"
        >
          ✉ Contacto
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
