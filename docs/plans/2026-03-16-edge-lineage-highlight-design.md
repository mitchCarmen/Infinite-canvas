# Edge Lineage Highlight Design

**Date:** 2026-03-16
**Status:** Approved

## Problem

In complex boards with step/orthogonal routing, parallel and crossing edges become visually indistinguishable. Users cannot trace which arrow goes where. Clicking an edge only selects that single edge — there's no way to see the full data flow path from origin to terminal.

## Solution

Click an edge to highlight the full upstream + downstream lineage chain. All non-lineage edges and nodes dim to 20% opacity. The highlighted chain renders with a bright blue stroke at increased width. Click elsewhere to clear.

## Lineage Tracing Algorithm

1. Build an adjacency map from the `edges` array: `nodeId -> { incomingEdges[], outgoingEdges[] }`
2. From the clicked edge's **source node**, BFS backward through incoming edges to find all ancestor edges
3. From the clicked edge's **target node**, BFS forward through outgoing edges to find all descendant edges
4. **Lineage set** = ancestor edges + clicked edge + descendant edges
5. **Lineage nodes** = all nodes touched by any lineage edge (source or target)
6. Cycle protection via visited-node set during BFS

Handles fan-out/fan-in: if a node has multiple outgoing edges, all branches are traced.

## Visual Treatment

| Element | In lineage | Not in lineage |
|---------|-----------|----------------|
| Edges | Stroke width 3px, bright blue accent | Opacity 0.2 |
| Nodes | Normal opacity (1.0) | Opacity 0.2 |
| Edge labels | Normal opacity | Opacity 0.2 |

Note: Uses 0.2 to match existing search dimming opacity for visual consistency.

### Accent Color

Use a bright blue, brighter than the existing node selection border color. Respects `canvasLight` toggle:
- Dark canvas: `#5cb8ff`
- Light canvas: `#2b8ae6`

### Clearing Behavior

- Click on canvas pane: clears lineage highlight
- Click on a node: clears lineage highlight
- Click on a different edge: switches to that edge's lineage
- Press Escape: clears lineage highlight. If search bar is also open, Escape closes the search bar first (foreground UI priority); a second Escape clears lineage.
- Right-click context menu: unaffected (lineage persists while context menu is open)

## Integration Points

### New File: `frontend/src/hooks/useLineageHighlight.ts`

Hook containing:
- Adjacency map builder from edges array, memoized via `useMemo` keyed on the edges array reference
- BFS tracer (upstream + downstream)
- State: `highlightedEdgeIds: Set<string>`, `highlightedNodeIds: Set<string>`
- Exports: `{ highlightedEdgeIds, highlightedNodeIds, lineageActive, onEdgeClick, clearHighlight }` (`lineageActive` = `highlightedEdgeIds.size > 0`)
- `onEdgeClick` signature: `(event: React.MouseEvent, edge: Edge) => void` — matches React Flow's `onEdgeClick` callback

### Modified: `frontend/src/components/CanvasView.tsx`

- Import and call `useLineageHighlight(edges)`
- `onEdgeClick`: invoke hook's `onEdgeClick` AND still call `setContextMenu(null)` (augments, not replaces)
- `onPaneClick` / `onNodeClick`: call `clearHighlight()` alongside existing context menu close
- New `useMemo` producing `enhancedEdges`:
  - Preserves existing `edge.style` properties (which carry `routing` and `arrowMode` metadata) by spreading them into the enhanced style, not overwriting
  - Lineage edges: merges `{ stroke, strokeWidth: 3 }` into existing style
  - Non-lineage edges (when lineage active): merges `{ opacity: 0.2 }` into existing style
  - Edge labels: applies `labelStyle: { opacity: 0.2 }` on non-lineage edges when lineage active
  - Suppresses React Flow's default selection styling on all edges when lineage is active by setting `selected: false`
- Extend existing `enhancedNodes` `useMemo` to combine search dimming and lineage dimming:
  ```
  const isDimmed = (dimmedNodeIds.size > 0 && dimmedNodeIds.has(node.id))
    || (lineageActive && !highlightedNodeIds.has(node.id));
  ```
- Pass `enhancedEdges` to `<ReactFlow edges={enhancedEdges}>` instead of raw `edges`

### Not Modified

- `useBoard.ts` — no changes; styling applied post-conversion in CanvasView
- Backend/API — purely frontend presentation logic, nothing persists to board JSON
- `shared/types.ts` — no type changes needed

## Interaction with Existing Features

- **Search dimming**: Search dimming and lineage dimming both set opacity. If both are active, the more restrictive opacity wins (a node dimmed by search stays dimmed even if in lineage). In practice these are unlikely to overlap — search filters by text, lineage by connectivity.
- **Node selection**: Node selection border is independent of lineage. A node can be both selected (showing its border) and dimmed (if not in lineage).
- **Context menu**: Right-clicking an edge opens the context menu but does NOT trigger lineage. Lineage activates on left-click only.

## Scope

This is Approach A from the brainstorm — highlight + dim. No edge spacing/offset changes (Approach B) and no animation (Approach C). Those can be layered on later if needed.
