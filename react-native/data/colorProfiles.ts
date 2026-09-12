export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  css: string;
  overlay?: string;
  previewTint?: string;
}

export interface ColorProfile {
  name: string;
  description: string;
  warmth: number;
  fade: number;
  saturation: number;
  presets: FilterPreset[];
  defaultPreset: string;
}

export const brandProfiles: Record<string, ColorProfile> = {
  Canon: {
    name: 'PowerShot CCD Warm',
    description: 'Warm highlights, magenta-shifted shadows, soft contrast — the PowerShot signature.',
    warmth: 0.15,
    fade: 0.05,
    saturation: 1.15,
    defaultPreset: 'canon-ccd',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none', previewTint: '#ffffff' },
      { id: 'canon-ccd', name: 'PowerShot CCD Warm', description: 'Warm highlights, magenta-shifted shadows, soft contrast — the PowerShot signature.', css: 'saturate(1.3) contrast(1.1) brightness(1.05) sepia(0.15) hue-rotate(-5deg)', previewTint: '#ffead0' },
      { id: 'canon-flash', name: 'CCD + Flash', description: 'The classic party shot — blown highlights, warm skin, crushed background.', css: 'saturate(1.4) contrast(1.25) brightness(1.15) sepia(0.1)', previewTint: '#fff2d6' },
      { id: 'canon-lowlight', name: 'CCD Low Light', description: 'ISO 400 at night — visible noise, amber streetlight cast, dreamy grain.', css: 'saturate(1.1) contrast(1.2) brightness(0.85) sepia(0.25) hue-rotate(10deg)', previewTint: '#e6a86c' },
      { id: 'canon-macro', name: 'CCD Macro Mode', description: 'Close-up — saturated colors, slight vignette, shallow-focus feel.', css: 'saturate(1.5) contrast(1.05) brightness(1.0)', previewTint: '#ffdfba' },
    ],
  },
  Kodak: {
    name: 'Kodachrome-adjacent',
    description: "Warm, slightly faded CCD color — Kodak's signature golden tone.",
    warmth: 0.35,
    fade: 0.2,
    saturation: 1.1,
    defaultPreset: 'kodak-warm',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none', previewTint: '#ffffff' },
      { id: 'kodak-warm', name: 'Kodachrome Warm', description: "The legendary Kodak warmth — golden highlights, rich reds, slightly faded blacks.", css: 'saturate(1.35) contrast(1.05) brightness(1.08) sepia(0.2) hue-rotate(5deg)', previewTint: '#ffdf99' },
      { id: 'kodak-faded', name: 'Kodak Faded', description: 'The sun-bleached look — lifted blacks, desaturated blues, warm mids like an old print.', css: 'saturate(0.85) contrast(0.9) brightness(1.1) sepia(0.15)', previewTint: '#f5e3cb' },
      { id: 'kodak-gold', name: 'Kodak Gold 200', description: 'Punchy, saturated, golden hour all day — the film stock that defined casual photography.', css: 'saturate(1.5) contrast(1.15) brightness(1.05) sepia(0.1) hue-rotate(8deg)', previewTint: '#ffd166' },
      { id: 'kodak-portra', name: 'Portra Skin Tones', description: 'Soft, flattering skin tones with muted backgrounds — portrait perfection.', css: 'saturate(1.1) contrast(0.95) brightness(1.08) sepia(0.08) hue-rotate(3deg)', previewTint: '#ffe5d9' },
      { id: 'kodak-night', name: 'Kodak Night Flash', description: 'Amber cast, hard flash falloff, the disposable camera party look.', css: 'saturate(1.3) contrast(1.3) brightness(1.1) sepia(0.2) hue-rotate(10deg)', previewTint: '#ffe8a1' },
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
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none', previewTint: '#ffffff' },
      { id: 'sony-cool', name: 'CyberShot Cool', description: 'The classic CyberShot look — crisp, slightly blue-shifted, punchy detail.', css: 'saturate(0.95) contrast(1.15) brightness(1.0) hue-rotate(-8deg)', previewTint: '#d8ecf8' },
      { id: 'sony-night', name: 'CyberShot Night Mode', description: 'Long-exposure simulation — deep shadows, city-light glow, noise grain.', css: 'saturate(1.1) contrast(1.3) brightness(0.8) hue-rotate(-5deg)', previewTint: '#adcbe3' },
      { id: 'sony-vivid', name: 'Vivid Mode', description: "Sony's in-camera vivid processing — boosted greens, saturated skies.", css: 'saturate(1.4) contrast(1.1) brightness(1.05) hue-rotate(-3deg)', previewTint: '#bce0fd' },
      { id: 'sony-sepia', name: 'CyberShot Sepia', description: 'The built-in sepia mode — warm monochrome with digital grain character.', css: 'saturate(0.3) contrast(1.05) brightness(1.0) sepia(0.6)', previewTint: '#dfc7a7' },
    ],
  },
  Nikon: {
    name: 'Coolpix Punch',
    description: "Punchy contrast and boosted saturation — Nikon's bold CCD rendering.",
    warmth: 0.1,
    fade: 0.05,
    saturation: 1.15,
    defaultPreset: 'nikon-punch',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none', previewTint: '#ffffff' },
      { id: 'nikon-punch', name: 'Coolpix Punch', description: "High-contrast, saturated color with Nikon's signature bold rendering.", css: 'saturate(1.3) contrast(1.2) brightness(1.02) sepia(0.05) hue-rotate(2deg)', previewTint: '#ffe8cc' },
      { id: 'nikon-portrait', name: 'Coolpix Portrait', description: 'Softened contrast, warm skin-friendly rendering for people shots.', css: 'saturate(1.1) contrast(0.95) brightness(1.08) sepia(0.1) hue-rotate(3deg)', previewTint: '#ffe5d0' },
      { id: 'nikon-landscape', name: 'Coolpix Landscape', description: 'Boosted greens and blues, high clarity — the scenery mode.', css: 'saturate(1.45) contrast(1.15) brightness(1.0) hue-rotate(-2deg)', previewTint: '#d4edda' },
      { id: 'nikon-lowlight', name: 'Coolpix Low Light', description: 'Noisy, contrasty, amber-tinted — the charm of high ISO on early CCDs.', css: 'saturate(1.05) contrast(1.25) brightness(0.85) sepia(0.2) hue-rotate(8deg)', previewTint: '#e2b382' },
    ],
  },
  Fujifilm: {
    name: 'FinePix Velvia',
    description: "Rich, saturated colors inspired by Fuji's Velvia film heritage — vivid greens and deep blues.",
    warmth: 0.05,
    fade: 0.0,
    saturation: 1.25,
    defaultPreset: 'fuji-velvia',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none', previewTint: '#ffffff' },
      { id: 'fuji-velvia', name: 'FinePix Velvia', description: "Fuji's legendary film simulation — deep blues, vivid greens, rich reds.", css: 'saturate(1.45) contrast(1.1) brightness(1.0) hue-rotate(3deg)', previewTint: '#c3e6cb' },
      { id: 'fuji-astia', name: 'FinePix Astia', description: 'Soft, portrait-friendly rendering — lower contrast, natural skin tones.', css: 'saturate(1.1) contrast(0.95) brightness(1.05) sepia(0.05) hue-rotate(1deg)', previewTint: '#fce4ec' },
      { id: 'fuji-chrome', name: 'Super CCD Chrome', description: "Fuji's high-dynamic-range CCD processing — bright highlights, retained shadows.", css: 'saturate(1.3) contrast(1.0) brightness(1.1) hue-rotate(2deg)', previewTint: '#fff3cd' },
      { id: 'fuji-classic', name: 'Classic Chrome', description: 'Muted, desaturated tones with lifted shadows — documentary-style color.', css: 'saturate(0.8) contrast(1.05) brightness(1.02) sepia(0.08)', previewTint: '#e8e8e8' },
    ],
  },
  Panasonic: {
    name: 'Lumix Natural',
    description: "Balanced, slightly warm natural color — Panasonic's true-to-life CCD approach.",
    warmth: 0.08,
    fade: 0.05,
    saturation: 1.05,
    defaultPreset: 'lumix-natural',
    presets: [
      { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none', previewTint: '#ffffff' },
      { id: 'lumix-natural', name: 'Lumix Natural', description: "Balanced, true-to-life color with gentle warmth — Panasonic's standard rendering.", css: 'saturate(1.1) contrast(1.05) brightness(1.03) sepia(0.08) hue-rotate(2deg)', previewTint: '#f0ede6' },
      { id: 'lumix-vivid', name: 'Lumix Vivid', description: 'In-camera vivid mode — punchy saturation, bold color for outdoor scenes.', css: 'saturate(1.4) contrast(1.15) brightness(1.05) hue-rotate(3deg)', previewTint: '#e2f0d9' },
      { id: 'lumix-bw', name: 'Lumix B&W', description: "Panasonic's grainy black-and-white mode — high contrast monochrome.", css: 'saturate(0) contrast(1.25) brightness(1.0)', previewTint: '#cccccc' },
      { id: 'lumix-sunset', name: 'Lumix Sunset Mode', description: 'Scene mode for golden hour — enhanced warm tones, soft contrast.', css: 'saturate(1.3) contrast(1.0) brightness(1.08) sepia(0.2) hue-rotate(8deg)', previewTint: '#ffcba4' },
    ],
  },
};

