'use client'

import { useEffect, useRef, useState } from 'react'

// sample listings (made up, labeled as sample on the page)
const listings = [
  { x: 31, y: 29, area: 'Echo Park', score: 84, price: 800, type: 'Private room', commute: '4 min to work', dates: 'Jun - Aug' },
  { x: 38, y: 48, area: 'Silver Lake', score: 91, price: 950, type: 'Shared room', commute: '12 min to work', dates: 'Jun - Aug' },
  { x: 50, y: 41, area: 'Downtown', score: 96, price: 1250, type: 'Studio', commute: '6 min to work', dates: 'May - Aug' },
  { x: 53, y: 21, area: 'Chinatown', score: 78, price: 900, type: 'Private room', commute: '10 min to work', dates: 'Jun - Sep' },
  { x: 60, y: 31, area: 'The Cove', score: 89, price: 1100, type: '2 bed, 1 spot open', commute: '8 min to work', dates: 'Jun - Aug' },
  { x: 65, y: 47, area: 'Arts District', score: 82, price: 1300, type: 'Studio', commute: '9 min to work', dates: 'Jun - Aug' },
  { x: 52, y: 55, area: 'Historic Core', score: 93, price: 1050, type: 'Private room', commute: '5 min to work', dates: 'May - Aug' },
  { x: 26, y: 59, area: 'Koreatown', score: 74, price: 750, type: 'Shared room', commute: '15 min to work', dates: 'Jun - Aug' },
  { x: 16, y: 73, area: 'Mid-Wilshire', score: 71, price: 850, type: 'Private room', commute: '18 min to work', dates: 'Jun - Aug' },
  { x: 52, y: 85, area: 'Pico-Union', score: 68, price: 700, type: 'Shared room', commute: '14 min to work', dates: 'Jun - Aug' },
  { x: 71, y: 59, area: 'Boyle Heights', score: 80, price: 800, type: 'Private room', commute: '11 min to work', dates: 'Jun - Sep' },
  { x: 85, y: 50, area: 'Lincoln Heights', score: 76, price: 775, type: '3 bed, 1 spot open', commute: '16 min to work', dates: 'Jun - Aug' },
  { x: 84, y: 69, area: 'El Sereno', score: 65, price: 725, type: 'Private room', commute: '20 min to work', dates: 'Jun - Aug' },
]

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.5

// Subtle score (sample): green for great matches, warmer as the score drops.
// Every color keeps white text above 4.5:1 contrast.
function scoreColor(score: number) {
  if (score >= 90) return '#2E7D4F'
  if (score >= 80) return '#4F7F2F'
  if (score >= 70) return '#7A6A12'
  return '#A35F33'
}

// ---------------------------------------------------------------------------
// Regional map background (lakes, rivers, forests, winding roads, towns).
// Colors: off-white land, pale blue for green areas and towns, #C9DBEA blue for
// water and roads, #EEF3F8 for town street grids, navy text and pins. Drawn in a 980 x 520 box; only the middle 400 units of height
// are visible, so keep important things between y=60 and y=460.
// Listing coordinates map to this box as x*9.8, 60 + y*4.
// ---------------------------------------------------------------------------
const LAND = '#FDFBF7'
const FOREST = '#EAF1F8'
const WATER = '#C9DBEA'

