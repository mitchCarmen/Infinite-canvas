# Edge Lineage Highlight Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Click an edge to highlight its full upstream/downstream lineage chain, dimming all non-lineage elements.

**Architecture:** New `useLineageHighlight` hook builds a memoized adjacency map from the edges array, runs BFS on click to find the full chain, and exposes highlighted IDs. `CanvasView` applies visual styling (bright blue stroke on lineage, opacity 0.2 on everything else) via `enhancedEdges`/`enhancedNodes` memos.

**Tech Stack:** React 18, React Flow 12.6, TypeScript

**Spec:** `docs/plans/2026-03-16-edge-lineage-highlight-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/hooks/useLineageHighlight.ts` | Adjacency map, BFS tracer, highlight state management |
| Modify | `frontend/src/components/CanvasView.tsx` | Wire hook, build enhancedEdges memo, extend enhancedNodes, Escape handling |
| Modify | `frontend/src/hooks/useKeyboardShortcuts.ts` | Add `onEscape` to ShortcutHandlers interface |

---

## Chunk 1: Core Hook + Integration

### Task 1: Create `useLineageHighlight` hook

**Files:**
- Create: `frontend/src/hooks/useLineageHighlight.ts`

- [ ] **Step 1: Create the hook file with adjacency map builder**

```typescript
import { useMemo, useState, useCallback } from 'react';
import type { Edge } from '@xyflow/react';

interface AdjacencyEntry {
  incoming: Edge[];  // edges where this node is the target
  outgoing: Edge[];  // edges where this node is the source
}

type AdjacencyMap = Map<string, AdjacencyEntry>;

function buildAdjacencyMap(edges: Edge[]): AdjacencyMap {
  const map: AdjacencyMap = new Map();

  const getEntry = (nodeId: string): AdjacencyEntry => {
    let entry = map.get(nodeId);
    if (!entry) {
      entry = { incoming: [], outgoing: [] };
      map.set(nodeId, entry);
    }
    return entry;
  };

  for (const edge of edges) {
    getEntry(edge.source).outgoing.push(edge);
    getEntry(edge.target).incoming.push(edge);
  }

  return map;
}

function traceLineage(
  clickedEdge: Edge,
  adjacencyMap: AdjacencyMap,
): { edgeIds: Set<string>; nodeIds: Set<string> } {
  const edgeIds = new Set<string>([clickedEdge.id]);
  const nodeIds = new Set<string>();
  const visitedNodes = new Set<string>();

  // BFS upstream from the clicked edge's source
  const upstreamQueue = [clickedEdge.source];
  while (upstreamQueue.length > 0) {
    const nodeId = upstreamQueue.shift()!;
    if (visitedNodes.has(nodeId)) continue;
    visitedNodes.add(nodeId);
    nodeIds.add(nodeId);

    const entry = adjacencyMap.get(nodeId);
    if (!entry) continue;
    for (const edge of entry.incoming) {
      edgeIds.add(edge.id);
      upstreamQueue.push(edge.source);
    }
  }

  // BFS downstream from the clicked edge's target
  const downstreamQueue = [clickedEdge.target];
  while (downstreamQueue.length > 0) {
    const nodeId = downstreamQueue.shift()!;
    if (visitedNodes.has(nodeId)) continue;
    visitedNodes.add(nodeId);
    nodeIds.add(nodeId);

    const entry = adjacencyMap.get(nodeId);
    if (!entry) continue;
    for (const edge of entry.outgoing) {
      edgeIds.add(edge.id);
      downstreamQueue.push(edge.target);
    }
  }

  return { edgeIds, nodeIds };
}

export function useLineageHighlight(edges: Edge[]) {
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  const adjacencyMap = useMemo(() => buildAdjacencyMap(edges), [edges]);

  const lineageActive = highlightedEdgeIds.size > 0;

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const { edgeIds, nodeIds } = traceLineage(edge, adjacencyMap);
      setHighlightedEdgeIds(edgeIds);
      setHighlightedNodeIds(nodeIds);
    },
    [adjacencyMap],
  );

  // Stable empty set to avoid unnecessary memo recalculations
  const EMPTY = useMemo(() => new Set<string>(), []);

  const clearHighlight = useCallback(() => {
    setHighlightedEdgeIds(EMPTY);
    setHighlightedNodeIds(EMPTY);
  }, [EMPTY]);

  return { highlightedEdgeIds, highlightedNodeIds, lineageActive, onEdgeClick, clearHighlight };
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas && npx tsc --noEmit --project frontend/tsconfig.json 2>&1 | head -20`

