/**
 * Parse a hex color string to RGB components (0-255).
 * Accepts "#rgb", "#rrggbb", "rgb", "rrggbb".
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace(/^#/, '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) {
    return null;
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Compute relative luminance per WCAG 2.0.
 * Returns a value between 0 (darkest) and 1 (lightest).
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

const LIGHT = '#ffffff';
const DARK = '#1a1a1a';

/**
 * Return a contrasting text color (white or near-black) for a given background hex color.
 * Falls back to white (light text) for unparseable input.
 */
export function getContrastColor(bgColor: string): string {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return LIGHT;
  return relativeLuminance(rgb.r, rgb.g, rgb.b) > 0.179 ? DARK : LIGHT;
}

/**
 * Compute WCAG contrast ratio between two colors.
 * Returns a value between 1 (identical) and 21 (black vs white).
 */
function contrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 1;
  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ensure a text color has sufficient contrast against a background.
 * If the contrast ratio is below 3:1 (WCAG AA for large text),
 * returns a properly contrasting color instead.
 */
export function ensureContrast(textColor: string, bgColor: string): string {
  if (contrastRatio(textColor, bgColor) >= 3) return textColor;
  return getContrastColor(bgColor);
}
