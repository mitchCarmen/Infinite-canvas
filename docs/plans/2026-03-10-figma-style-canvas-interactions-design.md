# Figma/Miro-style Canvas Interactions

## Summary

Replace the default ReactFlow interaction model (click-drag to pan) with a Figma/Miro-style model where click-drag draws a selection box and panning uses two-finger trackpad or right/middle-click drag.

## Changes

Single file: `frontend/src/components/CanvasView.tsx` — ReactFlow prop changes only.

| Prop | Current | New | Purpose |
|------|---------|-----|---------|
| `selectionOnDrag` | _(unset)_ | `true` | Click-drag on empty canvas draws selection box |
| `panOnDrag` | _(unset/true)_ | `[1, 2]` | Pan only via middle-click (1) or right-click/two-finger (2) |
| `panOnScroll` | _(unset)_ | `true` | Two-finger trackpad scroll pans the viewport |
| `zoomOnScroll` | _(unset/true)_ | `false` | Prevent scroll from zooming (scroll now pans) |
| `multiSelectionKeyCode` | `"Shift"` | `"Meta"` | Cmd+click to toggle individual selection |
| `zoomOnDoubleClick` | _(unset/true)_ | `false` | Prevent double-click from zooming |
| `panActivationKeyCode` | `"Space"` | _removed_ | No longer needed |

## Resulting Interaction Model

| Action | Result |
|--------|--------|
| Click-drag on empty canvas | Selection box |
| Click-drag on a node | Move node (+ selected siblings) |
| Two-finger scroll (trackpad) | Pan viewport |
| Right-click drag | Pan viewport |
| Middle-click drag | Pan viewport |
| Pinch (trackpad) | Zoom |
| Cmd +/- | Zoom in/out |
| Cmd+click node/edge | Toggle add/remove from selection |
| Right-click (no drag) | Context menu |
| Double-click canvas | Create rectangle node |
| Double-click node | Edit node label |

## Unchanged

- `zoomOnPinch={true}` — pinch-to-zoom
- `selectionMode={SelectionMode.Partial}` — partial overlap selects
- `connectionMode={ConnectionMode.Strict}` — edge connection behavior
- All context menus, keyboard shortcuts, drag-and-drop from toolbar
- No backend changes, no new hooks or event handlers

## Scope

~6 lines changed in one file. No new dependencies.
