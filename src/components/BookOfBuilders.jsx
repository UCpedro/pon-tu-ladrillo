import { formatCLP } from '../utils/format.js'

export default function BookOfBuilders({ donors, parts }) {
  const partsById = new Map(parts.map((p) => [p.id, p]))
  const sorted = [...donors].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  )

  return (
    <div className="tp-card overflow-hidden">
      <div className="grid lg:grid-cols-5">
        {/* Lado izquierdo: cita */}
        <div className="lg:col-span-2 p-8 sm:p-10 bg-gradient-to-br from-tp-blue-dark via-tp-blue to-tp-blue text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-tp-red/20 blur-3xl pointer-events-none" />
          <span className="text-xs uppercase tracking-widest font-semibold text-white/80">
            Libro de constructores
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3 leading-tight">
            Cada nombre es parte del salón de San Rafael.
          </h2>
          <p className="mt-4 text-white/90 leading-relaxed">
            Este salón no se construye solo con materiales, sino con las
            personas que decidieron aportar.{' '}
            <strong className="text-white">Cada nombre forma parte de esta historia</strong>.
          </p>
          <p className="mt-4 text-white/75 text-sm italic">
            Una vez terminado el salón en la Zona San Rafael, este libro
            quedará impreso y dejado en la entrada como recuerdo permanente de
            quienes lo hicieron posible.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white/10 p-3">
              <p className="font-display text-2xl font-bold">{donors.length}</p>
              <p className="text-[11px] uppercase tracking-wider text-white/80">
                Constructores
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <p className="font-display text-2xl font-bold">
                {parts.filter((p) => p.donated).length}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-white/80">
                Piezas completadas
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <p className="font-display text-2xl font-bold">
                {formatCLP(
                  donors.reduce((s, d) => s + (d.amount || 0), 0)
                ).replace('CLP', '').trim()}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-white/80">
                Aporte total (CLP)
              </p>
            </div>
          </div>
        </div>

        {/* Lado derecho: lista completa */}
        <div className="lg:col-span-3 p-6 sm:p-8 bg-tp-paper max-h-[520px] overflow-y-auto">
          <h3 className="font-display text-lg font-bold text-tp-blue-dark mb-1">
            Registro de aportes
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            En orden cronológico, todos los nombres que ya están en el modelo.
          </p>
          {sorted.length === 0 ? (
            <p className="text-slate-500 text-center py-12">
              Pronto aparecerán aquí los primeros nombres.
            </p>
          ) : (
            <ol className="space-y-2">
              {sorted.map((d, i) => {
                const part = partsById.get(d.partId)
                const pct = part
                  ? Math.min(100, Math.round((d.amount / part.price) * 100))
                  : 0
                return (
                  <li
                    key={d.id}
                    className="grid grid-cols-[2rem_1fr_auto] gap-2 items-baseline py-2 border-b border-dotted border-stone-200 last:border-0"
                  >
                    <span className="text-xs text-slate-400 font-mono">
                      {String(i + 1).padStart(3, '0')}
                    </span>
                    <span>
                      <span className="font-semibold text-tp-blue-dark">
                        {d.name}
                      </span>
                      {d.message && (
                        <span className="text-slate-500 italic">
                          {' '}
                          — "{d.message}"
                        </span>
                      )}
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {pct}% de {part?.name || d.partId}
                      </span>
                    </span>
                    <span className="text-xs text-tp-red font-semibold whitespace-nowrap">
                      {formatCLP(d.amount)}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