/*const FORESTS = [
  'M170 220 C210 200 280 210 300 240 C320 280 280 320 230 318 C180 320 150 280 170 220 Z',
  'M420 80 C480 60 570 70 600 100 C620 140 560 160 500 150 C450 160 410 130 420 80 Z',
  'M740 200 C780 180 860 185 890 215 C905 245 870 262 820 258 C770 262 735 235 740 200 Z',
  'M70 410 C110 390 180 395 200 420 C205 445 150 458 110 452 C75 448 55 430 70 410 Z',
]
const TOWNS = [
  'M440 150 C480 130 600 140 630 180 C650 230 620 290 570 310 C520 320 450 300 430 250 C420 210 425 170 440 150 Z',
  'M735 265 C770 250 850 258 870 290 C880 330 840 355 790 352 C745 348 720 310 735 265 Z',
]*/ 
const LAKES = [
  'M330 380 C320 350 360 330 400 338 C440 330 480 350 470 385 C480 420 430 440 395 430 C360 440 335 415 330 380 Z',
  'M120 120 C110 90 150 70 190 80 C230 70 250 100 235 130 C240 155 200 165 170 155 C140 160 125 145 120 120 Z',
  'M790 110 C790 85 830 75 860 88 C895 85 905 115 885 135 C870 155 830 150 810 140 C792 135 788 125 790 110 Z',
  'M820 400 C815 380 850 368 880 376 C915 372 940 395 925 418 C910 440 860 442 838 430 C822 424 820 412 820 400 Z',
]
// [cx, cy, rx, ry, rotation]
const PONDS = [
  [650, 130, 14, 8, 30],
  [90, 300, 16, 9, -10],
  [430, 110, 12, 7, 0],
  [920, 260, 18, 10, -20],
  [60, 200, 10, 6, 20],
  [700, 440, 14, 8, -15],
]
const RIVER = 'M560 40 C600 90 540 130 600 170 S680 190 720 230 S800 250 840 300 S900 360 980 380'
const MINOR_ROADS = [
  'M0 230 C60 240 110 215 170 230',
  'M300 130 C340 160 330 200 370 230',
  'M640 120 C660 160 700 170 720 210',
  'M880 280 C900 320 930 340 980 330',
  'M330 440 C390 460 450 450 510 470',
  'M120 60 C140 110 130 160 160 200',
  'M760 380 C790 410 830 420 860 460',
  'M560 330 C580 380 560 420 590 460',
]
const SECONDARY_ROADS = [
  'M0 150 C90 160 160 190 240 180 S360 150 420 130',
  'M420 130 C520 100 650 120 720 100 S860 60 990 70',
  'M610 300 C640 360 640 410 700 450',
  'M230 360 C200 400 150 420 90 470',
  'M720 230 C780 210 840 220 900 200 S960 170 990 160',
]
const HIGHWAYS = [
  'M-10 440 C120 420 220 380 330 330 S520 300 600 300 S760 330 860 360 S940 380 990 372',
  'M470 40 C490 120 450 180 500 240 S470 340 520 400 S500 450 510 480',
]
//const BOUNDARIES = ['M50 40 C70 150 40 260 90 330 S70 440 100 500', 'M900 40 C880 140 920 260 890 340 S930 440 910 500']

function Shield({ x, y, n }: { x: number; y: number; n: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-13" y="-9" width="26" height="18" rx="5" fill="#FFFFFF" stroke="#1E2B44" strokeWidth="1.6" />
      <text textAnchor="middle" y="3.5" fontSize="10" fontWeight="800" fill="#1E2B44">
        {n}
      </text>
    </g>
  )
}

function Poi({ x, y, color, label, glyph }: { x: number; y: number; color: string; label: string; glyph: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="8" fill={color} stroke="#FFFFFF" strokeWidth="2" />
      <path d={glyph} transform={`translate(${x} ${y})`} fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <text x={x + 13} y={y + 4} fontSize="10" fontWeight="600" fill={color} stroke={LAND} strokeWidth="3" strokeLinejoin="round" paintOrder="stroke">
        {label}
      </text>
    </g>
  )
}

function RoadName({ id, offset, children }: { id: string; offset: string; children: string }) {
  return (
    <text fontSize="9.5" fontWeight="600" letterSpacing="0.6" fill="#6B7F96" stroke={LAND} strokeWidth="3" strokeLinejoin="round" paintOrder="stroke" dy="3">
      <textPath href={`#${id}`} startOffset={offset}>
        {children}
      </textPath>
    </text>
  )
}

