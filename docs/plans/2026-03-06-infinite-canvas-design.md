# InfiniteCanvas Design Document

**Date:** 2026-03-06
**Status:** Approved
**Author:** Mitch Carmen

## Overview

InfiniteCanvas is a standalone, local-only infinite whiteboard app with a built-in MCP server. It lets users create and manipulate visual diagrams through both a browser UI and Claude Code's MCP tools. Claude can push diagrams, read board state, and import Mermaid syntax. Users can manually drag, rearrange, connect, and style nodes.

## Goals

- Local-first, zero-auth, no Docker dependency
- Bidirectional: Claude reads and writes board state via MCP; users interact via browser UI
- Persistent boards across sessions (JSON files)
- Extensible Mermaid import (flowcharts, sequence diagrams, ERDs)
- Production-grade UX: undo/redo, multi-select, keyboard shortcuts, snap-to-grid, export

## Architecture: Approach C — Monorepo, Shared Data Layer

Single repo with a shared data layer imported by both the REST API and the MCP server. The MCP server reads/writes JSON files directly — no running web server required for Claude.

### Directory Layout

```
infinite-canvas/
├── frontend/                # Vite + React + TypeScript
│   ├── src/
│   │   ├── components/      # React Flow canvas, custom nodes, toolbar
│   │   ├── hooks/           # useBoard, useApi, useUndoRedo, etc.
│   │   ├── types/           # Re-exports from shared/
│   │   └── App.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── api/             # Express REST routes
│   │   │   └── routes.ts
│   │   ├── data/            # Board CRUD, JSON file I/O
│   │   │   ├── boards.ts    # create, read, update, delete, list
│   │   │   └── layout.ts    # auto-layout via dagre
│   │   ├── mcp/
│   │   │   ├── server.ts    # MCP server definition + tool registry
│   │   │   └── tools.ts     # Tool implementations (thin wrappers around data/)
│   │   ├── parsers/
│   │   │   └── mermaid.ts   # Mermaid -> nodes+edges converter
│   │   └── index.ts         # Express app entry (serves API + static frontend)
│   ├── bin/
│   │   └── mcp.ts           # stdio MCP entry point
│   ├── package.json
│   └── tsconfig.json
├── boards/                  # JSON board files (gitignored)
├── shared/
│   └── types.ts             # Board, Node, Edge type definitions
├── package.json             # Root: workspace scripts
├── .envrc
├── .gitignore
└── README.md
```

## Data Model

### shared/types.ts

```typescript
type NodeType =
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'diamond'
  | 'hexagon'
  | 'parallelogram'
  | 'cylinder'
  | 'triangle'
  | 'sticky'
  | 'text'
  | 'image'
  | 'group';

interface CanvasNode {
  id: string;                          // uuid
  type: NodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;                      // layering order, higher = in front
  style?: Record<string, string>;      // fill, border, fontSize, textColor, etc.
  parentId?: string;                   // group membership
  data?: Record<string, unknown>;      // type-specific (e.g., imageUrl, fields for ERD)
}

interface CanvasEdge {
  id: string;
  source: string;                      // node id
  target: string;                      // node id
  label?: string;
  style?: Record<string, string>;      // routing: 'straight' | 'step' | 'bezier'
}

interface ActivityEntry {
  id: string;
  timestamp: string;                   // ISO 8601
  actor: 'user' | 'claude';           // REST API calls = user, MCP calls = claude
  action: string;                      // e.g., "created_node", "moved_nodes"
  summary: string;                     // human-readable description
  details?: Record<string, unknown>;   // affected node/edge IDs, etc.
}

interface Board {
  id: string;                          // uuid
  name: string;
  description?: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  activityLog: ActivityEntry[];
  createdAt: string;                   // ISO 8601
  updatedAt: string;
}
```

### Persistence

- Each board stored as `boards/{id}.json`
- `boards/index.json` keeps a lightweight list: `{ id, name, updatedAt, thumbnail? }` for fast listing
- Image assets stored in `boards/assets/` referenced by relative path
- Atomic writes: write to temp file, rename over target to prevent corruption

## MCP Server

### Registration

Registered globally in `~/.claude/mcp_server_config.json`:

```json
{
  "infinite-canvas": {
    "command": "node",
    "args": ["<project-path>/server/dist/bin/mcp.js"],
    "env": {
      "BOARDS_DIR": "<project-path>/boards"
    }
  }
}
```

Runs via stdio. Imports the data layer directly — no HTTP dependency.

### Tool Catalog

