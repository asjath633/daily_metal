import { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { fetchAllMetalPrices, saveUpdateTime, getLastUpdateTime } from '../utils/priceUpdater'

// ─── Types ───────────────────────────────────────────────────────

interface MetalData {
  symbol: string
  name: string
  price: number
  previousPrice: number
  change: number
  changePercent: number
  high24h: number
  low24h: number
  color: string
  bgClass: string
}

interface CurrencyRate {
  code: string
  country: string
  flag: string
  rate: number
}

// ─── Static Data ─────────────────────────────────────────────────

const INITIAL_METALS: MetalData[] = [
  { symbol: 'XAU', name: 'Gold', price: 4691.90, previousPrice: 4719.70, change: -27.80, changePercent: -0.59, high24h: 4783.40, low24h: 4692.40, color: '#FFD700', bgClass: 'bg-[#FFD700]' },
  { symbol: 'XAG', name: 'Silver', price: 83.49, previousPrice: 85.05, change: -1.56, changePercent: -1.81, high24h: 88.00, low24h: 84.15, color: '#C0C0C0', bgClass: 'bg-[#C0C0C0]' },
  { symbol: 'XPT', name: 'Platinum', price: 2074.00, previousPrice: 2111.30, change: -37.30, changePercent: -1.75, high24h: 2167.80, low24h: 2075.70, color: '#E5E4E2', bgClass: 'bg-[#E5E4E2]' },
  { symbol: 'XPD', name: 'Palladium', price: 1499.00, previousPrice: 1519.00, change: -20.00, changePercent: -1.32, high24h: 1540.50, low24h: 1490.00, color: '#b9b9b9', bgClass: 'bg-[#b9b9b9]' },
]

const CURRENCY_RATES: CurrencyRate[] = [
  { code: 'USD', country: 'United States', flag: '🇺🇸', rate: 1.0000 },
  { code: 'EUR', country: 'Eurozone', flag: '🇪🇺', rate: 0.8500 },
  { code: 'GBP', country: 'United Kingdom', flag: '🇬🇧', rate: 0.7350 },
  { code: 'INR', country: 'India', flag: '🇮🇳', rate: 95.3700 },
  { code: 'CNY', country: 'China', flag: '🇨🇳', rate: 6.8100 },
  { code: 'JPY', country: 'Japan', flag: '🇯🇵', rate: 157.1500 },
  { code: 'AUD', country: 'Australia', flag: '🇦🇺', rate: 1.3800 },
  { code: 'CAD', country: 'Canada', flag: '🇨🇦', rate: 1.3700 },
  { code: 'CHF', country: 'Switzerland', flag: '🇨🇭', rate: 0.7780 },
  { code: 'AED', country: 'UAE', flag: '🇦🇪', rate: 3.6700 },
  { code: 'SAR', country: 'Saudi Arabia', flag: '🇸🇦', rate: 3.7500 },
  { code: 'KWD', country: 'Kuwait', flag: '🇰🇼', rate: 0.3080 },
  { code: 'SGD', country: 'Singapore', flag: '🇸🇬', rate: 1.2700 },
  { code: 'BRL', country: 'Brazil', flag: '🇧🇷', rate: 4.9000 },
  { code: 'ZAR', country: 'South Africa', flag: '🇿🇦', rate: 16.4300 },
  { code: 'MXN', country: 'Mexico', flag: '🇲🇽', rate: 17.2000 },
  { code: 'THB', country: 'Thailand', flag: '🇹🇭', rate: 32.3100 },
  { code: 'MYR', country: 'Malaysia', flag: '🇲🇾', rate: 3.9200 },
  { code: 'IDR', country: 'Indonesia', flag: '🇮🇩', rate: 17450.0300 },
  { code: 'PKR', country: 'Pakistan', flag: '🇵🇰', rate: 278.6400 },
]

// ─── Sparkline Generator ─────────────────────────────────────────

function generateSparklineData(basePrice: number, points: number = 24, volatility: number = 0.008): number[] {
  const data: number[] = [basePrice * (1 - (Math.random() - 0.5) * volatility * 2)]
  for (let i = 1; i < points; i++) {
    const change = (Math.random() - 0.52) * volatility * basePrice
    data.push(data[i - 1] + change)
  }
  // Ensure last point matches current price direction
  data[data.length - 1] = basePrice
  return data
}

// ─── Sparkline Component ─────────────────────────────────────────

function Sparkline({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const h = rect.height
    const padding = 4
    const minVal = Math.min(...data)
    const maxVal = Math.max(...data)
    const range = maxVal - minVal || 1

    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: h - padding - ((v - minVal) / range) * (h - padding * 2),
    }))

    // Static draw
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, color + '14')
    gradient.addColorStop(1, color + '00')

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2
      ctx.quadraticCurveTo(cpX, points[i - 1].y, points[i].x, points[i].y)
    }
    ctx.lineTo(points[points.length - 1].x, h)
    ctx.lineTo(points[0].x, h)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2
      ctx.quadraticCurveTo(cpX, points[i - 1].y, points[i].x, points[i].y)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    return undefined
  }, [data, color])

  return <canvas ref={canvasRef} className="w-full" style={{ height }} />
}

