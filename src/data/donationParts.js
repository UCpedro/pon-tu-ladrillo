// ────────────────────────────────────────────────────────────────────────────
// Piezas donables del salón · Zona San Rafael
// ────────────────────────────────────────────────────────────────────────────
// Cada pieza tiene:
//   id          → identificador único
//   name        → nombre visible
//   description → texto corto que aparece en el tooltip
//   tier        → categoría ('ladrillo'|'ventana'|'techo'|'panel')
//   price       → COSTO TOTAL real de la pieza (CLP). Se puede donar parcialmente.
//   shape       → tipo de geometría 3D
//   position    → [x, y, z]
//   rotation    → [x, y, z] rad
//   size        → [ancho, alto, profundidad]
//   color       → color del material cuando está donada
//
// Donaciones parciales: varias personas pueden aportar a la misma pieza. El
// modelo 3D se rellena proporcional al % aportado (fundedAmount / price).
// ────────────────────────────────────────────────────────────────────────────

const WOOD = '#c9a06a'
const ZINC = '#a9b3bd'
const GLASS = '#a9c9ec'
const DOOR_COLOR = '#7b2d1f'

// Categorías → para el componente DonationTiers
// El "price" mostrado es el COSTO TOTAL de UNA pieza entera. Si donás menos,
// completás un porcentaje proporcional de la pieza.
export const tiers = [
  {
    id: 'ventana',
    title: 'Ventana',
    price: 20000,
    color: 'bg-tp-blue',
    badge: '🪟',
    description:
      'Cada ventana deja entrar la luz al salón. Podés aportar la ventana completa o un porcentaje.',
  },
  {
    id: 'techo',
    title: 'Pieza techo',
    price: 250000,
    color: 'bg-tp-zinc-dark',
    badge: '🏠',
    description:
      'Plancha de zinc del techo a dos aguas. Aporta una sección entera o lo que puedas.',
  },
  {
    id: 'panel',
    title: 'Panel',
    price: 250000,
    color: 'bg-tp-earth-dark',
    badge: '🪵',
    description:
      'Uno de los paneles estructurales P1–P8 de los muros del salón.',
  },
  {
    id: 'puerta',
    title: 'Puerta',
    price: 60000,
    color: 'bg-tp-red-dark',
    badge: '🚪',
    description:
      'La puerta principal de doble hoja. La entrada del salón.',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Layout del salón
// ────────────────────────────────────────────────────────────────────────────
// Footprint: X ∈ [-5, 5], Z ∈ [-3, 3]  → 10 × 6
// Altura muros: 3 (Y ∈ [0.1, 3.1])
// Techo a dos aguas (cumbrera a lo largo del eje X, en z = 0, y = 5.1)
// ────────────────────────────────────────────────────────────────────────────

const ROOF_TILT = Math.atan(2 / 3) // ≈ 0.588 rad

export const donationParts = [
  // ── PANELES P1–P8 ────────────────────────────────────────────────────────
  // Muro frontal (z = +3)
  {
    id: 'P1',
    name: 'Panel P1 · Frontal izquierdo',
    description: 'Muro de madera machihembrada al costado de la entrada.',
    tier: 'panel',
    price: 250000,
    shape: 'panel',
    position: [-3.33, 1.6, 3],
    rotation: [0, 0, 0],
    size: [3.33, 3, 0.15],
    color: WOOD,
  },
  {
    id: 'P2',
    name: 'Panel P2 · Frontal centro (entrada)',
    description: 'Panel central donde se monta la puerta principal.',
    tier: 'panel',
    price: 250000,
    shape: 'panel',
    position: [0, 1.6, 3],
    rotation: [0, 0, 0],
    size: [3.33, 3, 0.15],
    color: WOOD,
    // La puerta ocupa el centro de este panel — no admite logo de empresa.
    excludeCompanyLogo: true,
  },
  {
    id: 'P3',
    name: 'Panel P3 · Frontal derecho',
    description: 'Panel del frente con ventana hacia la calle.',
    tier: 'panel',
    price: 250000,
    shape: 'panel',
    position: [3.33, 1.6, 3],
    rotation: [0, 0, 0],
    size: [3.33, 3, 0.15],
    color: WOOD,
    hasWindow: true,
  },
  // Muro trasero (z = -3)
  {
    id: 'P4',
    name: 'Panel P4 · Trasero izquierdo',
    description: 'Muro trasero con ventana hacia el patio.',
    tier: 'panel',
    price: 250000,
    shape: 'panel',
    position: [-3.33, 1.6, -3],
    rotation: [0, 0, 0],
    size: [3.33, 3, 0.15],
    color: WOOD,
    hasWindow: true,
  },
  {
    id: 'P5',
    name: 'Panel P5 · Trasero centro',
    description: 'Muro trasero central, ventana sobre cocina.',
    tier: 'panel',
    price: 250000,
    shape: 'panel',
    position: [0, 1.6, -3],
    rotation: [0, 0, 0],
    size: [3.33, 3, 0.15],
    color: WOOD,
    hasWindow: true,
  },
  {
    id: 'P6',
    name: 'Panel P6 · Trasero derecho',
    description: 'Muro trasero al fondo del baño.',
    tier: 'panel',
    price: 250000,
    shape: 'panel',
    position: [3.33, 1.6, -3],
    rotation: [0, 0, 0],
    size: [3.33, 3, 0.15],
    color: WOOD,
    hasWindow: true,
  },
  // Muros laterales
  // ── Muros laterales · cada lado dividido en 3 paneles de 2m ──────────────
  {
    id: 'P7',
    name: 'Panel P7 · Lateral oeste (trasero)',
    description: 'Tercio trasero del muro lateral oeste.',
    tier: 'panel',
    price: 250000,
    shape: 'side-panel',
    position: [-5, 1.6, -2],
    rotation: [0, 0, 0],
    size: [0.15, 3, 2],
    color: WOOD,
  },
  {
    id: 'P8',
    name: 'Panel P8 · Lateral oeste (centro)',
    description: 'Sección central del muro lateral oeste, con ventana hacia el sol poniente.',
    tier: 'panel',
    price: 250000,
    shape: 'side-panel',
    position: [-5, 1.6, 0],
    rotation: [0, 0, 0],
    size: [0.15, 3, 2],
    color: WOOD,
    hasWindow: true,
  },
  {
    id: 'P9',
    name: 'Panel P9 · Lateral oeste (frontal)',
    description: 'Tercio frontal del muro lateral oeste.',
    tier: 'panel',
    price: 250000,
    shape: 'side-panel',
    position: [-5, 1.6, 2],
    rotation: [0, 0, 0],
    size: [0.15, 3, 2],
    color: WOOD,
  },
  {
    id: 'P10',
    name: 'Panel P10 · Lateral este (trasero)',
    description: 'Tercio trasero del muro lateral este.',
    tier: 'panel',
    price: 250000,
    shape: 'side-panel',
    position: [5, 1.6, -2],
    rotation: [0, 0, 0],
    size: [0.15, 3, 2],
    color: WOOD,
  },
  {
    id: 'P11',
    name: 'Panel P11 · Lateral este (centro)',
    description: 'Sección central del muro lateral este.',
    tier: 'panel',
    price: 250000,
    shape: 'side-panel',
    position: [5, 1.6, 0],
    rotation: [0, 0, 0],
    size: [0.15, 3, 2],
    color: WOOD,
  },
  {
    id: 'P12',
    name: 'Panel P12 · Lateral este (frontal)',
    description: 'Tercio frontal del muro lateral este.',
    tier: 'panel',
    price: 250000,
    shape: 'side-panel',
    position: [5, 1.6, 2],
    rotation: [0, 0, 0],
    size: [0.15, 3, 2],
    color: WOOD,
  },

  // ── PUERTA ───────────────────────────────────────────────────────────────
  {
    id: 'D1',
    name: 'Puerta principal',
    description: 'Puerta de acceso doble hoja en madera.',
    tier: 'puerta',
    price: 60000,
    shape: 'door',
    position: [0, 1.1, 3.09],
    rotation: [0, 0, 0],
    size: [1.3, 2.2, 0.1],
    color: DOOR_COLOR,
  },

  // ── VENTANAS ─────────────────────────────────────────────────────────────
  {
    id: 'V1',
    name: 'Ventana V1 · Frontal derecha',
    description: 'Ventana del salón principal hacia la calle.',
    tier: 'ventana',
    price: 20000,
    shape: 'window',
    position: [3.33, 1.9, 3.09],
    rotation: [0, 0, 0],
    size: [1.4, 1, 0.06],
    color: GLASS,
  },
  {
    id: 'V2',
    name: 'Ventana V2 · Trasera izquierda',
    description: 'Ventana del salón principal hacia el patio.',
    tier: 'ventana',
    price: 20000,
    shape: 'window',
    position: [-3.33, 1.9, -3.09],
    rotation: [0, 0, 0],
    size: [1.4, 1, 0.06],
    color: GLASS,
  },
  {
    id: 'V3',
    name: 'Ventana V3 · Trasera centro',
    description: 'Ventana central trasera del salón.',
    tier: 'ventana',
    price: 20000,
    shape: 'window',
    position: [0, 1.9, -3.09],
    rotation: [0, 0, 0],
    size: [1.4, 1, 0.06],
    color: GLASS,
  },
  {
    id: 'V4',
    name: 'Ventana V4 · Trasera derecha',
    description: 'Ventana alta trasera derecha.',
    tier: 'ventana',
    price: 20000,
    shape: 'window',
    position: [3.33, 2.2, -3.09],
    rotation: [0, 0, 0],
    size: [1.2, 0.6, 0.06],
    color: GLASS,
  },
  {
    id: 'V5',
    name: 'Ventana V5 · Lateral oeste',
    description: 'Ventana lateral del salón principal.',
    tier: 'ventana',
    price: 20000,
    shape: 'side-window',
    position: [-5.09, 1.9, 0],
    rotation: [0, 0, 0],
    size: [0.06, 1, 1.4],
    color: GLASS,
  },

  // ── TECHO · 12 secciones (cada agua dividida en 6 → 3 por cada mitad) ────
  // Aguas sur (+Z, rotación positiva) y norte (-Z, rotación negativa).
  // Cumbrera a lo largo del eje X. Cada sección es 10/6 ≈ 1.667 m en X.
  ...buildRoof(),

  // ── HASTIALES (paneles triangulares entre muros laterales y techo) ───────
  {
    id: 'G1',
    name: 'Hastial G1 · Frontón oeste',
    description: 'Panel triangular entre el muro lateral oeste y el techo.',
    tier: 'panel',
    price: 150000,
    shape: 'gable',
    position: [-5, 3.1, 0],
    rotation: [0, Math.PI / 2, 0],
    size: [6, 2, 0.15], // [base, altura, espesor]
    color: WOOD,
    excludeCompanyLogo: true,
  },
  {
    id: 'G2',
    name: 'Hastial G2 · Frontón este',
    description: 'Panel triangular entre el muro lateral este y el techo.',
    tier: 'panel',
    price: 150000,
    shape: 'gable',
    position: [5, 3.1, 0],
    rotation: [0, -Math.PI / 2, 0],
    size: [6, 2, 0.15],
    color: WOOD,
    excludeCompanyLogo: true,
  },
]

// (Sin ladrillos: el campaign sigue llamándose "Pon tu ladrillo" como metáfora,
// pero ya no hay piezas físicas tipo ladrillo en el modelo 3D.)

function buildRoof() {
  const pieces = []
  const segmentWidth = 10 / 6 // 1.667 m por segmento en X
  const xCenters = [0, 1, 2, 3, 4, 5].map(
    (k) => -5 + segmentWidth / 2 + k * segmentWidth
  )
  // Agua sur (z = +1.5, rotación +ROOF_TILT)
  xCenters.forEach((x, i) => {
    pieces.push({
      id: `T${i + 1}`,
      name: `Techo T${i + 1} · Agua sur, sector ${i + 1}`,
      description: 'Plancha de zinc del agua sur del techo.',
      tier: 'techo',
      price: 250000,
      shape: 'roof',
      position: [x, 4.1, 1.5],
      rotation: [ROOF_TILT, 0, 0],
      size: [segmentWidth, 0.1, 3.606],
      color: ZINC,
    })
  })
  // Agua norte (z = -1.5, rotación -ROOF_TILT)
  xCenters.forEach((x, i) => {
    pieces.push({
      id: `T${i + 7}`,
      name: `Techo T${i + 7} · Agua norte, sector ${i + 1}`,
      description: 'Plancha de zinc del agua norte del techo.',
      tier: 'techo',
      price: 250000,
      shape: 'roof',
      position: [x, 4.1, -1.5],
      rotation: [-ROOF_TILT, 0, 0],
      size: [segmentWidth, 0.1, 3.606],
      color: ZINC,
    })
  })
  return pieces
}

// ────────────────────────────────────────────────────────────────────────────
// Donantes de ejemplo (precargados en el primer render)
// ────────────────────────────────────────────────────────────────────────────
// Agregar acá donantes reales si querés que aparezcan siempre al cargar.
// Formato:
//   {
//     id: 'd-001',
//     partId: 'P1',           // id de la pieza
//     name: 'Nombre del donante',
//     message: 'Mensaje opcional',
//     amount: 10000,          // CLP
//     timestamp: '2026-05-20T12:00:00.000Z',
//   }
// ────────────────────────────────────────────────────────────────────────────
export const sampleDonors = []

// Meta total (suma del precio sugerido de todas las piezas)
export const totalGoal = donationParts.reduce((sum, p) => sum + p.price, 0)
