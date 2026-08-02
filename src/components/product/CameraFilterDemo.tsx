'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { getColorProfile, type ColorProfile, type FilterPreset } from '@/data/colorProfiles'

interface CameraFilterDemoProps {
  brand: string
  model: string
  slug?: string
}

export function CameraFilterDemo({ brand, model, slug }: CameraFilterDemoProps) {
  const profile: ColorProfile = getColorProfile(brand, slug)
  const filterPresets = profile.presets
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeFilter, setActiveFilter] = useState<string>(profile.defaultPreset)
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
    } catch {
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
    const link = document.createElement('a')
    link.download = `repixl-${brand.toLowerCase()}-${activeFilter}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.9)
    link.click()
  }

  return (
    <div>
      <p className="text-xs text-repixl-muted">See how {model} renders color — applied live to your webcam.</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-repixl-text-light/50">Profile: {profile.name}</p>

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
            <p className="mt-3 text-sm text-repixl-muted">Enable your webcam to preview this camera&apos;s color science</p>
            <button onClick={startCamera} className="mt-4 rounded bg-repixl-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
              Start Camera
            </button>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        )}

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

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