// ─── Trend Sparkline Component (larger) ─────────────────────────

function TrendSparkline({ data, color, label }: { data: number[]; color: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = 8
    const minVal = Math.min(...data)
    const maxVal = Math.max(...data)
    const range = maxVal - minVal || 1

    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * (width - padding * 2) + padding,
      y: height - padding - ((v - minVal) / range) * (height - padding * 2),
    }))

    // Static draw for trend sparkline
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, color + '20')
    gradient.addColorStop(1, color + '00')

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2
      ctx.quadraticCurveTo(cpX, points[i - 1].y, points[i].x, points[i].y)
    }
    ctx.lineTo(points[points.length - 1].x, height)
    ctx.lineTo(points[0].x, height)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2
      ctx.quadraticCurveTo(cpX, points[i - 1].y, points[i].x, points[i].y)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    const lastPt = points[points.length - 1]
    ctx.beginPath()
    ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.beginPath()
    ctx.arc(lastPt.x, lastPt.y, 8, 0, Math.PI * 2)
    ctx.fillStyle = color + '30'
    ctx.fill()

    ctx.font = '600 11px "Geist Mono Variable", monospace'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'right'
    ctx.fillText(`$${data[data.length - 1].toFixed(2)}`, width - padding, lastPt.y - 12)
  }, [data, color])

  return (
    <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl p-5">
      <p className="text-[13px] font-medium text-white mb-3">{label}</p>
      <canvas ref={canvasRef} className="w-full" style={{ height: 80 }} />
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-[#666666] font-mono">00:00</span>
        <span className="text-[10px] text-[#666666] font-mono">06:00</span>
        <span className="text-[10px] text-[#666666] font-mono">12:00</span>
        <span className="text-[10px] text-[#666666] font-mono">18:00</span>
        <span className="text-[10px] text-[#666666] font-mono">23:59</span>
      </div>
    </div>
  )
}

