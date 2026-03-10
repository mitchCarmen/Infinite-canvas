# InfiniteCanvas

A local-only infinite whiteboard application with a built-in MCP (Model Context Protocol) server. Create, edit, and organize visual diagrams through both a browser UI and Claude-powered AI tools.

## Quick Start

```bash
npm install
cd server && npm install
cd ../frontend && npm install
cd ..
npm run dev
```

Open [http://localhost:3010](http://localhost:3010) in your browser. The server runs on port 3011.

## MCP Setup

To use InfiniteCanvas as an MCP tool server with Claude, add this to `~/.claude/mcp_server_config.json`:

```json
{
  "mcpServers": {
    "infinite-canvas": {
      "command": "node",
      "args": ["/Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/server/dist/server/bin/mcp.js"],
      "env": {
        "BOARDS_DIR": "/Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/boards"
      }
    }
  }
}
```

Build the server first: `cd server && npm run build`

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `create_board` | Create a new canvas board |
| `list_boards` | List all boards |
| `read_board` | Read a board by ID |
| `delete_board` | Delete a board by ID |
| `duplicate_board` | Duplicate a board |
| `create_node` | Create a node on a board |
| `update_node` | Update a node on a board |
| `delete_node` | Delete a node from a board |
| `create_edge` | Create an edge between two nodes |
| `delete_edge` | Delete an edge from a board |
| `create_group` | Create a group containing specified nodes |
| `import_mermaid` | Import a Mermaid diagram into a board |
| `auto_layout` | Auto-layout nodes using dagre |
| `export_board` | Export a board as JSON |

## Architecture

Monorepo with three packages:

```
shared/          Shared TypeScript types (Board, CanvasNode, CanvasEdge, etc.)
server/          Express REST API + MCP stdio server
  src/api/       REST routes
  src/mcp/       MCP tool handler and server
  src/data/      Board storage, layout engine
  src/parsers/   Mermaid diagram parser
  bin/           MCP server entry point
frontend/        React + React Flow UI
  src/components/ Canvas, toolbar, board list, modals
  src/hooks/     Board state management, keyboard shortcuts, custom hooks
  src/api.ts     REST client
```

Data is stored as JSON files in the `boards/` directory (gitignored). No external database required.

## Development

```bash
# Run both server and frontend in dev mode
npm run dev

# Run server tests
cd server && npx vitest run

# Run tests in watch mode
cd server && npx vitest

# Build server
cd server && npm run build

# Build frontend
cd frontend && npm run build
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected elements |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + A` | Select all |
| `Cmd/Ctrl + C` | Copy |
| `Cmd/Ctrl + V` | Paste |
| `Cmd/Ctrl + G` | Group selected nodes |
| `Cmd/Ctrl + F` | Toggle search |
| `Cmd/Ctrl + L` | Toggle activity log |
| `Cmd/Ctrl + 0` | Zoom to fit |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
