import { Suspense, useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Edges, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { formatCLP } from '../utils/format.js'

const WOOD_SHAPES = new Set(['panel', 'side-panel', 'gable'])
const ZINC_SHAPES = new Set(['roof'])
const DOOR_SHAPES = new Set(['door'])
const WINDOW_SHAPES = new Set(['window', 'side-window'])

useTexture.preload('/madera.avif')
useTexture.preload('/zinc.avif')
useTexture.preload('/puerta.jpg')
useTexture.preload('/ventana.png')
useTexture.preload('/marco.png')

// ────────────────────────────────────────────────────────────────────────────
// SalonModel: renderiza el salón 3D. Cada pieza es una caja con material
// completo si está donada, o casi transparente con outline si está disponible.
// ────────────────────────────────────────────────────────────────────────────

export default function SalonModel({ parts, flashPartId, onPartClick }) {
  const containerRef = useRef(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  const hoveredPart = useMemo(
    () => parts.find((p) => p.id === hoveredId) || null,
    [parts, hoveredId]
  )

  const handlePointerMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const cursor = hoveredPart ? 'pointer' : 'grab'

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none"
      style={{ cursor }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoveredId(null)}
    >
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        camera={{ position: [14, 9, 16], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneLights />
        <Ground />

        <Suspense fallback={null}>
          <Pieces
            parts={parts}
            hoveredId={hoveredId}
            flashPartId={flashPartId}
            setHoveredId={setHoveredId}
            onPartClick={onPartClick}
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate={!hoveredPart}
          autoRotateSpeed={0.45}
          target={[0, 1.4, 0]}
        />
      </Canvas>

      {/* Tooltip */}
      {hoveredPart && (
        <Tooltip part={hoveredPart} x={pointer.x} y={pointer.y} />
      )}

      {/* Mini indicador de ayuda */}
      <div className="pointer-events-none absolute bottom-3 left-3 sm:left-4 text-[11px] sm:text-xs text-tp-blue-dark/70 bg-white/70 backdrop-blur rounded-full px-3 py-1.5">
        Arrastra para girar el salón
      </div>
    </div>
  )
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[12, 18, 8]} intensity={1.15} />
      <directionalLight position={[-10, 8, -6]} intensity={0.35} />
      <hemisphereLight args={['#fff8ec', '#a67c52', 0.35]} />
    </>
  )
}

function Ground() {
  return (
    <group>
      {/* Pasto */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.15, 0]}
        receiveShadow
      >
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#cdd9a8" roughness={1} />
      </mesh>
      {/* Radier del salón → viene por defecto (no se dona) */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[10.2, 0.18, 6.2]} />
        <meshStandardMaterial color="#cfcabd" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Pieces: carga texturas y renderiza el conjunto de piezas
// ────────────────────────────────────────────────────────────────────────────
function Pieces({
  parts,
  hoveredId,
  flashPartId,
  setHoveredId,
  onPartClick,
}) {
  const [woodMap, zincMap, doorMap, windowMap, frameMap] = useTexture([
    '/madera.avif',
    '/zinc.avif',
    '/puerta.jpg',
    '/ventana.png',
    '/marco.png',
  ])

  useMemo(() => {
    ;[woodMap, zincMap, doorMap, windowMap].forEach((tex) => {
      if (!tex) return
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.anisotropy = 8
      tex.colorSpace = THREE.SRGBColorSpace
    })
    if (frameMap) {
      frameMap.colorSpace = THREE.SRGBColorSpace
      frameMap.anisotropy = 8
    }
  }, [woodMap, zincMap, doorMap, windowMap, frameMap])

  return (
    <>
      {parts.map((part) => (
        <Piece
          key={part.id}
          part={part}
          woodMap={woodMap}
          zincMap={zincMap}
          doorMap={doorMap}
          windowMap={windowMap}
          frameMap={frameMap}
          isHovered={hoveredId === part.id}
          isFlash={flashPartId === part.id}
          onHover={(id) => setHoveredId(id)}
          onUnhover={(id) =>
            setHoveredId((cur) => (cur === id ? null : cur))
          }
          onClick={() => onPartClick && onPartClick(part)}
        />
      ))}
    </>
  )
}

// Geometría de cada pieza: box (default) o triángulo extruido para hastiales.
function PieceGeometry({ shape, size }) {
  const geom = useMemo(() => {
    if (shape !== 'gable') return null
    const [baseWidth, height, thickness] = size
    const s = new THREE.Shape()
    s.moveTo(-baseWidth / 2, 0)
    s.lineTo(baseWidth / 2, 0)
    s.lineTo(0, height)
    s.lineTo(-baseWidth / 2, 0)
    return new THREE.ExtrudeGeometry(s, {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 1,
    })
  }, [shape, size])

  if (geom) return <primitive object={geom} attach="geometry" />
  return <boxGeometry args={size} />
}

// Devuelve { pos, rot, size } del LogoPlate para una pieza dada.
// Coloca una placa flotante orientada hacia la cara visible exterior.
// Si la pieza tiene ventana (hasWindow), el logo se posiciona debajo de ella.
function getLogoTransform(part) {
  const { shape, size, position, hasWindow } = part
  const [sx, sy, sz] = size
  switch (shape) {
    case 'panel': {
      const front = position[2] > 0
      const yPos = hasWindow ? -0.7 : 0
      const maxH = hasWindow ? 0.75 : Math.min(sy * 0.45, 1.6)
      return {
        pos: [0, yPos, front ? sz / 2 + 0.06 : -sz / 2 - 0.06],
        rot: [0, front ? 0 : Math.PI, 0],
        size: [Math.min(sx * 0.55, 2.2), maxH],
      }
    }
    case 'side-panel': {
      const right = position[0] > 0
      const yPos = hasWindow ? -0.7 : 0
      const maxH = hasWindow ? 0.75 : Math.min(sy * 0.45, 1.6)
      return {
        pos: [right ? sx / 2 + 0.06 : -sx / 2 - 0.06, yPos, 0],
        rot: [0, right ? Math.PI / 2 : -Math.PI / 2, 0],
        size: [Math.min(sz * 0.5, 2.4), maxH],
      }
    }
    case 'door': {
      return {
        pos: [0, 0.3, sz / 2 + 0.06],
        rot: [0, 0, 0],
        size: [Math.min(sx * 0.85, 1.1), 0.45],
      }
    }
    case 'roof': {
      // Cara superior del techo. En coords locales, +Y es la cara visible.
      return {
        pos: [0, sy / 2 + 0.04, 0],
        rot: [-Math.PI / 2, 0, 0],
        size: [Math.min(sx * 0.5, 2.6), Math.min(sz * 0.4, 1.8)],
      }
    }
    default:
      return null
  }
}

function LogoPlate({ dataUrl, transform, frameMap }) {
  const [aspect, setAspect] = useState(1)

  const texture = useMemo(() => {
    if (!dataUrl) return null
    const loader = new THREE.TextureLoader()
    const t = loader.load(dataUrl, (loaded) => {
      const img = loaded.image
      if (img && img.width && img.height) {
        setAspect(img.width / img.height)
      }
    })
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [dataUrl])

  if (!texture || !transform) return null

  const [maxW, maxH] = transform.size

  // 1) El marco se estira al aspect del logo, pero clampeado para no deformar
  //    demasiado la madera (rango 0.55–1.85 ≈ casi cuadrado a moderadamente
  //    rectangular).
  const marcoAspect = Math.max(0.55, Math.min(1.85, aspect))

  // 2) Marco cabe dentro de la caja máxima manteniendo su aspect
  let frameW = maxW
  let frameH = maxW / marcoAspect
  if (frameH > maxH) {
    frameH = maxH
    frameW = maxH * marcoAspect
  }

  // 3) Hueco transparente del marco ≈ 60% del marco
  const HOLE = 0.6
  const holeW = frameW * HOLE
  const holeH = frameH * HOLE

  // 4) Logo ENTRA en el hueco respetando su aspect real
  let w = holeW
  let h = holeW / aspect
  if (h > holeH) {
    h = holeH
    w = holeH * aspect
  }

  return (
    <group position={transform.pos} rotation={transform.rot}>
      {/* Fondo blanco — llena exactamente el hueco del marco */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[holeW * 0.98, holeH * 0.98]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>

      {/* Logo CENTRADO dentro del hueco */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.05}
          side={THREE.DoubleSide}
          roughness={0.55}
          emissive="#ffffff"
          emissiveMap={texture}
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* Marco SIEMPRE EN FRENTE — tapa cualquier rebalse del logo */}
      {frameMap && (
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[frameW, frameH]} />
          <meshStandardMaterial
            map={frameMap}
            transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
            roughness={0.7}
          />
        </mesh>
      )}
    </group>
  )
}

// Calcula scale y offset locales para mostrar SOLO una fracción de la pieza.
// - walls/windows/doors/bricks: rellena de abajo a arriba (eje Y local)
// - roof: rellena a lo largo de Z local desde los aleros hacia la cumbrera
function getFillTransform(shape, size, pct, rotation) {
  if (pct >= 1) return { scale: [1, 1, 1], offset: [0, 0, 0] }
  if (pct <= 0) return null
  const [, sy, sz] = size
  if (shape === 'roof') {
    const rotX = rotation?.[0] || 0
    const dir = rotX >= 0 ? 1 : -1
    return {
      scale: [1, 1, pct],
      offset: [0, 0, (dir * sz * (1 - pct)) / 2],
    }
  }
  return {
    scale: [1, pct, 1],
    offset: [0, (-sy * (1 - pct)) / 2, 0],
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Pieza individual del salón
// ────────────────────────────────────────────────────────────────────────────
function Piece({
  part,
  woodMap,
  zincMap,
  doorMap,
  windowMap,
  frameMap,
  isHovered,
  isFlash,
  onHover,
  onUnhover,
  onClick,
}) {
  const groupRef = useRef()
  const flashStartRef = useRef(null)

  useEffect(() => {
    if (isFlash) flashStartRef.current = performance.now()
  }, [isFlash])

  useFrame(() => {
    const grp = groupRef.current
    if (!grp) return
    if (flashStartRef.current) {
      const elapsed = performance.now() - flashStartRef.current
      if (elapsed > 5000) {
        flashStartRef.current = null
        grp.scale.set(1, 1, 1)
      } else {
        // Pulso suave (rebote inicial) durante los primeros 2s
        const t = Math.min(1, elapsed / 2000)
        const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.06 * (1 - t)
        grp.scale.set(pulse, pulse, pulse)
      }
    }
  })

  const { color, position, rotation, size, id, shape, fundedPercent } = part
  const pct = Math.max(0, Math.min(1, (fundedPercent || 0) / 100))

  // Si una empresa aportó a esta pieza, mostramos su logo sobre la cara visible.
  // (excepto en piezas marcadas como `excludeCompanyLogo`, ej. el panel de la puerta)
  const companyDonation = useMemo(() => {
    if (part.excludeCompanyLogo) return null
    return (
      (part.donations || []).find((d) => d.isCompany && d.logoDataUrl) || null
    )
  }, [part.donations, part.excludeCompanyLogo])
  const logoTransform = useMemo(
    () => (companyDonation ? getLogoTransform(part) : null),
    [companyDonation, part]
  )
  const isFull = pct >= 1
  const showGhost = pct < 1
  const showFilled = pct > 0
  const fillTransform = useMemo(
    () => getFillTransform(shape, size, pct, rotation),
    [shape, size, pct, rotation]
  )

  // Textura por pieza (clonada para tener su propio repeat por tamaño)
  const textureMap = useMemo(() => {
    const base = WOOD_SHAPES.has(shape)
      ? woodMap
      : ZINC_SHAPES.has(shape)
        ? zincMap
        : DOOR_SHAPES.has(shape)
          ? doorMap
          : WINDOW_SHAPES.has(shape)
            ? windowMap
            : null
    if (!base) return null
    const t = base.clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    const [w, h, d] = size
    if (WOOD_SHAPES.has(shape)) {
      const horizontal = Math.max(w, d)
      const rx = Math.max(0.8, horizontal / 3.5)
      const ry = Math.max(0.8, h / 3.5)
      t.repeat.set(rx, ry)
    } else if (ZINC_SHAPES.has(shape)) {
      t.repeat.set(Math.max(1, w / 4), Math.max(1, d / 4))
    } else if (DOOR_SHAPES.has(shape) || WINDOW_SHAPES.has(shape)) {
      t.repeat.set(1, 1)
    }
    return t
  }, [shape, size, woodMap, zincMap, doorMap, windowMap])

  const isWood = WOOD_SHAPES.has(shape)
  const isZinc = ZINC_SHAPES.has(shape)
  const isWindow = WINDOW_SHAPES.has(shape)
  const isDoor = DOOR_SHAPES.has(shape)

  const materialKey = isWood
    ? 'wood'
    : isZinc
      ? 'zinc'
      : isDoor
        ? 'door'
        : isWindow
          ? 'window'
          : 'solid'

  const filledMaterial = (
    <meshStandardMaterial
      key={materialKey + (isFlash ? '-flash' : '')}
      map={textureMap || null}
      color={isWood ? '#fff1d4' : textureMap ? '#ffffff' : color}
      roughness={isZinc ? 0.55 : isWood ? 0.6 : 0.7}
      metalness={isZinc ? 0.5 : 0.05}
      emissiveMap={isWood && !isFlash ? textureMap : null}
      emissive={
        isFlash
          ? '#10b981'
          : isWood
            ? isHovered
              ? '#fff8e8'
              : '#ffe9c2'
            : isHovered
              ? '#ffffff'
              : '#000000'
      }
      emissiveIntensity={
        isFlash
          ? 0.9
          : isWood
            ? isHovered
              ? 0.75
              : 0.55
            : isHovered
              ? 0.12
              : 0
      }
      transparent={isWindow}
      opacity={isWindow ? 0.95 : 1}
    />
  )

  const ghostMaterial = (
    <meshStandardMaterial
      key={'ghost' + (isFlash ? '-flash' : '')}
      color={isFlash ? '#10b981' : isHovered ? '#fef3c7' : '#ffffff'}
      emissive={isFlash ? '#10b981' : '#000000'}
      emissiveIntensity={isFlash ? 0.6 : 0}
      transparent
      opacity={isFlash ? 0.55 : isHovered ? 0.28 : 0.08}
      roughness={1}
    />
  )

  const ghostEdgeColor = isFlash
    ? '#10b981'
    : isHovered
      ? '#D6312A'
      : '#94a3b8'
  const filledEdgeColor = isFlash
    ? '#10b981'
    : isFull
      ? isHovered
        ? '#134285'
        : '#3f3f46'
      : isHovered
        ? '#D6312A'
        : '#A91F1B'

  const pointerHandlers = {
    onPointerOver: (e) => {
      e.stopPropagation()
      onHover(id)
    },
    onPointerOut: (e) => {
      e.stopPropagation()
      onUnhover(id)
    },
    onClick: (e) => {
      e.stopPropagation()
      onClick()
    },
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Ghost: marco transparente cuando aún no está completa */}
      {showGhost && (
        <mesh {...pointerHandlers}>
          <PieceGeometry shape={shape} size={size} />
          {ghostMaterial}
          <Edges
            scale={isFlash ? 1.04 : 1.001}
            threshold={15}
            color={ghostEdgeColor}
          />
        </mesh>
      )}

      {/* Filled: porción escalada según fundedPercent */}
      {showFilled && fillTransform && (
        <mesh
          position={fillTransform.offset}
          scale={fillTransform.scale}
          {...pointerHandlers}
        >
          <PieceGeometry shape={shape} size={size} />
          {filledMaterial}
          <Edges
            scale={isFlash ? 1.04 : 1.001}
            threshold={15}
            color={filledEdgeColor}
          />
        </mesh>
      )}

      {/* Logo de empresa apadrinadora */}
      {companyDonation && logoTransform && (
        <LogoPlate
          dataUrl={companyDonation.logoDataUrl}
          transform={logoTransform}
          frameMap={frameMap}
        />
      )}
    </group>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tooltip flotante
// ────────────────────────────────────────────────────────────────────────────
function Tooltip({ part, x, y }) {
  const offset = 14
  const style = {
    transform: `translate(${x + offset}px, ${y + offset}px)`,
  }
  const pct = Math.round(part.fundedPercent || 0)
  const donations = part.donations || []
  const isComplete = pct >= 100
  const remaining = Math.max(0, part.price - part.fundedAmount)
  return (
    <div
      style={style}
      className="pointer-events-none absolute top-0 left-0 z-10 max-w-[280px] tp-pop"
    >
      <div className="bg-white/95 backdrop-blur rounded-xl shadow-tp-card border border-stone-200 p-3 text-sm">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`tp-chip ${
              isComplete
                ? 'bg-emerald-100 text-emerald-700'
                : pct > 0
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-tp-blue/10 text-tp-blue'
            }`}
          >
            {isComplete ? '✓ Completa' : pct > 0 ? `${pct}%` : 'Disponible'}
          </span>
          <span className="text-xs text-slate-500 uppercase font-mono">
            {part.id}
          </span>
        </div>
        <p className="font-semibold text-tp-blue-dark leading-tight">
          {part.name}
        </p>

        {/* Mini barra de progreso */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
          <div
            className="h-full bg-tp-red rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {formatCLP(Math.min(part.fundedAmount, part.price))} /{' '}
          {formatCLP(part.price)}
        </p>

        {donations.length > 0 && (
          <div className="mt-2 space-y-1.5 pt-2 border-t border-stone-200">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              {donations.length === 1
                ? 'Aporte de'
                : `Aportes (${donations.length})`}
            </p>
            {donations.slice(0, 3).map((d) => {
              const dpct = Math.min(
                100,
                Math.round((d.amount / part.price) * 100)
              )
              return (
                <div key={d.id} className="text-xs">
                  <p>
                    <strong className="text-tp-red">{d.name}</strong>{' '}
                    <span className="text-slate-500">
                      · {dpct}% ({formatCLP(d.amount)})
                    </span>
                  </p>
                  {d.message && (
                    <p className="text-slate-500 italic">"{d.message}"</p>
                  )}
                </div>
              )
            })}
            {donations.length > 3 && (
              <p className="text-[11px] text-slate-400">
                +{donations.length - 3} aporte(s) más
              </p>
            )}
          </div>
        )}

        {!isComplete && (
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-stone-200">
            Falta {formatCLP(remaining)} · Click para aportar
          </p>
        )}
      </div>
    </div>
  )
}
