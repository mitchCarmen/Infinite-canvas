# CLAUDE.md - InfiniteCanvas

## Project Overview

Local-only infinite whiteboard with MCP server integration. Monorepo: `shared/` + `server/` + `frontend/`.

## Key File Paths

| File | Purpose |
|------|---------|
| `shared/types.ts` | Core types: Board, CanvasNode, CanvasEdge, ActivityEntry, NodeType, VALID_SOURCE/TARGET_HANDLES |
| `server/src/data/boards.ts` | BoardStore class - all CRUD, layout, persistence (JSON files) |
| `server/src/api/routes.ts` | Express REST API (createApp factory) |
| `server/src/mcp/tools.ts` | MCP tool handler (createMcpToolHandler factory) |
| `server/src/mcp/server.ts` | MCP server with tool registrations (14 tools) |
| `server/src/parsers/mermaid.ts` | Mermaid diagram parser |
| `server/src/data/layout.ts` | Dagre-based auto-layout engine |
| `frontend/src/api.ts` | REST client for frontend |
| `frontend/src/components/CanvasView.tsx` | Main canvas component (React Flow) |
| `frontend/src/components/toolbar/NodeFormattingToolbar.tsx` | Node formatting toolbar (shape, font, color, lock, emoji, link) |
| `frontend/src/components/nodes/NodeBadges.tsx` | Emoji, link, and lock badge overlays for nodes |
| `frontend/src/hooks/useBoard.ts` | Board state management hook (React Flow integration) |
| `frontend/src/hooks/useNodeStyle.ts` | Shared style parsing hook for node components (memoized return) |
| `frontend/src/hooks/useKeyboardShortcuts.ts` | Keyboard shortcut bindings |
| `frontend/src/components/nodes/areNodePropsEqual.ts` | Custom React.memo comparator for node components (ignore-list approach) |
| `frontend/src/utils/googleFonts.ts` | Google Fonts on-demand loader |

## How to Run

```bash
npm run dev          # Both server (port 3011) and frontend (port 3010)
cd server && npm test  # Run server tests (vitest)
cd server && npm run build  # Compile TypeScript
```

## Data Model

- **Board**: id, name, description, nodes[], edges[], activityLog[], createdAt, updatedAt
- **CanvasNode**: id, type (12 types), label, x, y, width, height, zIndex, style?, parentId?, data?
- **CanvasEdge**: id, source, target, sourceHandle?, targetHandle?, label?, style?
- **ActivityEntry**: id, timestamp, actor ('user' | 'claude'), action, summary, details?

Boards are stored as individual JSON files in `boards/` directory.

## MCP Tool Patterns

- All MCP tools use `actor = 'claude'` for activity log entries
- All REST API routes use `actor = 'user'`
- Board mutations (create_node, update_node, etc.) return the full board object
- Both MCP and REST share the same BoardStore instance pattern (but separate instances)
- The `createMcpToolHandler` and `createApp` factories both accept a `boardsDir` path

## Known Patterns

- In `toFlowNodes` (`useBoard.ts`), `CanvasNode.data` is spread BEFORE explicit properties to ensure top-level fields (`label`, `style`, `width`, `height`, `nodeType`) always take precedence over anything in the custom `data` record. Never reorder the spread to come after these fields.
- Node style is extracted via `useNodeStyle(data)` — returns fill, borderColor, borderWidth, color, fontSize, fontFamily, fontWeight, textAlign, verticalAlign, locked, link, emoji. All node components use this hook.
- Node text renders via `<foreignObject>` (not SVG `<text>`) to support rich font/alignment. Flex layout handles horizontal/vertical alignment.
- Locked nodes: `draggable: false` in toFlowNodes, NodeResizer hidden, double-click edit blocked in CanvasView, toolbar controls disabled.
- `CanvasNode.data` stores user-defined fields (`locked`, `link`, `emoji`). Internal React Flow fields (`label`, `style`, `width`, `height`, `nodeType`, `boardId`, etc.) are excluded when sending data updates to the server.
- `UpdateNodeOpts` accepts `type?: NodeType`. Changing type auto-resets dimensions to `DEFAULT_NODE_DIMENSIONS[type]` unless width/height are explicitly provided.

