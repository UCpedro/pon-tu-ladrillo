# Pon tu ladrillo · Documentación técnica

Campaña de recaudación para el salón comunitario de la Zona San Rafael (Trabajo País 2026 · UC). La idea central: cada persona aporta lo que pueda y ve su contribución reflejada en un modelo 3D del salón que se va completando en tiempo real.

---

## 1. ¿Qué hace la web?

- Muestra un **modelo 3D** del salón en construcción.
- Cada **pieza** (panel, techo, ventana, puerta, lata de barniz, etc.) tiene un precio y un estado "fantasma" o "donada".
- A medida que la gente dona, las piezas se "encienden" visualmente.
- Permite **donaciones parciales**: si alguien aporta $50.000 a un panel de $150.000, la pieza queda al 33%.
- Si una donación **excede** el costo de una pieza, el sobrante se reparte automáticamente a las siguientes piezas del mismo tipo (lógica de **spillover**).
- El flujo de donación incluye **transferencia bancaria real** + subir comprobante.
- Tiene un formulario de **contacto** que guarda mensajes en la base de datos.
- Próximamente: donaciones de empresas con logo visible sobre la pieza apadrinada (la lógica ya está implementada en el código, solo está oculta en UI).

---

## 2. Stack tecnológico

| Capa | Tecnología | Para qué |
|---|---|---|
| Framework | **React 18** + **Vite** | UI + bundling rápido |
| Estilos | **Tailwind CSS** | Estilos utilitarios (clases tipo `text-tp-red`, `flex`) |
| 3D | **Three.js** + **React Three Fiber** + **drei** | Modelo 3D, materiales, controles de cámara |
| Backend / DB | **Supabase** | PostgreSQL + Storage + Realtime |
| Analytics | **Vercel Analytics** | Conteo de visitas |
| Deploy | **Vercel** | Hosting + CI/CD automático |
| Repo | **GitHub** | Código fuente, auto-deploy a cada push |

---

## 3. Estructura del proyecto

```
SalonTP/
├── public/                    # Archivos estáticos servidos directo
│   ├── logotp.png             # Logo Trabajo País
│   ├── madera.avif            # Textura para paneles de madera
│   ├── zinc.avif              # Textura para el techo
│   ├── puerta.jpg             # Imagen de la puerta principal
│   ├── ventana.png            # Imagen de las ventanas
│   └── marco.png              # Marco decorativo para logos de empresas
│
├── src/
│   ├── main.jsx               # Entry point — carga React + Analytics
│   ├── App.jsx                # Componente raíz · maneja state global
│   ├── index.css              # Tailwind + estilos custom (.tp-card, .tp-btn-*)
│   │
│   ├── data/
│   │   └── donationParts.js   # FUENTE DE LA VERDAD: piezas, precios, tiers
│   │
│   ├── lib/
│   │   ├── supabase.js        # Cliente Supabase (lee env vars)
│   │   ├── donations.js       # Insert/fetch/realtime de donaciones
│   │   └── messages.js        # Insert de mensajes de contacto
│   │
│   ├── utils/
│   │   └── format.js          # formatCLP, formatNumber
│   │
│   └── components/
│       ├── Hero.jsx           # Sección principal: título + 3D
│       ├── SalonModel.jsx     # MODELO 3D — el corazón visual del proyecto
│       ├── ProgressPanel.jsx  # Tarjeta con stats (recaudado, meta, donantes)
│       ├── DonationTiers.jsx  # Las 7 tarjetas de tipos de aporte
│       ├── DonationForm.jsx   # Formulario de donación
│       ├── DonorList.jsx      # Lista "Últimos donantes"
│       ├── TransferModal.jsx  # Modal con datos de transferencia + comprobante
│       ├── ContactSection.jsx # Form de contacto (nombre, email, mensaje)
│       └── CompanyDonationForm.jsx  # (en standby, sección empresas usa otra UI)
│
├── .env.local                 # Variables de entorno LOCAL (no se sube a git)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── index.html
```

---

## 4. Conceptos clave

