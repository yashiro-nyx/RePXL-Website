export interface FilterPreset {
  id: string
  name: string
  description: string
  css: string
  overlay?: string
}

export interface ColorProfile {
  name: string
  description: string
  warmth: number
  fade: number
  saturation: number
  presets: FilterPreset[]
  defaultPreset: string
}

/**
 * Brand-level color profiles based on real CCD color science characteristics.
 * Each brand's early-2000s digicams had distinctive rendering signatures.
 */
const brandProfiles: Record<string, ColorProfile> = {
  Canon: {
    name: 'PowerShot CCD Warm',
    description: 'Warm highlights, magenta-shifted shadows, soft contrast — the PowerShot signature.',
    warmth: 0.15,
    fade: 0.05,
    saturation: 1.15,
    defaultPreset: 'canon-ccd',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none' },
      { id: 'canon-ccd', name: 'PowerShot CCD Warm', description: 'Warm highlights, magenta-shifted shadows, soft contrast — the PowerShot signature.', css: 'saturate(1.3) contrast(1.1) brightness(1.05) sepia(0.15) hue-rotate(-5deg)', overlay: 'linear-gradient(180deg, rgba(235,180,150,0.08) 0%, rgba(80,40,60,0.12) 100%)' },
      { id: 'canon-flash', name: 'CCD + Flash', description: 'The classic party shot — blown highlights, warm skin, crushed background.', css: 'saturate(1.4) contrast(1.25) brightness(1.15) sepia(0.1)', overlay: 'radial-gradient(circle at 50% 40%, rgba(255,255,240,0.15) 0%, rgba(20,10,30,0.2) 70%)' },
      { id: 'canon-lowlight', name: 'CCD Low Light', description: 'ISO 400 at night — visible noise, amber streetlight cast, dreamy grain.', css: 'saturate(1.1) contrast(1.2) brightness(0.85) sepia(0.25) hue-rotate(10deg)', overlay: 'linear-gradient(180deg, rgba(200,150,80,0.1) 0%, rgba(30,20,40,0.25) 100%)' },
      { id: 'canon-macro', name: 'CCD Macro Mode', description: 'Close-up — saturated colors, slight vignette, shallow-focus feel.', css: 'saturate(1.5) contrast(1.05) brightness(1.0)', overlay: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.2) 100%)' },
    ],
  },
  Kodak: {
    name: 'Kodachrome-adjacent',
    description: 'Warm, slightly faded CCD color — Kodak\'s signature golden tone.',
    warmth: 0.35,
    fade: 0.2,
    saturation: 1.1,
    defaultPreset: 'kodak-warm',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none' },
      { id: 'kodak-warm', name: 'Kodachrome Warm', description: 'The legendary Kodak warmth — golden highlights, rich reds, slightly faded blacks.', css: 'saturate(1.35) contrast(1.05) brightness(1.08) sepia(0.2) hue-rotate(5deg)', overlay: 'linear-gradient(180deg, rgba(255,200,100,0.06) 0%, rgba(60,30,20,0.1) 100%)' },
      { id: 'kodak-faded', name: 'Kodak Faded', description: 'The sun-bleached look — lifted blacks, desaturated blues, warm mids like an old print.', css: 'saturate(0.85) contrast(0.9) brightness(1.1) sepia(0.15)', overlay: 'linear-gradient(180deg, rgba(255,240,200,0.1) 0%, rgba(180,150,120,0.08) 100%)' },
      { id: 'kodak-gold', name: 'Kodak Gold 200', description: 'Punchy, saturated, golden hour all day — the film stock that defined casual photography.', css: 'saturate(1.5) contrast(1.15) brightness(1.05) sepia(0.1) hue-rotate(8deg)', overlay: 'linear-gradient(180deg, rgba(255,180,50,0.08) 0%, rgba(100,50,20,0.1) 100%)' },
      { id: 'kodak-portra', name: 'Portra Skin Tones', description: 'Soft, flattering skin tones with muted backgrounds — portrait perfection.', css: 'saturate(1.1) contrast(0.95) brightness(1.08) sepia(0.08) hue-rotate(3deg)', overlay: 'radial-gradient(circle at 50% 40%, rgba(255,220,180,0.06) 0%, rgba(60,40,50,0.08) 70%)' },
      { id: 'kodak-night', name: 'Kodak Night Flash', description: 'Amber cast, hard flash falloff, the disposable camera party look.', css: 'saturate(1.3) contrast(1.3) brightness(1.1) sepia(0.2) hue-rotate(10deg)', overlay: 'radial-gradient(circle at 50% 35%, rgba(255,240,200,0.2) 0%, rgba(0,0,0,0.3) 65%)' },
    ],
  },
  Sony: {
    name: 'CyberShot Cool',
    description: 'Slightly cool, crisp digital rendering — early CyberShot blue-shifted clarity.',
    warmth: -0.15,
    fade: 0.0,
    saturation: 0.95,
    defaultPreset: 'sony-cool',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none' },
      { id: 'sony-cool', name: 'CyberShot Cool', description: 'The classic CyberShot look — crisp, slightly blue-shifted, punchy detail.', css: 'saturate(0.95) contrast(1.15) brightness(1.0) hue-rotate(-8deg)', overlay: 'linear-gradient(180deg, rgba(150,180,220,0.06) 0%, rgba(20,30,50,0.1) 100%)' },
      { id: 'sony-night', name: 'CyberShot Night Mode', description: 'Long-exposure simulation — deep shadows, city-light glow, noise grain.', css: 'saturate(1.1) contrast(1.3) brightness(0.8) hue-rotate(-5deg)', overlay: 'radial-gradient(circle at 50% 60%, rgba(100,120,180,0.08) 0%, rgba(0,0,20,0.25) 70%)' },
      { id: 'sony-vivid', name: 'Vivid Mode', description: 'Sony\'s in-camera vivid processing — boosted greens, saturated skies.', css: 'saturate(1.4) contrast(1.1) brightness(1.05) hue-rotate(-3deg)', overlay: 'linear-gradient(180deg, rgba(100,150,220,0.05) 0%, rgba(20,60,40,0.06) 100%)' },
      { id: 'sony-sepia', name: 'CyberShot Sepia', description: 'The built-in sepia mode — warm monochrome with digital grain character.', css: 'saturate(0.3) contrast(1.05) brightness(1.0) sepia(0.6)', overlay: 'linear-gradient(180deg, rgba(180,150,100,0.08) 0%, rgba(40,30,20,0.1) 100%)' },
    ],
  },
  Nikon: {
    name: 'Coolpix Punch',
    description: 'Punchy contrast and boosted saturation — Nikon\'s bold CCD rendering.',
    warmth: 0.1,
    fade: 0.05,
    saturation: 1.15,
    defaultPreset: 'nikon-punch',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none' },
      { id: 'nikon-punch', name: 'Coolpix Punch', description: 'High-contrast, saturated color with Nikon\'s signature bold rendering.', css: 'saturate(1.3) contrast(1.2) brightness(1.02) sepia(0.05) hue-rotate(2deg)', overlay: 'linear-gradient(180deg, rgba(200,180,140,0.05) 0%, rgba(30,30,50,0.1) 100%)' },
      { id: 'nikon-portrait', name: 'Coolpix Portrait', description: 'Softened contrast, warm skin-friendly rendering for people shots.', css: 'saturate(1.1) contrast(0.95) brightness(1.08) sepia(0.1) hue-rotate(3deg)', overlay: 'radial-gradient(circle at 50% 40%, rgba(240,200,170,0.06) 0%, rgba(40,30,50,0.08) 70%)' },
      { id: 'nikon-landscape', name: 'Coolpix Landscape', description: 'Boosted greens and blues, high clarity — the scenery mode.', css: 'saturate(1.45) contrast(1.15) brightness(1.0) hue-rotate(-2deg)', overlay: 'linear-gradient(180deg, rgba(100,180,220,0.05) 0%, rgba(30,80,40,0.06) 100%)' },
      { id: 'nikon-lowlight', name: 'Coolpix Low Light', description: 'Noisy, contrasty, amber-tinted — the charm of high ISO on early CCDs.', css: 'saturate(1.05) contrast(1.25) brightness(0.85) sepia(0.2) hue-rotate(8deg)', overlay: 'linear-gradient(180deg, rgba(200,150,80,0.1) 0%, rgba(20,15,30,0.2) 100%)' },
    ],
  },
  Fujifilm: {
    name: 'FinePix Velvia',
    description: 'Rich, saturated colors inspired by Fuji\'s Velvia film heritage — vivid greens and deep blues.',
    warmth: 0.05,
    fade: 0.0,
    saturation: 1.25,
    defaultPreset: 'fuji-velvia',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none' },
      { id: 'fuji-velvia', name: 'FinePix Velvia', description: 'Fuji\'s legendary film simulation — deep blues, vivid greens, rich reds.', css: 'saturate(1.45) contrast(1.1) brightness(1.0) hue-rotate(3deg)', overlay: 'linear-gradient(180deg, rgba(100,150,200,0.04) 0%, rgba(40,60,30,0.06) 100%)' },
      { id: 'fuji-astia', name: 'FinePix Astia', description: 'Soft, portrait-friendly rendering — lower contrast, natural skin tones.', css: 'saturate(1.1) contrast(0.95) brightness(1.05) sepia(0.05) hue-rotate(1deg)', overlay: 'radial-gradient(circle at 50% 45%, rgba(240,220,200,0.04) 0%, rgba(40,40,60,0.06) 70%)' },
      { id: 'fuji-chrome', name: 'Super CCD Chrome', description: 'Fuji\'s high-dynamic-range CCD processing — bright highlights, retained shadows.', css: 'saturate(1.3) contrast(1.0) brightness(1.1) hue-rotate(2deg)', overlay: 'linear-gradient(180deg, rgba(255,250,230,0.06) 0%, rgba(30,40,50,0.08) 100%)' },
      { id: 'fuji-classic', name: 'Classic Chrome', description: 'Muted, desaturated tones with lifted shadows — documentary-style color.', css: 'saturate(0.8) contrast(1.05) brightness(1.02) sepia(0.08)', overlay: 'linear-gradient(180deg, rgba(180,170,150,0.06) 0%, rgba(40,35,30,0.08) 100%)' },
    ],
  },
  Panasonic: {
    name: 'Lumix Natural',
    description: 'Balanced, slightly warm natural color — Panasonic\'s true-to-life CCD approach.',
    warmth: 0.08,
    fade: 0.05,
    saturation: 1.05,
    defaultPreset: 'lumix-natural',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none' },
      { id: 'lumix-natural', name: 'Lumix Natural', description: 'Balanced, true-to-life color with gentle warmth — Panasonic\'s standard rendering.', css: 'saturate(1.1) contrast(1.05) brightness(1.03) sepia(0.08) hue-rotate(2deg)', overlay: 'linear-gradient(180deg, rgba(220,200,170,0.04) 0%, rgba(40,35,50,0.06) 100%)' },
      { id: 'lumix-vivid', name: 'Lumix Vivid', description: 'In-camera vivid mode — punchy saturation, bold color for outdoor scenes.', css: 'saturate(1.4) contrast(1.15) brightness(1.05) hue-rotate(3deg)', overlay: 'linear-gradient(180deg, rgba(200,220,100,0.04) 0%, rgba(50,30,60,0.06) 100%)' },
      { id: 'lumix-bw', name: 'Lumix B&W', description: 'Panasonic\'s grainy black-and-white mode — high contrast monochrome.', css: 'saturate(0) contrast(1.25) brightness(1.0)', overlay: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.1) 100%)' },
      { id: 'lumix-sunset', name: 'Lumix Sunset Mode', description: 'Scene mode for golden hour — enhanced warm tones, soft contrast.', css: 'saturate(1.3) contrast(1.0) brightness(1.08) sepia(0.2) hue-rotate(8deg)', overlay: 'linear-gradient(180deg, rgba(255,180,80,0.08) 0%, rgba(80,30,50,0.1) 100%)' },
    ],
  },
}