function StreetMap() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 980 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="townGrid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M14 0V14H0" fill="none" stroke="#D3DDE9" strokeWidth="1" />
        </pattern>
        <path id="rdLake" d={SECONDARY_ROADS[0]} />
        <path id="rdPine" d={SECONDARY_ROADS[1]} />
        <path id="rdMill" d={SECONDARY_ROADS[2]} />
        <path id="rvEcho" d={RIVER} />
      </defs>

      {/* land */}
      <rect width="980" height="520" fill={LAND} />


      {/* lakes, ponds and the river */}
      {LAKES.map((d) => (
        <path key={d} d={d} fill={WATER} stroke="#B9D1E6" strokeWidth="1.2" />
      ))}
      {PONDS.map(([cx, cy, rx, ry, rot]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill={WATER} />
      ))}
      <path d={RIVER} fill="none" stroke={WATER} strokeWidth="4.5" strokeLinecap="round" />



      {/* minor roads */}
      <g fill="none" stroke="#D3DBE5" strokeWidth="1.8" strokeLinecap="round">
        {MINOR_ROADS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* secondary roads: white casing, gray-blue fill */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {SECONDARY_ROADS.map((d) => (
          <path key={`c${d}`} d={d} stroke="#FFFFFF" strokeWidth="6.5" />
        ))}
        {SECONDARY_ROADS.map((d) => (
          <path key={`f${d}`} d={d} stroke="#B9C8D8" strokeWidth="3.5" />
        ))}
      </g>

      {/* highways: darker edge, blue fill */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {HIGHWAYS.map((d) => (
          <path key={`c${d}`} d={d} stroke="#9FB9D1" strokeWidth="9" />
        ))}
        {HIGHWAYS.map((d) => (
          <path key={`f${d}`} d={d} stroke={WATER} strokeWidth="5.5" />
        ))}
      </g>

      {/* route shields */}
      <Shield x={330} y={330} n="327" />
      <Shield x={600} y={300} n="323" />
      <Shield x={481} y={100} n="5" />

      {/* road and river names */}
      <RoadName id="rdLake" offset="14%">Lakeshore Rd</RoadName>
      <RoadName id="rdPine" offset="30%">Pine Ridge Rd</RoadName>
      <RoadName id="rdMill" offset="8%">Mill Rd</RoadName>
      <text fontSize="9.5" fontStyle="italic" fill="#5C7FA0" dy="-4">
        <textPath href="#rvEcho" startOffset="9%">Echo River</textPath>
      </text>

      {/* lake names */}
      <text transform="rotate(-12 400 385)" x="400" y="389" textAnchor="middle" fontSize="12" fontStyle="italic" fill="#5C7FA0">Silver Lake</text>
      <text transform="rotate(-18 180 118)" x="180" y="122" textAnchor="middle" fontSize="12" fontStyle="italic" fill="#5C7FA0">Echo Lake</text>
      <text transform="rotate(8 840 112)" x="840" y="116" textAnchor="middle" fontSize="11" fontStyle="italic" fill="#5C7FA0">Mirror Lake</text>

      {/* park name */}
      <text x="530" y="110" textAnchor="middle" fontSize="10" fill="#6B7F96">Domaine Park</text>

      {/* points of interest */}
      <Poi x={130} y={150} color="#2E7DB5" label="Lakeside Lodge" glyph="M-4 3 V-3 M-4 0 H4 V3" />
      
      <Poi x={880} y={205} color="#5C7FA0" label="Overlook" glyph="M-4 -2 H4 V3 H-4 Z M-1 -2 L0 -4 H1 L2 -2" />
      <Poi x={850} y={425} color="#2E7DB5" label="Pine Inn" glyph="M-4 3 V-3 M-4 0 H4 V3" />
      <Poi x={215} y={425} color="#1E2B44" label="Camping" glyph="M-4 3 L0 -3 L4 3 Z" />

      {/* neighborhood names under each pin */}
      {listings.map((l) => (
        <text
          key={l.area}
          x={l.x * 9.8}
          y={60 + l.y * 4 + 17}
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="700"
          letterSpacing="1.4"
          fill="#4A5A75"
          stroke={LAND}
          strokeWidth="3"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {l.area.toUpperCase()}
        </text>
      ))}
    </svg>
  )
}