### 4.1. Pieza ("part")

Cada elemento del modelo 3D es una **pieza** donable. Se define en `src/data/donationParts.js`:

```js
{
  id: 'P3',
  name: 'Panel P3 · Frontal derecho',
  description: 'Panel del frente con ventana hacia la calle.',
  tier: 'panel',                  // categoría: panel | techo | ventana | puerta | barniz | clavos | aislante
  price: 150000,                  // costo total CLP
  shape: 'panel',                 // tipo de geometría 3D
  position: [3.33, 1.6, 3],       // [x, y, z] en el mundo 3D
  rotation: [0, 0, 0],            // rotación en radianes
  size: [3.33, 3, 0.15],          // [ancho, alto, profundidad]
  color: '#c9a06a',               // color cuando no hay textura
  hasWindow: true,                // ¿tiene una ventana encima? (afecta posición del logo)
}
```

**Shapes disponibles:**
- `panel` / `side-panel` → caja de madera con textura
- `gable` / `gable-half` → panel triangular (hastiales del frontón)
- `roof` → plancha de zinc rotada según pendiente
- `door` → caja con textura de puerta
- `window` / `side-window` → caja con textura de ventana
- `paint-can` → cilindro vertical (lata de barniz, decorado)
- `nail-box` → caja con cinta amarilla
- `insulation-roll` → cilindro horizontal (rollo de aislante)

### 4.2. Tier ("categoría")

Agrupa piezas similares. El donante elige un tier (no una pieza específica) en el formulario.

```js
{
  id: 'techo',
  title: 'Pieza techo',
  price: 100000,                  // precio de UNA pieza del tier (referencia)
  color: 'bg-tp-zinc-dark',
  badge: '🏠',
  description: '…'
}
```

### 4.3. Donation ("aporte")

Una donación apunta a una pieza específica. Se guarda en Supabase:

```js
{
  id: 'd-1234567890-abc',
  partId: 'T3',
  name: 'María González',         // nombre público
  message: 'Para que…',
  amount: 50000,
  timestamp: '2026-05-26T…',
  // metadata privada (solo admin la ve en Supabase):
  transfer_first_name: 'María',
  transfer_last_name: 'González',
  transfer_rut: '12.345.678-9',
  receipt_url: 'https://…/comp-….jpg',
  is_company: false,
  logo_url: null,
}
```

### 4.4. Spillover ("derrame")

Si una donación es mayor al espacio que queda en la pieza target:

1. Llena esa pieza al 100%
2. El excedente va a la siguiente pieza disponible del mismo tier
3. Si hay más sobrante, sigue con la próxima pieza
4. Si todas las del tier están llenas, lo último queda registrado como "sobreaporte" en la última pieza

Esto se calcula en `App.jsx` → función `planSpillover()`.

---

## 5. Flujo de una donación

```
Usuario en la web
    ↓
Click en pieza específica del 3D (opcional)
    O click en tarjeta de tier (Ladrillo / Ventana / etc.)
    ↓
Scroll al formulario de donación
    ↓
Completa monto + nombre + mensaje (nombre puede quedar vacío para anónimo)
    ↓
Click "Registrar aporte"
    ↓
TransferModal — PASO 1
    Muestra datos bancarios (UC Itaú)
    Botón "Copiar datos" → portapapeles
    [Siguiente paso]
    ↓
Usuario hace la transferencia desde su banco
    ↓
TransferModal — PASO 2
    Completa: nombre + apellido + RUT + sube comprobante
    Click "Confirmar aporte"
    ↓
App.jsx → handleConfirmTransfer
    1. Sube comprobante a Storage bucket "comprobantes"
    2. planSpillover() → calcula reparto del monto entre piezas
    3. insertDonation() por cada chunk → tabla "donations"
    4. Cierra modal, scroll al modelo 3D, flash verde 5s
    ↓
Supabase Realtime
    Notifica a TODOS los visitantes que hay una donación nueva
    → todos ven la pieza encenderse en vivo
```

---

## 6. Modelo 3D — `SalonModel.jsx`

