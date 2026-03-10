export const SYSTEM_FONTS = [
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana',
];

export const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Noto Sans', 'Lato', 'Playfair Display', 'Fira Code',
];

const loadedFonts = new Set<string>();

export function loadGoogleFont(fontName: string): void {
  if (loadedFonts.has(fontName)) return;
  if (!GOOGLE_FONTS.includes(fontName)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

export function isGoogleFont(fontName: string): boolean {
  return GOOGLE_FONTS.includes(fontName);
}
