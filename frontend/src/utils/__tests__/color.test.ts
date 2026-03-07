import { describe, it, expect } from 'vitest';
import { getContrastColor, ensureContrast } from '../color';

describe('getContrastColor', () => {
  it('returns white for dark backgrounds', () => {
    expect(getContrastColor('#000000')).toBe('#ffffff');
    expect(getContrastColor('#1e1e24')).toBe('#ffffff');
    expect(getContrastColor('#333333')).toBe('#ffffff');
    expect(getContrastColor('#2e2e38')).toBe('#ffffff');
  });

  it('returns dark for light backgrounds', () => {
    expect(getContrastColor('#ffffff')).toBe('#1a1a1a');
    expect(getContrastColor('#fff9c4')).toBe('#1a1a1a');
    expect(getContrastColor('#e88a8a')).toBe('#1a1a1a');
  });

  it('handles 3-digit hex', () => {
    expect(getContrastColor('#fff')).toBe('#1a1a1a');
    expect(getContrastColor('#000')).toBe('#ffffff');
  });

  it('handles missing hash', () => {
    expect(getContrastColor('ffffff')).toBe('#1a1a1a');
    expect(getContrastColor('000000')).toBe('#ffffff');
  });

  it('returns white for invalid/unparseable input', () => {
    expect(getContrastColor('not-a-color')).toBe('#ffffff');
    expect(getContrastColor('')).toBe('#ffffff');
  });
});

describe('ensureContrast', () => {
  it('keeps text color when contrast is sufficient', () => {
    // Dark text on light background
    expect(ensureContrast('#1a1a1a', '#ffffff')).toBe('#1a1a1a');
    // Light text on dark background
    expect(ensureContrast('#ffffff', '#1e1e24')).toBe('#ffffff');
  });

  it('overrides dark text on dark background', () => {
    // #1a1a2e on #1e1e24 — both dark, insufficient contrast
    expect(ensureContrast('#1a1a2e', '#1e1e24')).toBe('#ffffff');
    // #666 on dark canvas
    expect(ensureContrast('#666666', '#1e1e24')).toBe('#ffffff');
  });

  it('overrides light text on light background', () => {
    // White text on white canvas
    expect(ensureContrast('#ffffff', '#ffffff')).toBe('#1a1a1a');
  });
});