// The office everyone is commuting to. Listing commute times are measured to here.
const OFFICE = { x: 43, y: 26 }

function OfficePin({ px, py, hidden }: { px: number; py: number; hidden: boolean }) {
  return (
    <div
      role="img"
      tabIndex={hidden ? -1 : 0}
      aria-label="Your office"
      className={`group absolute z-20 -translate-x-1/2 -translate-y-full transition-[left,top,opacity] duration-300 ease-out hover:z-30 focus:z-30 focus:outline-none ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ left: `${px}%`, top: `${py}%` }}
    >
      {/* pulse at the exact spot */}
      <span className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 animate-ping rounded-full bg-[#2E7DB5]/50" />
      <svg
        className="relative block origin-bottom drop-shadow-[0_8px_12px_rgba(30,43,68,0.4)] transition-transform duration-200 group-hover:scale-110 group-focus:scale-110"
        width="38"
        height="46"
        viewBox="0 0 44 54"
        aria-hidden="true"
      >
        <path d="M22 2 C11 2 3 10 3 21 C3 35 22 52 22 52 C22 52 41 35 41 21 C41 10 33 2 22 2 Z" fill="#2E7DB5" stroke="#FFFFFF" strokeWidth="3" />
        {/* office building */}
        <rect x="14" y="11" width="16" height="21" rx="2" fill="#FFFFFF" />
        <g fill="#2E7DB5">
          <rect x="17" y="15" width="3" height="3" />
          <rect x="24" y="15" width="3" height="3" />
          <rect x="17" y="21" width="3" height="3" />
          <rect x="24" y="21" width="3" height="3" />
          <rect x="20" y="27" width="4" height="5" />
        </g>
      </svg>
      <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2E7DB5] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow-md">
        Your office
      </span>
      <div className="pointer-events-none invisible absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 rounded-[14px] bg-white p-3 text-left text-xs text-[#1E2B44] opacity-0 shadow-[0_24px_50px_-20px_rgba(30,43,68,0.45)] transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
        <span className="block text-[13px] font-bold">Your office</span>
        <span className="mt-0.5 block text-[#4A5A75]">Commute times on each home are measured to here.</span>
      </div>
    </div>
  )
}

function Pin({ item, px, py, hidden }: { item: (typeof listings)[number]; px: number; py: number; hidden: boolean }) {
  const below = py < 50
  const hAlign = px < 24 ? 'left-0' : px > 76 ? 'right-0' : 'left-1/2 -translate-x-1/2'

  return (
    <button
      type="button"
      tabIndex={hidden ? -1 : 0}
      className={`group absolute z-10 -translate-x-1/2 -translate-y-full transition-[left,top,opacity] duration-300 ease-out hover:z-30 focus:z-30 focus:outline-none ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ left: `${px}%`, top: `${py}%` }}
      aria-label={`Sample listing: ${item.area}, ${item.type}, $${item.price} per month, Subtle score ${item.score}`}
    >
      {/* house-shaped pin */}
      <svg
        className="origin-bottom drop-shadow-[0_6px_10px_rgba(30,43,68,0.35)] transition-transform duration-200 group-hover:scale-125 group-focus:scale-125"
        width="30"
        height="33"
        viewBox="0 0 44 48"
        aria-hidden="true"
      >
        <path
          className="fill-[#1E2B44] transition-colors group-hover:fill-[#C27A4A] group-focus:fill-[#C27A4A]"
          d="M22 2 L42 18 V36 a4 4 0 0 1 -4 4 H28 L22 47 L16 40 H6 a4 4 0 0 1 -4 -4 V18 Z"
        />
        <rect x="17" y="22" width="10" height="12" rx="2" fill="#FFFFFF" />
      </svg>

      <div
        className={`pointer-events-none invisible absolute w-64 rounded-[18px] bg-white p-4 text-left text-xs text-[#1E2B44] opacity-0 shadow-[0_24px_50px_-20px_rgba(30,43,68,0.45)] transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 ${hAlign} ${
          below ? 'top-full mt-2' : 'bottom-full mb-10'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-[0_6px_14px_-6px_rgba(30,43,68,0.6)]"
            style={{ backgroundColor: scoreColor(item.score) }}
            aria-label={`Subtle score ${item.score} out of 100`}
          >
            {item.score}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-bold">{item.area}</span>
              <span className="text-sm font-bold text-[#A35F33]">${item.price.toLocaleString()}/mo</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A5A75]">Subtle score</span>
          </span>
        </div>
        <p className="mt-1 text-[13px] text-[#4A5A75]">
          {item.type} · {item.commute}
        </p>
        <span className="mt-2.5 inline-block rounded-full bg-[#1E2B44] px-2.5 py-1 text-[11px] font-bold text-white">
          Available {item.dates}
        </span>
        <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A5A75]">Sample listing</span>
      </div>
    </button>
  )
}

export default function Section2() {
  const [seen, setSeen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const zoomIn = () => setZoom((z) => Math.min(+(z + ZOOM_STEP).toFixed(1), MAX_ZOOM))
  const zoomOut = () => setZoom((z) => Math.max(+(z - ZOOM_STEP).toFixed(1), MIN_ZOOM))

  const reveal = seen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'

  return (
    <section id="how" ref={ref} className="relative scroll-mt-24 px-4 pb-24 pt-28 md:px-8">
      <div className={`mx-auto max-w-3xl text-center transition-all duration-1000 ease-out ${reveal}`}>
        <h2 className="font-[family-name:var(--font-serif)] text-5xl font-medium leading-[1.02] tracking-[-0.02em] md:text-[64px]">
          Let subtle do the work.
        </h2>
        <p className="mt-2 font-[family-name:var(--font-serif)] text-[34px] italic text-[#2F4161]">So you can do yours.</p>
        <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-[#4A5A75]">
          Subtle makes moving somewhere new for an internship or summer program feel easier, safer, and more social.
        </p>
      </div>

      {/* commute map card */}
      <div
        className={`mx-auto mt-14 max-w-[1000px] rounded-[32px] border border-white bg-white/85 px-3 pt-3 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl transition-all delay-200 duration-1000 ease-out ${reveal}`}
      >
        <div className="relative aspect-[980/400] overflow-hidden rounded-3xl bg-[#FDFBF7]">
          {/* zoomable background (pins are separate so they keep their size) */}
          <div
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoom})`, transformOrigin: '50% 50%' }}
          >
            <StreetMap />
          </div>

          {listings.map((item) => {
            const px = 50 + (item.x - 50) * zoom
            const py = 50 + (item.y - 50) * zoom
            const hidden = px < 3 || px > 97 || py < 8 || py > 97
            return <Pin key={`${item.x}-${item.y}`} item={item} px={px} py={py} hidden={hidden} />
          })}

          <OfficePin
            px={50 + (OFFICE.x - 50) * zoom}
            py={50 + (OFFICE.y - 50) * zoom}
            hidden={50 + (OFFICE.x - 50) * zoom < 3 || 50 + (OFFICE.x - 50) * zoom > 97 || 50 + (OFFICE.y - 50) * zoom < 8 || 50 + (OFFICE.y - 50) * zoom > 97}
          />

          <div className="absolute right-3.5 top-3.5 z-20 flex flex-col rounded-[14px] border border-white bg-white/85 p-1 text-[#1E2B44] shadow-sm backdrop-blur">
            <button type="button" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" className="h-11 w-11 rounded-[10px] text-xl hover:bg-[#EEF3F8] disabled:opacity-40">
              +
            </button>
            <button type="button" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" className="h-11 w-11 rounded-[10px] text-xl hover:bg-[#EEF3F8] disabled:opacity-40">
              −
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-2.5 pb-4 pt-3.5 text-[13px] font-semibold">
          <span></span>
          <span className="text-[#4A5A75]">Hover over a home · Sample listings</span>
        </div>
      </div>
    </section>
  )
} 