// ─── Particle Background ─────────────────────────────────────────

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = window.innerWidth
    let h = window.innerHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    const count = 70

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1.5,
        opacity: Math.random() * 0.3 + 0.2,
      })
    }

    let mouseX = -1000
    let mouseY = -1000

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, w, h)

      particles.forEach((p) => {
        // Mouse repulsion
        const dx = p.x - mouseX
        const dy = p.y - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150 * 0.3
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        p.x += p.vx
        p.y += p.vy

        // Damping
        p.vx *= 0.99
        p.vy *= 0.99

        // Wrap
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(100, 100, 100, ${p.opacity})`
        ctx.fill()
      })

      animId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────

function Sidebar({ metals, lastUpdated }: { metals: MetalData[]; lastUpdated: number }) {
  const navItems = [
    { label: 'Dashboard', active: true },
    { label: 'All Metals', active: false },
    { label: 'Gold', active: false },
    { label: 'Silver', active: false },
    { label: 'Platinum', active: false },
    { label: 'Palladium', active: false },
    { label: 'Price Alerts', active: false },
    { label: 'Settings', active: false },
  ]

  return (
    <aside className="fixed left-0 top-0 w-[248px] h-screen bg-[#1a1a1a] border-r border-[#2a2a2a] z-20 flex flex-col hidden lg:flex">
      {/* Logo */}
      <div className="pt-6 pb-4 px-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#2dd4bf]" />
          <span className="text-sm font-medium text-white tracking-[0.08em]">METALTRACK</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 pt-4">
        {navItems.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`block px-4 py-2.5 rounded-lg text-[13px] transition-colors duration-150 mb-0.5 ${
              item.active
                ? 'bg-[#222222] text-white border-l-2 border-[#2dd4bf]'
                : 'text-[#888888] hover:text-white hover:bg-[#1f1f1f]'
            }`}
          >
            {item.label}
          </a>
        ))}

        {/* Live Metal Tickers */}
        <div className="mt-8 px-4">
          <p className="text-[11px] text-[#666666] uppercase tracking-wider mb-3">Live Prices</p>
          {metals.map((metal) => (
            <div key={metal.symbol} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: metal.color }} />
                <span className="text-[12px] text-[#888888]">{metal.name}</span>
              </div>
              <span className="text-[11px] font-mono text-white">
                ${metal.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#222222]">
        <p className="text-[11px] text-[#666666]">Updated {lastUpdated}s ago</p>
      </div>
    </aside>
  )
}

// ─── Metal Card ──────────────────────────────────────────────────

function MetalCard({ metal, index }: { metal: MetalData; index: number }) {
  const [flashClass, setFlashClass] = useState('')
  const prevPriceRef = useRef(metal.price)
  const sparklineData = useRef(generateSparklineData(metal.price))

  useEffect(() => {
    if (metal.price !== prevPriceRef.current) {
      const isUp = metal.price > prevPriceRef.current
      setFlashClass(isUp ? 'flash-green' : 'flash-red')
      const timer = setTimeout(() => setFlashClass(''), 300)
      prevPriceRef.current = metal.price
      return () => clearTimeout(timer)
    }
  }, [metal.price])

  const isPositive = metal.change >= 0
  const elementSymbols: Record<string, string> = { Gold: 'Au', Silver: 'Ag', Platinum: 'Pt', Palladium: 'Pd' }

  return (
    <div
      className={`bg-[#181818] border border-[#2a2a2a] rounded-xl p-6 transition-all duration-200 hover:border-opacity-40 ${flashClass}`}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = metal.color + '66'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold text-[#0f0f0f]" style={{ backgroundColor: metal.color }}>
          {elementSymbols[metal.name]}
        </div>
        <div>
          <span className="text-sm font-medium text-white">{metal.name}</span>
          <span className="text-[11px] font-mono text-[#666666] ml-2">{metal.symbol}</span>
        </div>
      </div>

      {/* Price */}
      <div className="mt-3">
        <span className="text-[28px] font-mono font-semibold text-white tracking-tight">
          ${metal.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Change */}
      <div className="flex items-center gap-1 mt-1">
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-[#2dd4bf]" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-[#f87171]" />
        )}
        <span className={`text-[13px] font-medium ${isPositive ? 'text-[#2dd4bf]' : 'text-[#f87171]'}`}>
          {isPositive ? '+' : ''}{metal.change.toFixed(2)} ({isPositive ? '+' : ''}{metal.changePercent.toFixed(2)}%)
        </span>
      </div>

      {/* Sparkline */}
      <div className="mt-4">
        <Sparkline data={sparklineData.current} color={metal.color} />
      </div>

      {/* High/Low */}
      <div className="flex justify-between mt-3">
        <span className="text-[11px] font-mono text-[#666666]">
          24h High: ${metal.high24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-[11px] font-mono text-[#666666]">
          24h Low: ${metal.low24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  )
}

// ─── Comparison Table ────────────────────────────────────────────

function ComparisonTable({ metals }: { metals: MetalData[] }) {
  const formatPrice = (price: number) => {
    if (price >= 1000000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
    if (price >= 100000) return price.toLocaleString('en-US', { maximumFractionDigits: 1 })
    if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
    return price.toFixed(2)
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-white mb-4">Global Price Comparison</h2>
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="bg-[#1f1f1f] px-6 py-3.5 grid grid-cols-[1fr_80px_1fr_1fr_1fr_1fr_100px] gap-4">
          <span className="text-[12px] font-mono font-medium text-[#888888] uppercase tracking-wider">Country</span>
          <span className="text-[12px] font-mono font-medium text-[#888888] uppercase tracking-wider">Currency</span>
          <span className="text-[12px] font-mono font-medium text-[#888888] uppercase tracking-wider text-right">Gold (1 oz)</span>
          <span className="text-[12px] font-mono font-medium text-[#888888] uppercase tracking-wider text-right">Silver (1 oz)</span>
          <span className="text-[12px] font-mono font-medium text-[#888888] uppercase tracking-wider text-right">Platinum (1 oz)</span>
          <span className="text-[12px] font-mono font-medium text-[#888888] uppercase tracking-wider text-right">Palladium (1 oz)</span>
          <span className="text-[12px] font-mono font-medium text-[#888888] uppercase tracking-wider text-right">Updated</span>
        </div>

        {/* Table Rows */}
        <div className="max-h-[480px] overflow-y-auto">
          {CURRENCY_RATES.map((currency, i) => {
            const goldPrice = metals[0].price * currency.rate
            const silverPrice = metals[1].price * currency.rate
            const platinumPrice = metals[2].price * currency.rate
            const palladiumPrice = metals[3].price * currency.rate

            return (
              <div
                key={currency.code}
                className={`px-6 py-3.5 grid grid-cols-[1fr_80px_1fr_1fr_1fr_1fr_100px] gap-4 transition-colors duration-100 hover:bg-[#222222] ${
                  i % 2 === 0 ? 'bg-[#181818]' : 'bg-[#1a1a1a]'
                }`}
                style={{
                  borderBottom: '1px solid #222222',
                }}
              >
                <span className="text-[13px] font-mono text-white">{currency.flag} {currency.country}</span>
                <span className="text-[13px] font-mono text-[#666666]">{currency.code}</span>
                <span className="text-[13px] font-mono text-white text-right">
                  {currency.code === 'USD' ? '$' : ''}{formatPrice(goldPrice)}
                  {currency.code !== 'USD' ? ` ${currency.code}` : ''}
                </span>
                <span className="text-[13px] font-mono text-white text-right">
                  {currency.code === 'USD' ? '$' : ''}{formatPrice(silverPrice)}
                  {currency.code !== 'USD' ? ` ${currency.code}` : ''}
                </span>
                <span className="text-[13px] font-mono text-white text-right">
                  {currency.code === 'USD' ? '$' : ''}{formatPrice(platinumPrice)}
                  {currency.code !== 'USD' ? ` ${currency.code}` : ''}
                </span>
                <span className="text-[13px] font-mono text-white text-right">
                  {currency.code === 'USD' ? '$' : ''}{formatPrice(palladiumPrice)}
                  {currency.code !== 'USD' ? ` ${currency.code}` : ''}
                </span>
                <span className="text-[11px] font-sans text-[#666666] text-right">Just now</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────

export default function Home() {
  const [metals, setMetals] = useState<MetalData[]>(INITIAL_METALS)
  const [lastUpdated, setLastUpdated] = useState(0)
  const [isLive] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch prices from live API (real-time market data)
  const fetchPrices = useCallback(async () => {
    try {
      const priceData = await fetchAllMetalPrices()
      saveUpdateTime()

      setMetals((prev) =>
        prev.map((m) => {
          let newPrice = 0
          let newChange = 0
          let newPrevious = 0
          let newHigh = 0
          let newLow = 0

          if (m.symbol === 'XAU') {
            newPrice = priceData.gold
            newChange = priceData.goldChange
            newPrevious = priceData.goldPrevious
            newHigh = priceData.goldHigh
            newLow = priceData.goldLow
          } else if (m.symbol === 'XAG') {
            newPrice = priceData.silver
            newChange = priceData.silverChange
            newPrevious = priceData.silverPrevious
            newHigh = priceData.silverHigh
            newLow = priceData.silverLow
          } else if (m.symbol === 'XPT') {
            newPrice = priceData.platinum
            newChange = priceData.platinumChange
            newPrevious = priceData.platinumPrevious
            newHigh = priceData.platinumHigh
            newLow = priceData.platinumLow
          } else if (m.symbol === 'XPD') {
            newPrice = priceData.palladium
            newChange = priceData.palladiumChange
            newPrevious = priceData.palladiumPrevious
            newHigh = priceData.palladiumHigh
            newLow = priceData.palladiumLow
          }

          if (newPrice && newPrice !== m.price) {
            const changePercent = newPrevious ? (newChange / newPrevious) * 100 : 0
            return {
              ...m,
              price: newPrice,
              previousPrice: newPrevious,
              change: newChange,
              changePercent,
              high24h: newHigh,
              low24h: newLow,
            }
          }
          return m
        })
      )
      setLastUpdated(0)
    } catch (error) {
      console.error('Error fetching prices from API:', error)
      // Keep existing prices on API error
    }
  }, [])

  // Setup real-time polling every 30 seconds
  useEffect(() => {
    if (isLive) {
      // Fetch prices immediately on load
      fetchPrices()
      
      // Update every 30 seconds (30000 ms) - can change to 60000 for 1 minute
      intervalRef.current = setInterval(fetchPrices, 30000)
      
      // Update last updated counter every second
      counterRef.current = setInterval(() => {
        setLastUpdated((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (counterRef.current) clearInterval(counterRef.current)
    }
  }, [isLive, fetchPrices])

  const refreshData = () => {
    setLastUpdated(0)
    fetchPrices()
  }

  // Generate trend data for sparklines section
  const trendData = metals.map((m) => ({
    label: `${m.name} (${m.symbol}/USD)`,
    color: m.color,
    data: generateSparklineData(m.price, 50, 0.012),
  }))

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans">
      <ParticleBackground />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#1a1a1a] border-b border-[#2a2a2a] z-30 flex items-center px-4">
        <Activity className="w-5 h-5 text-[#2dd4bf] mr-2" />
        <span className="text-sm font-medium tracking-[0.08em]">METALTRACK</span>
      </div>

      {/* Sidebar */}
      <Sidebar metals={metals} lastUpdated={lastUpdated} />

      {/* Main Content */}
      <main className="lg:ml-[248px] pt-14 lg:pt-0 relative z-10">
        {/* Header Section */}
        <section className="px-6 lg:px-12 pt-6 lg:pt-10 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl lg:text-[48px] font-medium text-white tracking-tight leading-tight">
                Precious Metals
              </h1>
              <p className="text-[15px] text-[#888888] mt-1">
                Real-time price comparison across global markets
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Live Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#181818] border border-[#2a2a2a] rounded-lg">
                <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse-dot" />
                <span className="text-[11px] font-medium text-white tracking-[0.06em] uppercase">Live</span>
              </div>
              {/* Refresh Button */}
              <button
                onClick={refreshData}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-[#222222] border border-[#2a2a2a] rounded-lg text-[12px] text-[#888888] hover:text-white hover:border-[#3a3a3a] transition-all duration-200 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex gap-3 mt-6 overflow-x-auto pb-2 scrollbar-hide">
            {metals.map((metal) => {
              const isPositive = metal.change >= 0
              return (
                <div
                  key={metal.symbol}
                  className="bg-[#181818] border border-[#2a2a2a] rounded-lg px-6 py-4 min-w-[180px] flex-shrink-0 transition-all duration-200 hover:border-[#3a3a3a]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: metal.color }} />
                    <span className="text-[12px] text-[#888888]">{metal.name}</span>
                  </div>
                  <div className="text-lg font-mono font-semibold text-white">
                    ${metal.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[12px] font-medium ${isPositive ? 'text-[#2dd4bf]' : 'text-[#f87171]'}`}>
                    {isPositive ? '+' : ''}{metal.changePercent.toFixed(2)}%
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Metal Price Cards */}
        <section className="px-6 lg:px-12 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {metals.map((metal, i) => (
              <MetalCard key={metal.symbol} metal={metal} index={i} />
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="px-6 lg:px-12 mt-8">
          <ComparisonTable metals={metals} />
        </section>

        {/* Trend Sparklines */}
        <section className="px-6 lg:px-12 mt-8 pb-8">
          <h2 className="text-lg font-medium text-white mb-4">24-Hour Price Trends</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {trendData.map((t) => (
              <TrendSparkline key={t.label} data={t.data} color={t.color} label={t.label} />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 lg:px-12 py-6 border-t border-[#222222]">
          <p className="text-[11px] text-[#666666] text-center">
            Data provided by Gold-API.com &middot; Updated every 5 seconds &middot; All prices in USD per troy ounce unless otherwise specified
          </p>
        </footer>
      </main>
    </div>
  )
}
