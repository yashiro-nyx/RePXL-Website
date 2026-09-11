import type { Specs } from '../types';

export const SPEC_LABELS: Record<keyof Specs, string> = {
  megapixels: 'Resolution',
  sensor: 'Sensor',
  opticalZoom: 'Zoom',
  lcd: 'LCD Screen',
  isoRange: 'ISO Range',
  shutterSpeed: 'Shutter Speed',
  storage: 'Storage',
  battery: 'Battery',
  weight: 'Weight',
  year: 'Year',
};

export const CONDITION_COLORS: Record<string, { text: string; border: string }> = {
  MINT: { text: '#00c853', border: '#00c853' },
  EXCELLENT: { text: '#2196f3', border: '#2196f3' },
  GOOD: { text: '#ff9800', border: '#ff9800' },
  FAIR: { text: '#f44336', border: '#f44336' },
};