Expected: No errors from `useLineageHighlight.ts`

- [ ] **Step 3: Commit**

```bash
cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas
git add frontend/src/hooks/useLineageHighlight.ts
git commit -m "feat: add useLineageHighlight hook with BFS lineage tracing"
```

---

### Task 2: Add Escape handler to `useKeyboardShortcuts`

**Files:**
- Modify: `frontend/src/hooks/useKeyboardShortcuts.ts:3-16` (interface) and `:29-31` (insert Escape before isInputFocused guard)

- [ ] **Step 1: Add `onEscape` to ShortcutHandlers interface**

In `frontend/src/hooks/useKeyboardShortcuts.ts`, add to the `ShortcutHandlers` interface:

```typescript
interface ShortcutHandlers {
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onGroup: () => void;
  onToggleSearch: () => void;
  onToggleActivityLog: () => void;
  onZoomToFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onEscape?: () => void;  // optional — not all consumers need it
}
```

- [ ] **Step 2: Add Escape key handling BEFORE the `isInputFocused()` guard**

In the `handleKeyDown` function, add at the very top (before `if (isInputFocused()) return;` at line 31). Escape is a meta-dismissal key that should work regardless of input focus — e.g., when the search bar's input is focused:

```typescript
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape always fires regardless of focus (meta-dismissal key)
      if (event.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      // Skip when typing in form fields
      if (isInputFocused()) return;
      // ... rest unchanged
```

Note: No `preventDefault()` — Escape has useful default behaviors (closing dialogs, etc.) that we don't want to block.

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas && npx tsc --noEmit --project frontend/tsconfig.json 2>&1 | head -20`

Expected: No errors (onEscape is optional, so existing consumers don't break)

- [ ] **Step 4: Commit**

```bash
cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas
git add frontend/src/hooks/useKeyboardShortcuts.ts
git commit -m "feat: add optional onEscape handler to keyboard shortcuts"
```

---

### Task 3: Wire `useLineageHighlight` into `CanvasView`

**Files:**
- Modify: `frontend/src/components/CanvasView.tsx`

This is the main integration task. It touches several areas of CanvasView.

- [ ] **Step 1: Import and initialize the hook**

Add import at the top of `CanvasView.tsx` (after the `useSnapToGrid` import, around line 23):

```typescript
import { useLineageHighlight } from '../hooks/useLineageHighlight';
```

Inside `CanvasInner`, after the `useSnapToGrid` call (around line 57), add:

```typescript
  const {
    highlightedEdgeIds,
    highlightedNodeIds,
    lineageActive,
    onEdgeClick: handleLineageEdgeClick,
    clearHighlight,
  } = useLineageHighlight(edges);
```

- [ ] **Step 2: Build the `enhancedEdges` memo**

Add a new `useMemo` after the existing `enhancedNodes` block (after line 188). This produces styled edges based on lineage state:

```typescript
  const enhancedEdges = useMemo(() => {
    if (!lineageActive) return edges;

    const accentColor = canvasLight ? '#2b8ae6' : '#5cb8ff';

    return edges.map((edge) => {
      // Strip non-CSS metadata keys that toFlowEdges passes through in edge.style.
      // routing/arrowMode have already been consumed to set edge type and markers —
      // they are not valid CSS and would produce React DOM warnings if spread into style.
      const { routing, arrowMode, ...cssStyle } = (edge.style ?? {}) as Record<string, unknown>;

      const inLineage = highlightedEdgeIds.has(edge.id);
      if (inLineage) {
        return {
          ...edge,
          selected: false,
          style: {
            ...cssStyle,
            stroke: accentColor,
            strokeWidth: 3,
          },
        };
      }
      return {
        ...edge,
        selected: false,
        style: {
          ...cssStyle,
          opacity: 0.2,
        },
        labelStyle: { opacity: 0.2 },
      };
    });
  }, [edges, lineageActive, highlightedEdgeIds, canvasLight]);
