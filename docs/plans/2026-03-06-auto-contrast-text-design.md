# Auto-Contrast Text Color — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-compute text color for canvas nodes so text always contrasts with its background.

**Architecture:** A pure utility function `getContrastColor(bgColor)` computes WCAG relative luminance and returns black or white. Each node component calls it as the fallback when the user hasn't explicitly set a text color.

**Tech Stack:** TypeScript, React, Vitest

---

**Date:** 2026-03-06
**Status:** Approved

## Problem

All node types default text color to `#000000` (black). On the dark canvas (`--bg-primary: #1e1e24`), text nodes are invisible, and shape nodes with dark fills have unreadable text.

---

## Task 1: Create `getContrastColor` utility with tests

**Files:**
- Create: `frontend/src/utils/color.ts`
- Create: `frontend/src/utils/__tests__/color.test.ts`

**Step 1: Write the failing tests**

Create `frontend/src/utils/__tests__/color.test.ts`:

```ts
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
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas && npx vitest run frontend/src/utils/__tests__/color.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `frontend/src/utils/color.ts`:

```ts
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
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas && npx vitest run frontend/src/utils/__tests__/color.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add frontend/src/utils/color.ts frontend/src/utils/__tests__/color.test.ts
git commit -m "feat: add getContrastColor utility for auto-contrast text"
```

---

## Task 2: Update shape nodes to use auto-contrast

These 8 shape nodes all follow the same pattern. Each has a `fill` variable for background and a `color` variable for text.

**Files to modify:**
- `frontend/src/components/nodes/RectangleNode.tsx:10` — change color line
- `frontend/src/components/nodes/CircleNode.tsx:12` — change color line
- `frontend/src/components/nodes/DiamondNode.tsx:10` — change color line
- `frontend/src/components/nodes/EllipseNode.tsx:10` — change color line
- `frontend/src/components/nodes/HexagonNode.tsx:10` — change color line
- `frontend/src/components/nodes/ParallelogramNode.tsx:10` — change color line
- `frontend/src/components/nodes/CylinderNode.tsx:10` — change color line
- `frontend/src/components/nodes/TriangleNode.tsx:10` — change color line

**Step 1: In each file, add the import and replace the color line**

Add import at top (after existing imports):
```ts
import { getContrastColor } from '../../utils/color';
```

Replace:
```ts
const color = (data.style as Record<string, string>)?.color ?? '#000000';
```
With:
```ts
const explicitColor = (data.style as Record<string, string>)?.color;
const color = explicitColor ?? getContrastColor(fill);
```

Note: `fill` is already defined on the line above in each file as the `backgroundColor` style prop.

**Step 2: Verify the frontend compiles**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/nodes/RectangleNode.tsx frontend/src/components/nodes/CircleNode.tsx frontend/src/components/nodes/DiamondNode.tsx frontend/src/components/nodes/EllipseNode.tsx frontend/src/components/nodes/HexagonNode.tsx frontend/src/components/nodes/ParallelogramNode.tsx frontend/src/components/nodes/CylinderNode.tsx frontend/src/components/nodes/TriangleNode.tsx
git commit -m "feat: auto-contrast text color for shape nodes"
```

---

## Task 3: Update StickyNode to use auto-contrast

**Files:**
- Modify: `frontend/src/components/nodes/StickyNode.tsx:10`

**Step 1: Add import and replace color line**

Same pattern as Task 2. Add import, replace:
```ts
const color = (data.style as Record<string, string>)?.color ?? '#000000';
```
With:
```ts
const explicitColor = (data.style as Record<string, string>)?.color;
const color = explicitColor ?? getContrastColor(fill);
```

Sticky default fill is `#fff9c4` (yellow) — `getContrastColor` returns `#1a1a1a` (dark), which is correct for a light sticky note.

**Step 2: Verify compilation**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/src/components/nodes/StickyNode.tsx
git commit -m "feat: auto-contrast text color for sticky nodes"
```

---

## Task 4: Update TextNode to use auto-contrast against canvas background

**Files:**
- Modify: `frontend/src/components/nodes/TextNode.tsx:8`

**Step 1: Add import and replace color line**

TextNode has no `fill` — it sits directly on the canvas. Use the canvas background color `#1e1e24` as the reference.

Add import:
```ts
import { getContrastColor } from '../../utils/color';
```

Replace:
```ts
const color = (data.style as Record<string, string>)?.color ?? '#000000';
```
With:
```ts
const CANVAS_BG = '#1e1e24';
const explicitColor = (data.style as Record<string, string>)?.color;
const color = explicitColor ?? getContrastColor(CANVAS_BG);
```

This makes the default text color white on the dark canvas.

**Step 2: Verify compilation**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/src/components/nodes/TextNode.tsx
git commit -m "feat: auto-contrast text color for text nodes against canvas bg"
```

---

## Task 5: Update GroupNode to use auto-contrast

**Files:**
- Modify: `frontend/src/components/nodes/GroupNode.tsx:10`

**Step 1: Add import and replace color line**

GroupNode's default fill is `rgba(200, 200, 200, 0.1)` which is not a hex color. Since group nodes are transparent overlays on the dark canvas, use the canvas background as reference (same as TextNode).

Add import:
```ts
import { getContrastColor } from '../../utils/color';
```

Replace:
```ts
const color = (data.style as Record<string, string>)?.color ?? '#555555';
```
With:
```ts
const CANVAS_BG = '#1e1e24';
const explicitColor = (data.style as Record<string, string>)?.color;
const color = explicitColor ?? getContrastColor(CANVAS_BG);
```

**Step 2: Verify compilation**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/src/components/nodes/GroupNode.tsx
git commit -m "feat: auto-contrast text color for group nodes"
```

---

## Task 6: Run full test suite and verify

**Step 1: Run all server tests**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/server && npx vitest run`
Expected: 57 tests pass (no regressions — server code is untouched)

**Step 2: Run frontend utility tests**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas && npx vitest run frontend/src/utils/__tests__/color.test.ts`
Expected: 5 tests pass

**Step 3: Verify frontend builds**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/frontend && npx vite build`
Expected: Build succeeds with no errors
