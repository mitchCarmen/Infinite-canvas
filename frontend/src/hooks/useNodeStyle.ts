import { useEffect, useMemo } from 'react';
import { getContrastColor } from '../utils/color';
import { loadGoogleFont, isGoogleFont } from '../utils/googleFonts';

interface NodeStyleResult {
  fill: string;
  borderColor: string;
  borderWidth: string;
  color: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  locked: boolean;
  link: string | null;
  emoji: string | null;
}

export function useNodeStyle(data: Record<string, unknown>): NodeStyleResult {
  const style = (data.style as Record<string, string>) ?? {};
  const fill = style.backgroundColor ?? '#ffffff';
  const borderColor = style.borderColor ?? '#333333';
  const borderWidth = style.borderWidth ?? '2px';
  const explicitColor = style.color;
  const color = explicitColor ?? getContrastColor(fill);
  const fontSize = style.fontSize ?? '14px';
  const fontFamily = style.fontFamily ?? 'Arial';
  const fontWeight = style.fontWeight ?? 'normal';
  const textAlign = (style.textAlign as 'left' | 'center' | 'right') ?? 'center';
  const verticalAlign = (style.verticalAlign as 'top' | 'middle' | 'bottom') ?? 'middle';
  const locked = data.locked === true;
  const link = typeof data.link === 'string' ? data.link : null;
  const emoji = typeof data.emoji === 'string' ? data.emoji : null;

  useEffect(() => {
    if (isGoogleFont(fontFamily)) loadGoogleFont(fontFamily);
  }, [fontFamily]);

  return useMemo(
    () => ({ fill, borderColor, borderWidth, color, fontSize, fontFamily, fontWeight, textAlign, verticalAlign, locked, link, emoji }),
    [fill, borderColor, borderWidth, color, fontSize, fontFamily, fontWeight, textAlign, verticalAlign, locked, link, emoji],
  );
}