```

- [ ] **Step 3: Extend `enhancedNodes` to include lineage dimming**

Modify the existing `enhancedNodes` useMemo (around line 168-188). Replace the `isDimmed` logic:

Change:
```typescript
      const isDimmed = dimmedNodeIds.size > 0 && dimmedNodeIds.has(node.id);
```

To:
```typescript
      const isDimmedBySearch = dimmedNodeIds.size > 0 && dimmedNodeIds.has(node.id);
      const isDimmedByLineage = lineageActive && !highlightedNodeIds.has(node.id);
      const isDimmed = isDimmedBySearch || isDimmedByLineage;
```

Add `lineageActive` and `highlightedNodeIds` to the `useMemo` dependency array.

- [ ] **Step 4: Wire up event handlers**

Replace the three handler callbacks on `<ReactFlow>` (around lines 430-432):

Change:
```typescript
          onPaneClick={() => setContextMenu(null)}
          onNodeClick={() => setContextMenu(null)}
          onEdgeClick={() => setContextMenu(null)}
```

To:
```typescript
          onPaneClick={() => { setContextMenu(null); clearHighlight(); }}
          onNodeClick={() => { setContextMenu(null); clearHighlight(); }}
          onEdgeClick={(event, edge) => { setContextMenu(null); handleLineageEdgeClick(event, edge); }}
```

- [ ] **Step 5: Pass `enhancedEdges` to ReactFlow**

Change (around line 397):
```typescript
          edges={edges}
```

To:
```typescript
          edges={enhancedEdges}
```

- [ ] **Step 6: Wire Escape to clear lineage (with search bar priority)**

In the `shortcutHandlers` useMemo (around line 130-146), add `onEscape`:

```typescript
  const shortcutHandlers = useMemo(
    () => ({
      onDelete: handleDelete,
      onUndo: undo,
      onRedo: redo,
      onSelectAll: handleSelectAll,
      onCopy: handleCopy,
      onPaste: handlePaste,
      onGroup: handleGroup,
      onToggleSearch: () => setSearchBarOpen((s) => !s),
      onToggleActivityLog: () => setActivityLogOpen((o) => !o),
      onZoomToFit: () => fitView(),
      onZoomIn: () => zoomIn(),
      onZoomOut: () => zoomOut(),
      onEscape: () => {
        if (searchBarOpen) {
          setSearchBarOpen(false);
        } else {
          clearHighlight();
        }
      },
    }),
    [handleDelete, undo, redo, handleSelectAll, handleCopy, handlePaste, handleGroup, fitView, zoomIn, zoomOut, searchBarOpen, clearHighlight],
  );
```

- [ ] **Step 7: Verify compilation**

Run: `cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas && npx tsc --noEmit --project frontend/tsconfig.json 2>&1 | head -20`

Expected: No type errors

- [ ] **Step 8: Commit**

```bash
cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas
git add frontend/src/components/CanvasView.tsx
git commit -m "feat: wire lineage highlight into canvas with edge/node dimming"
```

---

### Task 4: Manual Verification

- [ ] **Step 1: Start the app**

```bash
cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas
npm run dev
```

Open `http://localhost:3010` in a browser.

- [ ] **Step 2: Open the "financial portfolio" board (or any board with multiple connected nodes)**

- [ ] **Step 3: Test lineage highlight**

Verify each behavior:
1. Click an edge → the full upstream + downstream chain highlights in bright blue with thicker stroke
2. All non-chain edges and nodes dim to low opacity
3. Click the canvas (empty area) → highlight clears, everything returns to normal
4. Click a node → highlight clears
5. Click a different edge → lineage switches to the new edge's chain
6. Right-click an edge → context menu opens, no lineage triggered
7. Press Escape → lineage clears
8. Open search (Cmd+F), activate lineage, press Escape → search closes first, lineage persists; press Escape again → lineage clears
9. Toggle canvas light/dark mode → accent color adapts

- [ ] **Step 4: Test edge cases**

1. Click an edge on a simple 2-node connection → only that edge + those 2 nodes highlighted
2. Click an edge in a long chain (A→B→C→D) → entire chain highlights
3. Click an edge at a fan-out point → all downstream branches highlight
4. Board with no edges → nothing should break (hook returns empty sets)

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
cd /Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas
git add -A
git commit -m "fix: address lineage highlight issues found during testing"
```

Only commit this if fixes were actually made. Skip if everything passed.
