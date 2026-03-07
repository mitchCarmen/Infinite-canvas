import { describe, it, expect } from 'vitest';
import { getContrastColor } from '../color';

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
