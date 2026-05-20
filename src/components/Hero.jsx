import SalonModel from './SalonModel.jsx'
import { formatCLP, formatNumber } from '../utils/format.js'

export default function Hero({
  stats,
  parts,
  flashPartId,
  flashPart,
  onDonateClick,
  onCompanyClick,
  onViewParts,
  onPartClick,
}) {
  return (
    <section className="tp-section pt-0">
      <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Texto */}
        <div className="lg:col-span-5 order-2 lg:order-1">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold text-tp-blue-dark leading-[1.02]">
            Pon tu <span className="text-tp-red">ladrillo</span>.
          </h1>

          <p className="mt-2 inline-flex items-center gap-2 text-tp-blue font-semibold text-base sm:text-lg uppercase tracking-wider">
            <span className="h-px w-8 bg-tp-blue/40" />
            Trabajo País 2026
          </p>

          <p className="text-lg sm:text-xl text-slate-700 mt-5 max-w-xl leading-relaxed">
            Cada aporte construye una parte del salón de{' '}
            <strong className="text-tp-red">San Rafael</strong> que quedará
            para los vecinos. Tu nombre se marca en una pieza del modelo y
            entra al libro de constructores.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={onDonateClick} className="tp-btn-primary">
              Quiero donar
            </button>
            <button
              onClick={onCompanyClick}
              className="tp-btn-secondary border-tp-red/40 text-tp-red hover:bg-tp-red/5 hover:border-tp-red/70"
            >
              <span aria-hidden>🏢</span> Donación empresa
            </button>
            <button onClick={onViewParts} className="tp-btn-secondary">
              Ver partes disponibles
            </button>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
            <Stat label="Recaudado" value={formatCLP(stats.raised)} />
            <Stat
              label="Avance del salón"
              value={`${stats.percent}%`}
              accent
            />
            <Stat
              label="Donantes"
              value={formatNumber(stats.donorsCount)}
            />
          </dl>
        </div>

        {/* Modelo 3D */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div id="modelo" className="tp-card overflow-hidden relative">
            {/* Banner "¡Gracias por tu aporte!" — aparece 5s al donar */}
            {flashPartId && (
              <div className="tp-pop absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-20 pointer-events-none">
                <div className="rounded-2xl bg-emerald-500 text-white shadow-2xl border-2 border-emerald-300 px-5 py-4 flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                    🎉
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-extrabold text-xl sm:text-2xl leading-tight">
                      ¡Gracias por tu aporte!
                    </p>
                    {flashPart && (
                      <p className="text-sm sm:text-base text-white/90 truncate">
                        Tu nombre quedó en {flashPart.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] sm:text-xs text-amber-800 flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 flex-shrink-0"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 2L1 21h22L12 2zm0 6l7.5 13h-15L12 8zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
              </svg>
              <span>
                Los valores mostrados son <strong>representativos</strong>. Los
                precios finales pueden variar según la implementación real del
                proyecto.
              </span>
            </div>
            <div className="aspect-[4/3] sm:aspect-[16/10] lg:aspect-[5/4] w-full canvas-shell">
              <SalonModel
                parts={parts}
                flashPartId={flashPartId}
                onPartClick={onPartClick}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 sm:px-5 py-3 border-t border-stone-200 text-[11px] sm:text-xs text-slate-600 bg-tp-paper">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-tp-wood border border-tp-wood-dark" />
                Pieza donada
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-slate-400 bg-white/30" />
                Disponible
              </span>
              <span className="ml-auto text-slate-500 italic hidden sm:inline">
                Click sobre una pieza disponible para donarla
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </dt>
      <dd
        className={`font-display font-bold text-2xl sm:text-3xl mt-1 ${
          accent ? 'text-tp-red' : 'text-tp-blue-dark'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