## Performance Patterns

- **`useNodeStyle`** returns a `useMemo`'d object — stable reference when underlying primitives haven't changed.
- **All 12 node components + `NodeBadges`** are wrapped in `React.memo`. Node components use a custom `areNodePropsEqual` comparator (ignore-list approach: callbacks and transient props like `boardId`, `nodeId` are skipped; all other `data` keys compared by `===`). `NodeBadges` uses default shallow comparison (all props are primitives).
- **`enhancedNodes` callbacks** (`onFinishEdit`, `onCancelEdit`) are stable `useCallback` refs. `onFinishEdit` captures `refetch` via `refetchRef` (not in its dep array) to avoid invalidating the callback on every board fetch. Callbacks take `nodeId` explicitly — `useNodeEdit` passes it through.
- **`useBoard` bulk updates** only send positions for nodes that actually moved (tracked via `movedIdsRef`), not all nodes. Initial thumbnail capture is deferred to first drag-end.
- **`NodeFormattingToolbar`** does NOT subscribe to `useViewport()` — this was removed to prevent pan/zoom re-renders. Position updates come from `flowToScreenPosition()` via `useReactFlow()`. Style computations are `useMemo`'d on `selectedNodes`. Toolbar is unmounted during drag (`!isDraggingNode` guard in CanvasView).
- **`areNodePropsEqual` scope**: only compares `selected` and `data` fields. Top-level `NodeProps` (positionAbsoluteX/Y, dragging, zIndex) are intentionally not compared — no node component reads them. New visual data fields are compared automatically (safe by default); new internal/callback fields must be added to `IGNORED_DATA_KEYS`.

## Canvas Interactions (Figma/Miro-style)

- **Click-drag on empty canvas** → selection box
- **Click-drag on a node** → move node (+ selected siblings)
- **Two-finger trackpad scroll** → pan viewport
- **Right-click / middle-click drag** → pan viewport
- **Pinch** → zoom
- **Cmd+click** → toggle add/remove from selection
- **Double-click canvas** → create rectangle node
- **Double-click node** → edit node label (blocked if node is locked)
- **Select node(s)** → NodeFormattingToolbar appears above selection (shape, font, color, bold, alignment, link, emoji, lock)

## Node Types

rectangle, circle, ellipse, diamond, hexagon, parallelogram, cylinder, triangle, sticky, text, image, group

## Edge Conventions for Sequential/Directional Flows

When creating boards that show directional or sequential flow (flowcharts, pipelines, processes, decision trees), Claude MUST:

1. **Use `step` routing** with `forward` arrowMode on all edges:
   ```
   style: { routing: 'step', arrowMode: 'forward' }
   ```

2. **Match handle positions to flow direction:**
   - **Left-to-right:** `sourceHandle: 'right-source'`, `targetHandle: 'left-target'`
   - **Top-to-bottom:** `sourceHandle: 'bottom-source'`, `targetHandle: 'top-target'`
   - **Right-to-left:** `sourceHandle: 'left-source'`, `targetHandle: 'right-target'`
   - **Bottom-to-top:** `sourceHandle: 'top-source'`, `targetHandle: 'bottom-target'`

3. **Space nodes ≥200px apart** in the flow direction for clean step-routed paths

4. **Use `auto_layout`** with matching direction (`LR`, `TB`, etc.) when laying out the board

5. **One edge per node pair** — the system does not allow multiple edges between the same source/target pair, even on different handles

The goal is circuit-board aesthetics: clean right-angle routing, inputs on the approach side, outputs on the departure side, and the viewer's eye follows the sequence naturally.

## Testing

Tests use vitest. Test files are colocated in `__tests__/` directories:
- `server/src/__tests__/e2e.test.ts` - E2E MCP + REST consistency
- `server/src/mcp/__tests__/tools.test.ts` - MCP tool unit tests
- `server/src/api/__tests__/routes.test.ts` - REST API tests
- `server/src/data/__tests__/boards.test.ts` - BoardStore tests
- `server/src/data/__tests__/layout.test.ts` - Layout engine tests
- `server/src/parsers/__tests__/mermaid.test.ts` - Mermaid parser tests
