# CLAUDE.md - InfiniteCanvas

## Project Overview

Local-only infinite whiteboard with MCP server integration. Monorepo: `shared/` + `server/` + `frontend/`.

## Key File Paths

| File | Purpose |
|------|---------|
| `shared/types.ts` | Core types: Board, CanvasNode, CanvasEdge, ActivityEntry, NodeType |
| `server/src/data/boards.ts` | BoardStore class - all CRUD, layout, persistence (JSON files) |
| `server/src/api/routes.ts` | Express REST API (createApp factory) |
| `server/src/mcp/tools.ts` | MCP tool handler (createMcpToolHandler factory) |
| `server/src/mcp/server.ts` | MCP server with tool registrations (14 tools) |
| `server/src/parsers/mermaid.ts` | Mermaid diagram parser |
| `server/src/data/layout.ts` | Dagre-based auto-layout engine |
| `frontend/src/api.ts` | REST client for frontend |
| `frontend/src/components/CanvasView.tsx` | Main canvas component (React Flow) |
| `frontend/src/hooks/useBoard.ts` | Board state management hook (React Flow integration) |
| `frontend/src/hooks/useKeyboardShortcuts.ts` | Keyboard shortcut bindings |

## How to Run

```bash
npm run dev          # Both server (port 3011) and frontend (port 3010)
cd server && npm test  # Run server tests (vitest)
cd server && npm run build  # Compile TypeScript
```

## Data Model

- **Board**: id, name, description, nodes[], edges[], activityLog[], createdAt, updatedAt
- **CanvasNode**: id, type (12 types), label, x, y, width, height, zIndex, style?, parentId?, data?
- **CanvasEdge**: id, source, target, label?, style?
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

## Canvas Interactions (Figma/Miro-style)

- **Click-drag on empty canvas** → selection box
- **Click-drag on a node** → move node (+ selected siblings)
- **Two-finger trackpad scroll** → pan viewport
- **Right-click / middle-click drag** → pan viewport
- **Pinch** → zoom
- **Cmd+click** → toggle add/remove from selection
- **Double-click canvas** → create rectangle node
- **Double-click node** → edit node label

## Node Types

rectangle, circle, ellipse, diamond, hexagon, parallelogram, cylinder, triangle, sticky, text, image, group

## Testing

Tests use vitest. Test files are colocated in `__tests__/` directories:
- `server/src/__tests__/e2e.test.ts` - E2E MCP + REST consistency
- `server/src/mcp/__tests__/tools.test.ts` - MCP tool unit tests
- `server/src/api/__tests__/routes.test.ts` - REST API tests
- `server/src/data/__tests__/boards.test.ts` - BoardStore tests
- `server/src/data/__tests__/layout.test.ts` - Layout engine tests
- `server/src/parsers/__tests__/mermaid.test.ts` - Mermaid parser tests
