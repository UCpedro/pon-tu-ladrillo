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
const VARNISH = '#f3eee2' // cuerpo blanco crema (etiqueta tipo Ceresita)
const CARDBOARD = '#b07a45' // cartón kraft del fondo de la caja
const INSULATION = '#d6c485' // rollo de aislante (fibra de vidrio tono natural)

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
    price: 100000,
    color: 'bg-tp-zinc-dark',
    badge: '🏠',
    description:
      'Plancha de zinc del techo a dos aguas. Aporta una sección entera o lo que puedas.',
  },
  {
    id: 'panel',
    title: 'Panel',
    price: 150000,
    color: 'bg-tp-earth-dark',
    badge: '🪵',
    description:
      'Uno de los paneles estructurales P1–P12 de los muros del salón.',
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
  {
    id: 'barniz',
    title: 'Lata de barniz',
    price: 10000,
    color: 'bg-amber-700',
    badge: '🪣',
    description:
      'Una lata de barniz para terminar la madera del salón.',
  },
  {
    id: 'clavos',
    title: 'Caja de clavos',
    price: 10000,
    color: 'bg-stone-700',
    badge: '📦',
    description:
      'Una caja de clavos para fijar los tablones del salón.',
  },
  {
    id: 'aislante',
    title: 'Rollo de aislante',
    price: 20000,
    color: 'bg-yellow-700',
    badge: '🧶',
    description:
      'Un rollo de aislante térmico para los muros del salón.',
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
  // ── PANELES · cada panel base se divide en 5 tablones de $50.000 ─────────
  ...buildPanels(),
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
    description: 'Ventana trasera derecha.',
    tier: 'ventana',
    price: 20000,
    shape: 'window',
    position: [3.33, 1.9, -3.09],
    rotation: [0, 0, 0],
    size: [1.4, 1, 0.06],
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
  {
    id: 'V6',
    name: 'Ventana V6 · Frontal izquierda',
    description: 'Ventana del salón hacia la calle (lado izquierdo).',
    tier: 'ventana',
    price: 20000,
    shape: 'window',
    position: [-3.33, 1.9, 3.09],
    rotation: [0, 0, 0],
    size: [1.4, 1, 0.06],
    color: GLASS,
  },
  {
    id: 'V7',
    name: 'Ventana V7 · Lateral este',
    description: 'Ventana lateral del salón hacia el este.',
    tier: 'ventana',
    price: 20000,
    shape: 'side-window',
    position: [5.09, 1.9, 0],
    rotation: [0, 0, 0],
    size: [0.06, 1, 1.4],
    color: GLASS,
  },

  // ── TECHO · 12 secciones (cada agua dividida en 6 → 3 por cada mitad) ────
  // Aguas sur (+Z, rotación positiva) y norte (-Z, rotación negativa).
  // Cumbrera a lo largo del eje X. Cada sección es 10/6 ≈ 1.667 m en X.
  ...buildRoof(),

  // ── HASTIALES · 2 triángulos por frontón (izq + der), $150.000 c/u ────────
  {
    id: 'G1-1',
    name: 'Hastial G1 · Frontón oeste (mitad izquierda)',
    description: 'Mitad izquierda del panel triangular del frontón oeste.',
    tier: 'panel',
    price: 150000,
    shape: 'gable-half',
    gableSide: 'left',
    position: [-5, 3.1, 0],
    rotation: [0, Math.PI / 2, 0],
    size: [6, 2, 0.15],
    color: WOOD,
    excludeCompanyLogo: true,
  },
  {
    id: 'G1-2',
    name: 'Hastial G1 · Frontón oeste (mitad derecha)',
    description: 'Mitad derecha del panel triangular del frontón oeste.',
    tier: 'panel',
    price: 150000,
    shape: 'gable-half',
    gableSide: 'right',
    position: [-5, 3.1, 0],
    rotation: [0, Math.PI / 2, 0],
    size: [6, 2, 0.15],
    color: WOOD,
    excludeCompanyLogo: true,
  },
  {
    id: 'G2-1',
    name: 'Hastial G2 · Frontón este (mitad izquierda)',
    description: 'Mitad izquierda del panel triangular del frontón este.',
    tier: 'panel',
    price: 150000,
    shape: 'gable-half',
    gableSide: 'left',
    position: [5, 3.1, 0],
    rotation: [0, -Math.PI / 2, 0],
    size: [6, 2, 0.15],
    color: WOOD,
    excludeCompanyLogo: true,
  },
  {
    id: 'G2-2',
    name: 'Hastial G2 · Frontón este (mitad derecha)',
    description: 'Mitad derecha del panel triangular del frontón este.',
    tier: 'panel',
    price: 150000,
    shape: 'gable-half',
    gableSide: 'right',
    position: [5, 3.1, 0],
    rotation: [0, -Math.PI / 2, 0],
    size: [6, 2, 0.15],
    color: WOOD,
    excludeCompanyLogo: true,
  },

  // ── LATAS DE BARNIZ (frente a P1, sobre el pasto) ────────────────────────
  ...buildVarnishCans(),

  // ── CAJAS DE CLAVOS (frente a P3, sobre el pasto) ────────────────────────
  ...buildNailBoxes(),

  // ── ROLLOS DE AISLANTE (frente a P7-P9, lateral oeste) ───────────────────
  ...buildInsulationRolls(),
]

// (Sin ladrillos: el campaign sigue llamándose "Pon tu ladrillo" como metáfora,
// pero ya no hay piezas físicas tipo ladrillo en el modelo 3D.)

function buildVarnishCans() {
  // 5 latas de barniz de $10.000 cada una, frente a P1 (lado frontal izquierdo).
  // B1 = preview (siempre llena, no cuenta) + 4 donables → mismo "available"
  // que antes (4 disponibles).
  const positions = [
    [-4.7, 0.15, 3.65],
    [-4.05, 0.15, 3.85],
    [-3.4, 0.15, 3.6],
    [-2.75, 0.15, 3.85],
    [-2.1, 0.15, 3.65],
  ]
  return positions.map((pos, i) => ({
    id: `B${i + 1}`,
    name: `Lata de barniz #${i + 1}`,
    description: 'Lata de barniz para terminar la madera del salón.',
    tier: 'barniz',
    price: 10000,
    shape: 'paint-can',
    position: pos,
    rotation: [0, (i * Math.PI) / 7, 0],
    size: [0.48, 0.6, 0.48], // [diametro, alto, diametro]
    color: VARNISH,
    // La primera lata es solo vista previa: aparece llena pero no cuenta
    // como donación real ni suma a la meta.
    ...(i === 0 ? { isPreviewOnly: true } : {}),
  }))
}

function buildInsulationRolls() {
  // 6 rollos de aislante de $20.000 cada uno, frente al muro lateral oeste
  // (paneles P7-P9). Repartidos al azar (no apilados, no en pares).
  // Acostados sobre el pasto, con orientaciones distintas para look natural.
  // Tamaño: diámetro 0.4 m, largo 0.8 m. Centro y = 0.05 (apoyado en pasto).
  // 7 rollos: R1 preview + 6 donables (mismo "available" que antes).
  const layout = [
    { pos: [-5.55, 0.05, -2.7], rotZ: 0 },
    { pos: [-5.95, 0.05, -1.85], rotZ: Math.PI / 8 },
    { pos: [-5.6, 0.05, -1.0], rotZ: -Math.PI / 10 },
    { pos: [-5.9, 0.05, -0.15], rotZ: Math.PI / 6 },
    { pos: [-5.55, 0.05, 0.7], rotZ: -Math.PI / 7 },
    { pos: [-5.95, 0.05, 1.55], rotZ: Math.PI / 5 },
    { pos: [-5.6, 0.05, 2.5], rotZ: -Math.PI / 9 },
  ]
  return layout.map((entry, i) => ({
    id: `R${i + 1}`,
    name: `Rollo de aislante #${i + 1}`,
    description: 'Rollo de aislante térmico para los muros del salón.',
    tier: 'aislante',
    price: 20000,
    shape: 'insulation-roll',
    position: entry.pos,
    // [π/2, 0, rotZ]: acostado a lo largo de Z + rotado en el plano horizontal
    rotation: [Math.PI / 2, 0, entry.rotZ],
    size: [0.4, 0.8, 0.4],
    color: INSULATION,
    ...(i === 0 ? { isPreviewOnly: true } : {}),
  }))
}

function buildNailBoxes() {
  // 5 cajas de clavos de $10.000 cada una, frente a P3 (lado frontal derecho).
  // N1 = preview + 4 donables.
  const positions = [
    [2.15, 0.05, 3.65],
    [2.85, 0.05, 3.85],
    [3.55, 0.05, 3.6],
    [4.25, 0.05, 3.85],
    [4.85, 0.05, 3.65],
  ]
  return positions.map((pos, i) => ({
    id: `N${i + 1}`,
    name: `Caja de clavos #${i + 1}`,
    description: 'Caja de clavos para fijar los tablones del salón.',
    tier: 'clavos',
    price: 10000,
    shape: 'nail-box',
    position: pos,
    rotation: [0, (i * Math.PI) / 9, 0],
    size: [0.64, 0.4, 0.48],
    color: CARDBOARD,
    ...(i === 0 ? { isPreviewOnly: true } : {}),
  }))
}

function buildPanels() {
  // Paneles P1-P6 (frontales y traseros) divididos en 2 mitades verticales c/u.
  // Cada mitad: 1.665 m de ancho × 3 m alto × 0.15 m, $150.000.
  const PANEL_W = 3.33
  const PANEL_H = 3
  const PANEL_T = 0.15
  const HALF_W = PANEL_W / 2
  const HALF_OFFSET = PANEL_W / 4 // desfase del centro de cada mitad

  const bigBases = [
    {
      base: 'P1',
      label: 'Frontal izquierdo',
      position: [-3.33, 1.6, 3],
      hasWindow: true,
    },
    {
      base: 'P2',
      label: 'Frontal centro (entrada)',
      position: [0, 1.6, 3],
      excludeCompanyLogo: true,
    },
    {
      base: 'P3',
      label: 'Frontal derecho',
      position: [3.33, 1.6, 3],
      hasWindow: true,
    },
    {
      base: 'P4',
      label: 'Trasero izquierdo',
      position: [-3.33, 1.6, -3],
      hasWindow: true,
    },
    {
      base: 'P5',
      label: 'Trasero centro',
      position: [0, 1.6, -3],
      hasWindow: true,
    },
    {
      base: 'P6',
      label: 'Trasero derecho',
      position: [3.33, 1.6, -3],
      hasWindow: true,
    },
  ]

  const halves = []
  bigBases.forEach((p) => {
    // Mitad izquierda
    halves.push({
      id: `${p.base}-1`,
      name: `Panel ${p.base} · ${p.label} (mitad izquierda)`,
      description: 'Mitad izquierda del muro de madera.',
      tier: 'panel',
      price: 150000,
      shape: 'panel',
      position: [p.position[0] - HALF_OFFSET, p.position[1], p.position[2]],
      rotation: [0, 0, 0],
      size: [HALF_W, PANEL_H, PANEL_T],
      color: WOOD,
      ...(p.hasWindow ? { hasWindow: true } : {}),
      ...(p.excludeCompanyLogo ? { excludeCompanyLogo: true } : {}),
    })
    // Mitad derecha
    halves.push({
      id: `${p.base}-2`,
      name: `Panel ${p.base} · ${p.label} (mitad derecha)`,
      description: 'Mitad derecha del muro de madera.',
      tier: 'panel',
      price: 150000,
      shape: 'panel',
      position: [p.position[0] + HALF_OFFSET, p.position[1], p.position[2]],
      rotation: [0, 0, 0],
      size: [HALF_W, PANEL_H, PANEL_T],
      color: WOOD,
      ...(p.hasWindow ? { hasWindow: true } : {}),
      ...(p.excludeCompanyLogo ? { excludeCompanyLogo: true } : {}),
    })
  })

  return [
    ...halves,
    // Muros laterales (cada lado dividido en 3 paneles de 2m)
    {
      id: 'P7',
      name: 'Panel P7 · Lateral oeste (trasero)',
      description: 'Tercio trasero del muro lateral oeste.',
      tier: 'panel',
      price: 150000,
      shape: 'side-panel',
      position: [-5, 1.6, -2],
      rotation: [0, 0, 0],
      size: [0.15, 3, 2],
      color: WOOD,
    },
    {
      id: 'P8',
      name: 'Panel P8 · Lateral oeste (centro)',
      description: 'Sección central del muro lateral oeste, con ventana.',
      tier: 'panel',
      price: 150000,
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
      price: 150000,
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
      price: 150000,
      shape: 'side-panel',
      position: [5, 1.6, -2],
      rotation: [0, 0, 0],
      size: [0.15, 3, 2],
      color: WOOD,
    },
    {
      id: 'P11',
      name: 'Panel P11 · Lateral este (centro)',
      description: 'Sección central del muro lateral este, con ventana.',
      tier: 'panel',
      price: 150000,
      shape: 'side-panel',
      position: [5, 1.6, 0],
      rotation: [0, 0, 0],
      size: [0.15, 3, 2],
      color: WOOD,
      hasWindow: true,
    },
    {
      id: 'P12',
      name: 'Panel P12 · Lateral este (frontal)',
      description: 'Tercio frontal del muro lateral este.',
      tier: 'panel',
      price: 150000,
      shape: 'side-panel',
      position: [5, 1.6, 2],
      rotation: [0, 0, 0],
      size: [0.15, 3, 2],
      color: WOOD,
    },
  ]
}

function buildRoof() {
  // 12 secciones de techo enteras de $250.000 cada una.
  const pieces = []
  const SECTION_WIDTH = 10 / 6 // 1.667 m por sector en X
  const SLOPE_LENGTH = 3.606
  const sectionCenters = [0, 1, 2, 3, 4, 5].map(
    (k) => -5 + SECTION_WIDTH / 2 + k * SECTION_WIDTH
  )

  // Agua sur (z = +1.5, rotación +ROOF_TILT)
  sectionCenters.forEach((x, i) => {
    pieces.push({
      id: `T${i + 1}`,
      name: `Techo T${i + 1} · Agua sur, sector ${i + 1}`,
      description: 'Plancha de zinc del agua sur del techo.',
      tier: 'techo',
      price: 100000,
      shape: 'roof',
      position: [x, 4.1, 1.5],
      rotation: [ROOF_TILT, 0, 0],
      size: [SECTION_WIDTH, 0.1, SLOPE_LENGTH],
      color: ZINC,
    })
  })
  // Agua norte (z = -1.5, rotación -ROOF_TILT)
  sectionCenters.forEach((x, i) => {
    pieces.push({
      id: `T${i + 7}`,
      name: `Techo T${i + 7} · Agua norte, sector ${i + 1}`,
      description: 'Plancha de zinc del agua norte del techo.',
      tier: 'techo',
      price: 100000,
      shape: 'roof',
      position: [x, 4.1, -1.5],
      rotation: [-ROOF_TILT, 0, 0],
      size: [SECTION_WIDTH, 0.1, SLOPE_LENGTH],
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
export const totalGoal = donationParts
  .filter((p) => !p.isPreviewOnly)
  .reduce((sum, p) => sum + p.price, 0)
