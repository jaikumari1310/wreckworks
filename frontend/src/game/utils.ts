import { theme } from './theme';

/**
 * Compute an SVG-style diagonal caution stripe pattern via multiple LinearGradient stops.
 * Returned as an array of color stops usable by expo-linear-gradient.
 */
export function warningStripes() {
  return [theme.color.brandSecondary, '#111827', theme.color.brandSecondary, '#111827'];
}

export function formatShots(s: number) {
  return String(s).padStart(2, '0');
}