Es el componente más complejo. Lo desgloso por partes.

### 6.1. Estructura general

```
<Canvas>                          # Lienzo de Three.js
  <SceneLights />                 # Iluminación
  <Ground />                      # Pasto + radier (piso)
  <Suspense>
    <Pieces parts={...} />        # Itera todas las piezas y renderiza una Piece c/u
  </Suspense>
  <OrbitControls />               # Permite girar con el mouse, sin zoom
</Canvas>
<Tooltip />                       # Tooltip flotante (HTML, no 3D)
```

### 6.2. Componente `Piece`

Cada pieza renderiza 2 meshes superpuestas:

1. **Ghost mesh** (visible mientras `pct < 100%`)
   - Casi transparente, marco gris/rojo
   - Representa "lo que falta"
   - Recibe clicks para iniciar donación

2. **Filled mesh** (visible mientras `pct > 0%`)
   - Sólido con textura
   - Escalado y posicionado para que crezca proporcional al % donado
   - Por ejemplo a 50% sólo se ve la mitad inferior

**Lógica de relleno:**
- Paredes / ventanas / puerta / bricks: rellena de abajo hacia arriba (eje Y local)
- Techo: rellena desde los aleros hacia la cumbrera (eje Z local, dirección depende del agua sur/norte)

### 6.3. Texturas

Las texturas se cargan una sola vez via `useTexture` de drei:

- `madera.avif` → paneles de madera (con `emissiveMap` para que se vean más claras)
- `zinc.avif` → techo
- `puerta.jpg` → puerta principal (sin tiling)
- `ventana.png` → ventanas (sin tiling)
- `marco.png` → marco decorativo alrededor de los logos de empresas

Cada pieza clona la textura para tener su propio `repeat`/`offset` según su tamaño.

### 6.4. Decoraciones especiales

Algunos shapes tienen geometría compuesta (varios meshes dentro de un group):

- **paint-can (lata de barniz)**: cuerpo blanco + tapa metálica + reborde + banda marrón + acento celeste (estilo Ceresita)
- **nail-box (caja de clavos)**: caja kraft + cinta amarilla envolvente + etiqueta oscura

Implementadas como componentes `PaintCanDecor` y `NailBoxDecor` dentro del mismo grupo.

### 6.5. Logos de empresas

Cuando una pieza tiene una donación con `is_company: true` y `logo_url`, el componente `LogoPlate` renderiza:

- Un marco de madera (`marco.png`) sobre la cara visible de la pieza
- El logo de la empresa dentro del marco
- Aspect ratio respetado (el logo no se deforma)
- Si la pieza tiene ventana → el logo se posiciona más abajo para no taparla
- Algunas piezas tienen `excludeCompanyLogo: true` y nunca llevan logo (ej: P2 frontal centro porque ahí va la puerta)

---

## 7. Base de datos (Supabase)

### 7.1. Tablas

**`donations`** — cada fila es una donación
| Columna | Tipo | Nota |
|---|---|---|
| id | text PK | generado en el cliente |
| part_id | text | id de la pieza (ej. 'P3-1', 'T5') |
| name | text | nombre público |
| message | text | mensaje opcional |
| amount | integer | CLP |
| is_company | boolean | empresa o particular |
| logo_url | text | URL al logo en Storage |
| receipt_url | text | URL al comprobante |
| transfer_first_name | text | privado |
| transfer_last_name | text | privado |
| transfer_rut | text | privado |
| created_at | timestamptz | auto |

**`messages`** — mensajes del form de contacto
| Columna | Tipo |
|---|---|
| id | text PK |
| name | text |
| email | text |
| message | text |
| created_at | timestamptz |

### 7.2. Storage buckets

- **`logos`** — público — guarda logos de empresas (no usado mientras la sección esté oculta)
- **`comprobantes`** — público — guarda los screenshots/PDFs de transferencias

### 7.3. RLS (Row Level Security)