export const neutralProfile: ColorProfile = {
  name: 'Digital Neutral',
  description: 'Standard digital rendering — no brand-specific color cast applied.',
  warmth: 0,
  fade: 0,
  saturation: 1.0,
  defaultPreset: 'neutral-standard',
  presets: [
    { id: 'none', name: 'No Filter (Modern)', description: 'Your camera as-is — clean, neutral, digital.', css: 'none', previewTint: '#ffffff' },
    { id: 'neutral-standard', name: 'Standard Digital', description: 'Typical early-2000s digicam rendering — slightly oversaturated, moderate contrast.', css: 'saturate(1.15) contrast(1.1) brightness(1.02)', previewTint: '#f5f5f5' },
    { id: 'neutral-vintage', name: 'Vintage CCD', description: 'Generic CCD characteristics — warm cast, slight grain, soft edges.', css: 'saturate(1.2) contrast(1.05) brightness(1.05) sepia(0.12) hue-rotate(3deg)', previewTint: '#fff0db' },
    { id: 'neutral-faded', name: 'Aged Digital', description: 'What old photos from early digicams look like today — faded, warm, nostalgic.', css: 'saturate(0.85) contrast(0.9) brightness(1.1) sepia(0.2)', previewTint: '#faedd8' },
  ],
};

export function getColorProfile(brand: string): ColorProfile {
  return brandProfiles[brand] || neutralProfile;
}

