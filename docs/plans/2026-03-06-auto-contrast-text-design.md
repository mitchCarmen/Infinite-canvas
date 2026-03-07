# Auto-Contrast Text Color

**Date:** 2026-03-06
**Status:** Approved

## Problem

All node types default text color to `#000000` (black). On the dark canvas (`--bg-primary: #1e1e24`), text nodes are invisible, and shape nodes with dark fills have unreadable text.

## Design

### Utility Function

Add `getContrastColor(bgColor: string): string` in `frontend/src/utils/color.ts`.

- Parses hex color to RGB
- Computes relative luminance per WCAG 2.0: `L = 0.2126*R + 0.7152*G + 0.0722*B` (after sRGB linearization)
- Returns `#ffffff` if luminance < 0.5, `#1a1a1a` otherwise

### Node Behavior

| Node type | Background reference | When user sets explicit `color` |
|-----------|---------------------|-------------------------------|
| Text node | Canvas bg `#1e1e24` (no fill) | Respect user choice |
| Shape nodes (rect, circle, diamond, ellipse, hexagon, parallelogram, cylinder, triangle) | `backgroundColor` style prop (default `#ffffff`) | Respect user choice |
| Sticky node | `backgroundColor` style prop (default `#fff9c4`) | Respect user choice |
| Group node | N/A (container) | N/A |
| Image node | N/A (image content) | N/A |

### Logic

In each node component, replace:
```ts
const color = (data.style as Record<string, string>)?.color ?? '#000000';
```
With:
```ts
const explicitColor = (data.style as Record<string, string>)?.color;
const color = explicitColor ?? getContrastColor(fill); // or canvas bg for text nodes
```

### Scope

- New file: `frontend/src/utils/color.ts`
- Modified: ~10 node component files
- No backend changes
- No data model changes