- **donations**: cualquiera puede INSERT y SELECT (necesario para que la UI muestre las donaciones)
- **messages**: cualquiera puede INSERT, pero **NO SELECT** público (los mensajes se ven solo desde el dashboard de Supabase)

### 7.4. Realtime

La tabla `donations` está publicada en `supabase_realtime`. El cliente se suscribe a INSERTs y actualiza el estado local automáticamente.

---

## 8. Variables de entorno

En `.env.local` (en tu máquina) y en **Vercel → Settings → Environment Variables**:

```
VITE_SUPABASE_URL=https://bdprqcoxurpgsrwicgma.supabase.co
VITE_SUPABASE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

⚠️ `VITE_SUPABASE_KEY` es la **publishable key** (antes "anon key") — segura para exponer en el front. La **service_role key** NUNCA va al front.

---

## 9. Cómo modificar / extender

### 9.1. Cambiar precios de las piezas
Editar `src/data/donationParts.js`. Los precios se definen en cada pieza individualmente.

### 9.2. Cambiar la meta total
En `src/App.jsx` línea ~11:
```js
const DISPLAY_GOAL = 6_000_000
```
La meta es independiente de la suma de las piezas — podés mostrarla en cualquier número.

### 9.3. Agregar piezas nuevas
1. Editar `donationParts.js` y agregar un objeto al array `donationParts` (o crear una factory como `buildVarnishCans()`)
2. Si es un shape nuevo (ej: 'silla'), agregar el case en `PieceGeometry` dentro de `SalonModel.jsx`

### 9.4. Agregar/quitar texturas
- Poner el archivo en `public/`
- Hacer `useTexture.preload('/archivo.png')` al inicio de SalonModel.jsx
- Cargarla en el componente `Pieces` y pasarla como prop a `Piece`

### 9.5. Cambiar los datos bancarios
`src/components/TransferModal.jsx` → constante `TRANSFER_DATA` y `TRANSFER_TEXT`.

### 9.6. Marcar piezas como "vista previa" (decorativas)
Agregar `isPreviewOnly: true` al objeto de la pieza. La pieza:
- Aparece siempre llena visualmente
- No cuenta para `goal`, `donatedParts`, `donorsCount`
- No recibe donaciones reales

---

## 10. Deploy

El sitio se redesploya automático cada vez que hacés `git push` a la rama `main`. Vercel detecta el cambio y:

1. Corre `npm install`
2. Corre `npm run build`
3. Sube el resultado a la CDN
4. Tarda ~1-2 minutos

### Pasos para subir un cambio:
```bash
git add .
git commit -m "descripción breve"
git push
```

Si rompiste algo, Vercel mantiene la última versión funcionando hasta que el build nuevo pase.

---

## 11. Limitaciones conocidas / TODO

- [ ] La sección de empresas está en standby (solo formulario de contacto). La lógica de logo+marco ya está implementada — habría que reactivar el componente `CompanyDonationForm` en App.jsx.
- [ ] No hay autenticación de admin. Los comprobantes los revisa la persona que tiene acceso al dashboard de Supabase.
- [ ] No hay aviso por mail automático cuando llega una donación o mensaje. Se podría agregar con un webhook de Supabase + Resend.
- [ ] No hay paginación de donantes en la lista (se muestran los últimos 12).
- [ ] Los logos de empresas en el modelo 3D pueden chocar visualmente con otras piezas si hay muchos.

---

## 12. Para extender la idea

**Si querés llevar el concepto a otro proyecto:**

- El núcleo es `donationParts.js`. Cambiando ese archivo + las texturas, podés recrear cualquier construcción (capilla, escuela, biblioteca, etc.) con el mismo motor.
- La lógica de spillover y donaciones parciales es **genérica**: funciona para cualquier conjunto de piezas con precios.
- Supabase puede manejar muchos proyectos en un mismo plan free, separados por tabla.
- El stack es 100% gratuito en escalas pequeñas (Vercel + Supabase + Cloudflare).

---

## Contacto del desarrollo

Si tenés dudas técnicas o querés extender el proyecto, escribime a [tu mail aquí].

---

**Última actualización:** mayo 2026