/** Neutral fallback for brands without a defined profile */
const neutralProfile: ColorProfile = {
  name: 'Digital Neutral',
  description: 'Standard digital rendering — no brand-specific color cast applied.',
  warmth: 0,
  fade: 0,
  saturation: 1.0,
  defaultPreset: 'neutral-standard',
  presets: [
    { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none' },
    { id: 'neutral-standard', name: 'Standard Digital', description: 'Typical early-2000s digicam rendering — slightly oversaturated, moderate contrast.', css: 'saturate(1.15) contrast(1.1) brightness(1.02)', overlay: 'linear-gradient(180deg, rgba(200,200,200,0.03) 0%, rgba(30,30,30,0.05) 100%)' },
    { id: 'neutral-vintage', name: 'Vintage CCD', description: 'Generic CCD characteristics — warm cast, slight grain, soft edges.', css: 'saturate(1.2) contrast(1.05) brightness(1.05) sepia(0.12) hue-rotate(3deg)', overlay: 'linear-gradient(180deg, rgba(240,210,170,0.06) 0%, rgba(40,30,40,0.08) 100%)' },
    { id: 'neutral-faded', name: 'Aged Digital', description: 'What old photos from early digicams look like today — faded, warm, nostalgic.', css: 'saturate(0.85) contrast(0.9) brightness(1.1) sepia(0.2)', overlay: 'linear-gradient(180deg, rgba(255,240,200,0.08) 0%, rgba(100,80,60,0.06) 100%)' },
  ],
}

/** Per-model overrides for cameras that deviate from brand defaults */
const modelOverrides: Record<string, Partial<ColorProfile>> = {
  // Example: Nikon Coolpix 3200 had unusually warm rendering for a Nikon
  // 'nikon-coolpix-3200': { name: 'Coolpix 3200 Warm', warmth: 0.25 },
}

/**
 * Get the color profile for a given product.
 * Checks model-specific overrides first, then falls back to brand profile, then neutral.
 */
export function getColorProfile(brand: string, slug?: string): ColorProfile {
  // Check model-specific override
  if (slug && modelOverrides[slug]) {
    const brandProfile = brandProfiles[brand] || neutralProfile
    return { ...brandProfile, ...modelOverrides[slug] }
  }
  return brandProfiles[brand] || neutralProfile
}

export { brandProfiles, neutralProfile }