| Tool | Args | Description |
|------|------|-------------|
| `create_board` | `name`, `description?` | Create new empty board, returns board id |
| `list_boards` | -- | List all boards (id, name, updatedAt) |
| `read_board` | `boardId` | Full board state + recent activity log entries |
| `delete_board` | `boardId` | Delete a board |
| `duplicate_board` | `boardId`, `newName?` | Clone a board |
| `create_node` | `boardId`, `type`, `label`, `x?`, `y?`, `width?`, `height?`, `style?`, `parentId?`, `data?` | Add a node (position optional, defaults to 0,0) |
| `update_node` | `boardId`, `nodeId`, partial fields | Update any node properties (position, label, style, zIndex) |
| `delete_node` | `boardId`, `nodeId` | Remove node and its connected edges |
| `create_edge` | `boardId`, `source`, `target`, `label?`, `style?` | Connect two nodes |
| `delete_edge` | `boardId`, `edgeId` | Remove an edge |
| `create_group` | `boardId`, `label`, `nodeIds` | Create group frame containing specified nodes, auto-sized |
| `import_mermaid` | `boardId`, `mermaidSyntax`, `offsetX?`, `offsetY?` | Parse Mermaid into nodes+edges, add to board |
| `auto_layout` | `boardId`, `direction?` (TB/LR/BT/RL) | Run dagre layout, update node positions |
| `export_board` | `boardId`, `format` (png/svg) | Export board as image, returns file path |

### Mermaid Parser Scope

Three diagram types:

- **Flowcharts** -- `graph TD/LR`, node shapes (`[]`, `()`, `{}`, `(())`, `[[]]`, `>]`), edges with labels (`-->`, `--text-->`, `-.->`, `==>`). Mermaid shapes map to NodeType (e.g., `{decision}` -> diamond, `[(db)]` -> cylinder).
- **Sequence diagrams** -- Participants become nodes arranged left-to-right, messages become labeled edges.
- **ERDs** -- Entities become rectangle nodes with field data, relationships become edges with cardinality labels.

Best-effort parsing: partial failures return what parsed successfully + warnings for unparsed lines.

## REST API

Served by Express on `:3010`. Mirrors MCP tools. All mutations tagged with `actor: 'user'` in the activity log.

```
GET    /api/boards                          -> list boards
POST   /api/boards                          -> create board
GET    /api/boards/:id                      -> read board
DELETE /api/boards/:id                      -> delete board
POST   /api/boards/:id/duplicate            -> duplicate board
PATCH  /api/boards/:id/nodes                -> bulk update nodes (positions after drag)
POST   /api/boards/:id/nodes                -> create node
PATCH  /api/boards/:id/nodes/:nodeId        -> update node
DELETE /api/boards/:id/nodes/:nodeId        -> delete node
POST   /api/boards/:id/nodes/:nodeId/reorder -> layering (bring_to_front/send_to_back/bring_forward/send_backward)
POST   /api/boards/:id/edges                -> create edge
DELETE /api/boards/:id/edges/:edgeId        -> delete edge
POST   /api/boards/:id/groups               -> create group
POST   /api/boards/:id/import-mermaid       -> import mermaid
POST   /api/boards/:id/auto-layout          -> run auto-layout
POST   /api/boards/:id/export               -> export as PNG/SVG
```

Express serves the built frontend as static files in production.

## Frontend

### Stack

Vite + React 18 + TypeScript + React Flow

### Key Components

- **BoardList** -- Landing page. Board cards with thumbnails, create/delete/duplicate. Empty state with "Create your first board" prompt.
- **CanvasView** -- React Flow canvas with minimap, controls, background grid.
- **Custom node components** -- One per NodeType, each renders its shape via SVG. Four `<Handle>` elements (top/bottom/left/right) for connection anchors.
- **Toolbar** -- Drag-to-place node shapes, import Mermaid (textarea modal), auto-layout, export, grid snap toggle, activity log toggle.
- **FloatingStyleBar** -- Appears on selection: fill color, border color, border width, font size, text color. Preset palette + hex input.
- **ContextMenu** -- Right-click menus for nodes (edit, style, layer, duplicate, group, delete), edges (edit label, routing, delete), and canvas (paste, add node, zoom-to-fit, toggle grid).
- **ActivityLogDrawer** -- Collapsible right-side panel (Ctrl+L). Shows entries in reverse chronological order with actor badge (color-coded) and timestamp.
- **SearchBar** -- Ctrl+F. Filters nodes by label, highlights matches, dims non-matches, Enter cycles and pans to each match.

### UX Features

