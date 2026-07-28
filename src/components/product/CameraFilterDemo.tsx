'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface FilterPreset {
  id: string
  name: string
  description: string
  css: string
  overlay?: string
}

const canonPresets: FilterPreset[] = [
  { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none' },
  { id: 'canon-ccd', name: 'Canon CCD Warm', description: 'Warm highlights, magenta-shifted shadows, soft contrast — the PowerShot signature.', css: 'saturate(1.3) contrast(1.1) brightness(1.05) sepia(0.15) hue-rotate(-5deg)', overlay: 'linear-gradient(180deg, rgba(235,180,150,0.08) 0%, rgba(80,40,60,0.12) 100%)' },
  { id: 'canon-flash', name: 'CCD + Flash', description: 'The classic party shot — blown highlights, warm skin, crushed background.', css: 'saturate(1.4) contrast(1.25) brightness(1.15) sepia(0.1)', overlay: 'radial-gradient(circle at 50% 40%, rgba(255,255,240,0.15) 0%, rgba(20,10,30,0.2) 70%)' },
  { id: 'canon-lowlight', name: 'CCD Low Light', description: 'ISO 400 at night — visible noise, amber streetlight cast, dreamy grain.', css: 'saturate(1.1) contrast(1.2) brightness(0.85) sepia(0.25) hue-rotate(10deg)', overlay: 'linear-gradient(180deg, rgba(200,150,80,0.1) 0%, rgba(30,20,40,0.25) 100%)' },
  { id: 'canon-macro', name: 'CCD Macro Mode', description: 'Close-up — saturated colors, slight vignette.', css: 'saturate(1.5) contrast(1.05) brightness(1.0)', overlay: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.2) 100%)' },
]

const kodakPresets: FilterPreset[] = [
  { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none' },
  { id: 'kodak-warm', name: 'Kodachrome Warm', description: 'The legendary Kodak warmth — golden highlights, rich reds, slightly faded blacks.', css: 'saturate(1.35) contrast(1.05) brightness(1.08) sepia(0.2) hue-rotate(5deg)', overlay: 'linear-gradient(180deg, rgba(255,200,100,0.06) 0%, rgba(60,30,20,0.1) 100%)' },
  { id: 'kodak-faded', name: 'Kodak Faded', description: 'The sun-bleached look — lifted blacks, desaturated blues, warm mids like an old print.', css: 'saturate(0.85) contrast(0.9) brightness(1.1) sepia(0.15)', overlay: 'linear-gradient(180deg, rgba(255,240,200,0.1) 0%, rgba(180,150,120,0.08) 100%)' },
  { id: 'kodak-gold', name: 'Kodak Gold 200', description: 'Punchy, saturated, golden hour all day — the film stock that defined casual photography.', css: 'saturate(1.5) contrast(1.15) brightness(1.05) sepia(0.1) hue-rotate(8deg)', overlay: 'linear-gradient(180deg, rgba(255,180,50,0.08) 0%, rgba(100,50,20,0.1) 100%)' },
  { id: 'kodak-portra', name: 'Portra Skin Tones', description: 'Soft, flattering skin tones with muted backgrounds — portrait perfection.', css: 'saturate(1.1) contrast(0.95) brightness(1.08) sepia(0.08) hue-rotate(3deg)', overlay: 'radial-gradient(circle at 50% 40%, rgba(255,220,180,0.06) 0%, rgba(60,40,50,0.08) 70%)' },
  { id: 'kodak-night', name: 'Kodak Night Flash', description: 'Amber cast, hard flash falloff, the disposable camera party look.', css: 'saturate(1.3) contrast(1.3) brightness(1.1) sepia(0.2) hue-rotate(10deg)', overlay: 'radial-gradient(circle at 50% 35%, rgba(255,240,200,0.2) 0%, rgba(0,0,0,0.3) 65%)' },
]

interface CameraFilterDemoProps {
  brand?: string
  model?: string
}

export function CameraFilterDemo({ brand = 'Canon', model = '' }: CameraFilterDemoProps) {
  const filterPresets = brand === 'Kodak' ? kodakPresets : canonPresets
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeFilter, setActiveFilter] = useState<string>(brand === 'Kodak' ? 'kodak-warm' : 'canon-ccd')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStreaming(true)
        setError('')
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permission to try filters.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((t) => t.stop())
      videoRef.current.srcObject = null
      setStreaming(false)
    }
  }, [])

  useEffect(() => { return () => { stopCamera() } }, [stopCamera])

  const currentPreset = filterPresets.find((f) => f.id === activeFilter) || filterPresets[0]

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    ctx.filter = currentPreset.css === 'none' ? 'none' : currentPreset.css
    ctx.drawImage(videoRef.current, 0, 0)
    // Add grain noise for CCD effect
    if (activeFilter !== 'none') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 15
        data[i] += noise
        data[i + 1] += noise
        data[i + 2] += noise
      }
      ctx.putImageData(imageData, 0, 0)
    }
    // Download
    const link = document.createElement('a')
    link.download = `repixl-filter-${activeFilter}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.9)
    link.click()
  }

  return (
    <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-red"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
        <h3 className="font-display text-sm font-semibold text-repixl-text-light">Try the Look — Live Filter Demo</h3>
      </div>
      <p className="mt-1 text-xs text-repixl-muted">See how {model || `this ${brand} camera`} renders color — applied live to your webcam.</p>

      {/* Filter selector */}
      <div className="mt-4">
        <label htmlFor="filter-select" className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-repixl-muted">Filter Mode</label>
        <select
          id="filter-select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="w-full rounded border border-repixl-muted/20 bg-repixl-bg px-3 py-2 text-sm text-repixl-text-light focus:border-repixl-muted/50 focus:outline-none"
        >
          {filterPresets.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <p className="mt-1 text-[10px] text-repixl-muted">{currentPreset.description}</p>
      </div>

      {/* Video area */}
      <div className="mt-4">
        {!streaming && (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-repixl-muted/30 bg-repixl-bg py-12">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
            <p className="mt-3 text-sm text-repixl-muted">Enable your webcam to preview this camera&apos;s filter</p>
            <button onClick={startCamera} className="mt-4 rounded bg-repixl-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
              Start Camera
            </button>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        )}

        {/* Always render video (hidden when not streaming) */}
        <div className={streaming ? 'relative overflow-hidden rounded-lg bg-black' : 'hidden'}>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg"
              style={{ filter: currentPreset.css === 'none' ? 'none' : currentPreset.css }}
            />
            {currentPreset.overlay && (
              <div className="pointer-events-none absolute inset-0 rounded-lg" style={{ background: currentPreset.overlay }} />
            )}
            <div className="absolute bottom-3 right-3 font-mono text-[10px] text-orange-300/80">
              {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="absolute left-3 top-3 flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-repixl-red" />
              <span className="font-mono text-[9px] text-repixl-red">REC</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={takeSnapshot} className="flex items-center gap-1.5 rounded border border-repixl-muted/20 px-3 py-1.5 text-xs text-repixl-text-light/70 transition-colors hover:border-repixl-muted/50 hover:text-repixl-text-light">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
              Save Snapshot
            </button>
            <button onClick={stopCamera} className="text-xs text-repixl-muted hover:text-repixl-red">Stop Camera</button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for snapshot export */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