#### Editing
- **Undo/Redo** -- Command stack tracking all mutations. Ctrl+Z / Ctrl+Shift+Z. In-memory per session.
- **Multi-select + bulk operations** -- Box select (drag on empty canvas) and Shift+click. Move, delete, group, or style selected nodes together via single API call.
- **Copy/paste** -- Ctrl+C captures selected nodes+edges. Ctrl+V duplicates with (20,20) offset. Works within and across boards.
- **Double-click to edit** -- Double-click node for inline label editing. Double-click empty canvas creates sticky note. Escape/click-away commits.
- **Node resize handles** -- Drag corners/edges to resize. Minimum size per type. Groups auto-expand but allow manual resize.

#### Navigation
- **Pan controls** -- Space+drag to pan (Figma convention). Middle-click+drag also pans. Scroll-to-pan disabled.
- **Touch/trackpad gestures** -- Pinch-to-zoom, two-finger pan via React Flow config.
- **Zoom-to-fit** -- Toolbar button + Ctrl+0. Calls React Flow `fitView()` with padding.
- **Viewport persistence** -- Save `{ x, y, zoom }` to localStorage per board ID. Restore on load.

#### Visual
- **Snap-to-grid + alignment guides** -- Configurable grid (default 20px), toggleable. Alignment lines shown when node edges/centers align with neighbors during drag.
- **Node anchors/ports** -- Four connection points per node. Edges snap to nearest anchor.
- **Edge routing** -- Three modes per edge: straight, step (orthogonal), bezier (default). Selectable via context menu or `style.routing`.
- **Node text overflow** -- Auto-size node width to fit label. Truncate with tooltip on hover when exceeding max width.
- **Board thumbnails** -- Board list shows small preview per board. Generated on save via html-to-image, stored as data URI in index.

#### Interaction
- **Drag-to-place from toolbar** -- Drag a shape type from toolbar onto canvas to place it at drop position. Click-to-add fallback places at viewport center.
- **Confirmation dialogs** -- Delete board, delete node, clear board prompt "Are you sure?" before executing.
- **Toast notifications** -- Success/error/warning toasts for: save, import results, API errors, clipboard operations.
- **Drag-and-drop image upload** -- Drag image file from Finder onto canvas. Stored in `boards/assets/`, creates image node at drop position.
- **Connection validation** -- No self-loops, no duplicate edges, no edges into group frames. Red indicator on invalid targets, green on valid.

#### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Delete / Backspace | Delete selected |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+A | Select all |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+G | Group selected |
| Ctrl+F | Search |
| Ctrl+L | Toggle activity log |
| Ctrl+0 | Zoom to fit |
| +/- | Zoom in/out |

#### Polish
- **Loading/empty states** -- Empty board list: "Create your first board" prompt. Empty board: hint text. Loading spinner during API calls.
- **Responsive canvas** -- Toolbar/sidebar reflow on window resize. Canvas fills remaining space.

## Auto-Layout

Uses **dagre** (lightweight, no native dependencies).

- Accepts `direction`: TB, LR, BT, RL (default TB)
- Builds dagre graph from board nodes+edges, runs layout, writes new x/y positions
- Group nodes: children laid out within group bounds, group frame resized to fit
- Disconnected nodes placed in a row below/beside the main graph
- Preserves zIndex values -- layout only changes position

## Error Handling

- **Data layer:** File not found -> clear error. Malformed JSON -> log warning, return error.
- **MCP tools:** Structured error responses per MCP spec.
- **REST API:** Standard HTTP status codes (404, 400, 500). JSON `{ error: string }` body.
- **Mermaid parser:** Best-effort. Partial failures return parsed content + warning listing unparsed lines.
- **File writes:** Atomic rename (temp file -> target) to prevent corruption.

## Activity Log

Every mutation (from UI or MCP) is recorded in the board's `activityLog` array:

- REST API calls tagged `actor: 'user'`
- MCP tool calls tagged `actor: 'claude'`
- `read_board` MCP tool returns recent log entries so Claude has context on recent changes
- UI displays log in a collapsible right-side drawer (Ctrl+L), reverse chronological, with color-coded actor badges

## Out of Scope (V1)

- Authentication / multi-user
- Real-time collaboration / WebSockets
- Custom themes beyond per-node style
- Plugin system

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Vite, React 18, TypeScript, React Flow, html-to-image |
| Backend | Node.js, Express, TypeScript |
| MCP | @modelcontextprotocol/sdk (stdio) |
| Layout | dagre |
| Persistence | JSON files |
| Port | localhost:3010 |
