# InfiniteCanvas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-only infinite whiteboard app with a built-in MCP server, React Flow frontend, and full UX feature set.

**Architecture:** Monorepo with shared data layer. Server (Express + MCP) and frontend (Vite + React Flow) share types. MCP server imports data layer directly for stdio operation. JSON file persistence.

**Tech Stack:** React 18, TypeScript, Vite, React Flow, Express, @modelcontextprotocol/sdk, dagre, html-to-image, vitest

**Design Doc:** `docs/plans/2026-03-06-infinite-canvas-design.md`

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `shared/types.ts`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `.gitignore`
- Create: `.envrc`

**Step 1: Create root package.json with workspace scripts**

```json
{
  "name": "infinite-canvas",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:frontend\"",
    "dev:server": "cd server && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd server && npm run build && cd ../frontend && npm run build",
    "test": "cd server && npm test",
    "test:watch": "cd server && npm run test:watch"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

**Step 2: Create shared/types.ts with all type definitions**

```typescript
export type NodeType =
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

export interface CanvasNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  style?: Record<string, string>;
  parentId?: string;
  data?: Record<string, unknown>;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: Record<string, string>;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor: 'user' | 'claude';
  action: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  activityLog: ActivityEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardIndex {
  id: string;
  name: string;
  updatedAt: string;
  thumbnail?: string;
}

export type ReorderAction = 'bring_to_front' | 'send_to_back' | 'bring_forward' | 'send_backward';

export const DEFAULT_NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  rectangle: { width: 150, height: 80 },
  circle: { width: 100, height: 100 },
  ellipse: { width: 140, height: 80 },
  diamond: { width: 120, height: 120 },
  hexagon: { width: 130, height: 100 },
  parallelogram: { width: 150, height: 80 },
  cylinder: { width: 100, height: 120 },
  triangle: { width: 120, height: 100 },
  sticky: { width: 200, height: 200 },
  text: { width: 150, height: 40 },
  image: { width: 200, height: 200 },
  group: { width: 400, height: 300 },
};
```

**Step 3: Create server/package.json**

```json
{
  "name": "infinite-canvas-server",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "mcp": "node dist/bin/mcp.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "cors": "^2.8.5",
    "dagre": "^0.8.5",
    "express": "^4.21.2",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/dagre": "^0.7.52",
    "@types/express": "^5.0.0",
    "@types/node": "^22.13.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 4: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*", "bin/**/*", "../shared/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 5: Create frontend scaffolding**

`frontend/package.json`:
```json
{
  "name": "infinite-canvas-frontend",
  "private": true,
  "scripts": {
    "dev": "vite --port 3010",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@xyflow/react": "^12.6.0",
    "html-to-image": "^1.11.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.1.0"
  }
}
```

`frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3010,
    proxy: {
      '/api': 'http://localhost:3011',
    },
  },
  resolve: {
    alias: {
      '@shared': '../shared',
    },
  },
});
```

Note: Dev mode runs Vite on :3010 and proxies `/api` to Express on :3011. Production mode has Express serve the built frontend on :3010.

`frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>InfiniteCanvas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*", "../shared/**/*"]
}
```

**Step 6: Create .gitignore**

```
node_modules/
dist/
boards/
*.log
.env
.DS_Store
frontend/build/
```

**Step 7: Create .envrc**

```bash
# No secrets needed for local-only app
# Add 1Password op read calls here if external integrations are added later
export BOARDS_DIR="$(pwd)/boards"
export PORT=3011
```

**Step 8: Install dependencies and verify**

Run: `npm install && cd server && npm install && cd ../frontend && npm install`

**Step 9: Create boards/ directory with .gitkeep**

Run: `mkdir -p boards && touch boards/.gitkeep`

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold project structure with shared types"
```

---

### Task 2: Data Layer — Board CRUD

**Files:**
- Create: `server/src/data/boards.ts`
- Create: `server/src/data/activity.ts`
- Test: `server/src/data/__tests__/boards.test.ts`

**Step 1: Write failing tests for board CRUD**

`server/src/data/__tests__/boards.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BoardStore } from '../boards.js';

describe('BoardStore', () => {
  let store: BoardStore;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ic-test-'));
    store = new BoardStore(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  describe('createBoard', () => {
    it('creates a board and returns it', async () => {
      const board = await store.createBoard('Test Board', 'claude', 'A description');
      expect(board.name).toBe('Test Board');
      expect(board.description).toBe('A description');
      expect(board.nodes).toEqual([]);
      expect(board.edges).toEqual([]);
      expect(board.activityLog).toHaveLength(1);
      expect(board.activityLog[0].actor).toBe('claude');
      expect(board.activityLog[0].action).toBe('created_board');
    });
  });

  describe('listBoards', () => {
    it('returns empty array when no boards exist', async () => {
      const boards = await store.listBoards();
      expect(boards).toEqual([]);
    });

    it('lists created boards', async () => {
      await store.createBoard('Board 1', 'user');
      await store.createBoard('Board 2', 'claude');
      const boards = await store.listBoards();
      expect(boards).toHaveLength(2);
      expect(boards.map(b => b.name)).toContain('Board 1');
      expect(boards.map(b => b.name)).toContain('Board 2');
    });
  });

  describe('readBoard', () => {
    it('reads a board by id', async () => {
      const created = await store.createBoard('Test', 'user');
      const read = await store.readBoard(created.id);
      expect(read).toEqual(created);
    });

    it('throws for nonexistent board', async () => {
      await expect(store.readBoard('nonexistent')).rejects.toThrow('Board not found');
    });
  });

  describe('deleteBoard', () => {
    it('deletes a board', async () => {
      const board = await store.createBoard('Test', 'user');
      await store.deleteBoard(board.id);
      const boards = await store.listBoards();
      expect(boards).toHaveLength(0);
    });
  });

  describe('duplicateBoard', () => {
    it('duplicates a board with a new name', async () => {
      const original = await store.createBoard('Original', 'user');
      await store.createNode(original.id, { type: 'rectangle', label: 'Node 1' }, 'user');
      const dupe = await store.duplicateBoard(original.id, 'user', 'Copy');
      expect(dupe.name).toBe('Copy');
      expect(dupe.nodes).toHaveLength(1);
      expect(dupe.id).not.toBe(original.id);
      expect(dupe.nodes[0].id).not.toBe(original.nodes[0]?.id);
    });
  });

  describe('createNode', () => {
    it('adds a node to a board', async () => {
      const board = await store.createBoard('Test', 'user');
      const updated = await store.createNode(board.id, {
        type: 'rectangle',
        label: 'My Node',
        x: 100,
        y: 200,
      }, 'user');
      expect(updated.nodes).toHaveLength(1);
      expect(updated.nodes[0].label).toBe('My Node');
      expect(updated.nodes[0].x).toBe(100);
      expect(updated.nodes[0].y).toBe(200);
      expect(updated.nodes[0].zIndex).toBe(1);
    });

    it('assigns incremental zIndex', async () => {
      const board = await store.createBoard('Test', 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      const updated = await store.createNode(board.id, { type: 'circle', label: 'B' }, 'user');
      expect(updated.nodes[1].zIndex).toBe(2);
    });
  });

  describe('updateNode', () => {
    it('updates node properties', async () => {
      const board = await store.createBoard('Test', 'user');
      const withNode = await store.createNode(board.id, { type: 'rectangle', label: 'Old' }, 'user');
      const nodeId = withNode.nodes[0].id;
      const updated = await store.updateNode(board.id, nodeId, { label: 'New', x: 50 }, 'user');
      expect(updated.nodes[0].label).toBe('New');
      expect(updated.nodes[0].x).toBe(50);
    });

    it('throws for nonexistent node', async () => {
      const board = await store.createBoard('Test', 'user');
      await expect(store.updateNode(board.id, 'fake', { label: 'X' }, 'user'))
        .rejects.toThrow('Node not found');
    });
  });

  describe('deleteNode', () => {
    it('removes node and its connected edges', async () => {
      const board = await store.createBoard('Test', 'user');
      const b1 = await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      const b2 = await store.createNode(board.id, { type: 'rectangle', label: 'B' }, 'user');
      const nodeA = b2.nodes[0].id;
      const nodeB = b2.nodes[1].id;
      await store.createEdge(board.id, nodeA, nodeB, 'user');
      const updated = await store.deleteNode(board.id, nodeA, 'user');
      expect(updated.nodes).toHaveLength(1);
      expect(updated.edges).toHaveLength(0);
    });
  });

  describe('createEdge', () => {
    it('connects two nodes', async () => {
      const board = await store.createBoard('Test', 'user');
      const b1 = await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      const b2 = await store.createNode(board.id, { type: 'rectangle', label: 'B' }, 'user');
      const updated = await store.createEdge(board.id, b2.nodes[0].id, b2.nodes[1].id, 'user', 'connects');
      expect(updated.edges).toHaveLength(1);
      expect(updated.edges[0].label).toBe('connects');
    });

    it('rejects self-loops', async () => {
      const board = await store.createBoard('Test', 'user');
      const b1 = await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      const nodeId = b1.nodes[0].id;
      await expect(store.createEdge(board.id, nodeId, nodeId, 'user'))
        .rejects.toThrow('Self-loops not allowed');
    });

    it('rejects duplicate edges', async () => {
      const board = await store.createBoard('Test', 'user');
      const b1 = await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      const b2 = await store.createNode(board.id, { type: 'rectangle', label: 'B' }, 'user');
      const [nA, nB] = [b2.nodes[0].id, b2.nodes[1].id];
      await store.createEdge(board.id, nA, nB, 'user');
      await expect(store.createEdge(board.id, nA, nB, 'user'))
        .rejects.toThrow('Duplicate edge');
    });
  });

  describe('reorderNode', () => {
    it('brings node to front', async () => {
      const board = await store.createBoard('Test', 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'B' }, 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'C' }, 'user');
      const b = await store.readBoard(board.id);
      const nodeA = b.nodes[0].id;
      const updated = await store.reorderNode(board.id, nodeA, 'bring_to_front', 'user');
      const reordered = updated.nodes.find(n => n.id === nodeA)!;
      expect(reordered.zIndex).toBe(4);
    });

    it('sends node to back', async () => {
      const board = await store.createBoard('Test', 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'B' }, 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'C' }, 'user');
      const b = await store.readBoard(board.id);
      const nodeC = b.nodes[2].id;
      const updated = await store.reorderNode(board.id, nodeC, 'send_to_back', 'user');
      const reordered = updated.nodes.find(n => n.id === nodeC)!;
      const minZ = Math.min(...updated.nodes.map(n => n.zIndex));
      expect(reordered.zIndex).toBe(minZ);
    });
  });

  describe('createGroup', () => {
    it('creates a group frame containing specified nodes', async () => {
      const board = await store.createBoard('Test', 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'A', x: 0, y: 0 }, 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'B', x: 200, y: 200 }, 'user');
      const b = await store.readBoard(board.id);
      const nodeIds = b.nodes.map(n => n.id);
      const updated = await store.createGroup(board.id, 'My Group', nodeIds, 'user');
      const group = updated.nodes.find(n => n.type === 'group')!;
      expect(group).toBeDefined();
      expect(group.label).toBe('My Group');
      const children = updated.nodes.filter(n => n.parentId === group.id);
      expect(children).toHaveLength(2);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/data/__tests__/boards.test.ts`
Expected: FAIL — `BoardStore` does not exist.

**Step 3: Create activity helper**

`server/src/data/activity.ts`:
```typescript
import { v4 as uuid } from 'uuid';
import type { ActivityEntry } from '../../shared/types.js';

export function createActivity(
  actor: 'user' | 'claude',
  action: string,
  summary: string,
  details?: Record<string, unknown>,
): ActivityEntry {
  return {
    id: uuid(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    summary,
    details,
  };
}
```

**Step 4: Implement BoardStore**

`server/src/data/boards.ts` — Full implementation of `BoardStore` class with methods:
- `createBoard(name, actor, description?)`
- `listBoards()`
- `readBoard(boardId)`
- `deleteBoard(boardId)`
- `duplicateBoard(boardId, actor, newName?)`
- `createNode(boardId, opts, actor)`
- `updateNode(boardId, nodeId, updates, actor)`
- `bulkUpdateNodes(boardId, updates[], actor)`
- `deleteNode(boardId, nodeId, actor)`
- `createEdge(boardId, source, target, actor, label?, style?)`
- `deleteEdge(boardId, edgeId, actor)`
- `reorderNode(boardId, nodeId, action, actor)`
- `createGroup(boardId, label, nodeIds, actor)`

Internals:
- `_readBoardFile(id)` — reads and parses `{boardsDir}/{id}.json`
- `_writeBoardFile(board)` — atomic write (write to `.tmp`, rename)
- `_readIndex()` / `_writeIndex(entries)` — manages `index.json`
- All mutating methods append to `board.activityLog` and update `board.updatedAt`
- `createNode` defaults: `x=0, y=0`, `width/height` from `DEFAULT_NODE_DIMENSIONS`, `zIndex = max(existing) + 1`
- `deleteNode` cascades: removes all edges where `source` or `target` matches
- `createEdge` validates: no self-loops, no duplicates, source/target must exist, target not a group
- `reorderNode` implements bring_to_front (max+1), send_to_back (min-1), bring_forward (swap with next higher), send_backward (swap with next lower)
- `createGroup` computes bounding box of children + padding, creates group node, sets `parentId` on children
- `duplicateBoard` deep-clones nodes/edges, generates fresh UUIDs, remaps edge source/target to new node IDs

**Step 5: Run tests to verify they pass**

Run: `cd server && npx vitest run src/data/__tests__/boards.test.ts`
Expected: All tests PASS.

**Step 6: Commit**

```bash
git add server/src/data/ shared/types.ts
git commit -m "feat: implement board data layer with CRUD, nodes, edges, groups"
```

---

### Task 3: Auto-Layout Engine

**Files:**
- Create: `server/src/data/layout.ts`
- Test: `server/src/data/__tests__/layout.test.ts`

**Step 1: Write failing tests**

`server/src/data/__tests__/layout.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { autoLayout } from '../layout.js';
import type { CanvasNode, CanvasEdge } from '../../../shared/types.js';

describe('autoLayout', () => {
  it('assigns positions to nodes in a simple chain', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'rectangle', label: 'A', x: 0, y: 0, width: 150, height: 80, zIndex: 1 },
      { id: 'b', type: 'rectangle', label: 'B', x: 0, y: 0, width: 150, height: 80, zIndex: 2 },
    ];
    const edges: CanvasEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const result = autoLayout(nodes, edges, 'TB');
    expect(result[0].x).not.toBe(result[1].x) || expect(result[0].y).not.toBe(result[1].y);
    // In TB layout, A should be above B
    expect(result.find(n => n.id === 'a')!.y).toBeLessThan(result.find(n => n.id === 'b')!.y);
  });

  it('preserves zIndex values', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'rectangle', label: 'A', x: 0, y: 0, width: 150, height: 80, zIndex: 5 },
      { id: 'b', type: 'rectangle', label: 'B', x: 0, y: 0, width: 150, height: 80, zIndex: 10 },
    ];
    const edges: CanvasEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const result = autoLayout(nodes, edges, 'TB');
    expect(result.find(n => n.id === 'a')!.zIndex).toBe(5);
    expect(result.find(n => n.id === 'b')!.zIndex).toBe(10);
  });

  it('handles LR direction', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'rectangle', label: 'A', x: 0, y: 0, width: 150, height: 80, zIndex: 1 },
      { id: 'b', type: 'rectangle', label: 'B', x: 0, y: 0, width: 150, height: 80, zIndex: 2 },
    ];
    const edges: CanvasEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const result = autoLayout(nodes, edges, 'LR');
    expect(result.find(n => n.id === 'a')!.x).toBeLessThan(result.find(n => n.id === 'b')!.x);
  });

  it('positions disconnected nodes in a row', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'rectangle', label: 'A', x: 0, y: 0, width: 150, height: 80, zIndex: 1 },
      { id: 'b', type: 'rectangle', label: 'B', x: 0, y: 0, width: 150, height: 80, zIndex: 2 },
      { id: 'orphan', type: 'circle', label: 'O', x: 0, y: 0, width: 100, height: 100, zIndex: 3 },
    ];
    const edges: CanvasEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const result = autoLayout(nodes, edges, 'TB');
    const orphan = result.find(n => n.id === 'orphan')!;
    const maxY = Math.max(...result.filter(n => n.id !== 'orphan').map(n => n.y));
    // Orphan should be placed below the graph
    expect(orphan.y).toBeGreaterThanOrEqual(maxY);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/data/__tests__/layout.test.ts`
Expected: FAIL

**Step 3: Implement autoLayout**

`server/src/data/layout.ts`:
```typescript
import dagre from 'dagre';
import type { CanvasNode, CanvasEdge } from '../../shared/types.js';

type Direction = 'TB' | 'LR' | 'BT' | 'RL';

export function autoLayout(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  direction: Direction = 'TB',
): CanvasNode[] {
  // Separate connected vs disconnected nodes
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const connectedNodes = nodes.filter(n => connectedIds.has(n.id));
  const disconnectedNodes = nodes.filter(n => !connectedIds.has(n.id));

  // Build dagre graph for connected nodes
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of connectedNodes) {
    g.setNode(node.id, { width: node.width, height: node.height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Build result map
  const result = new Map<string, CanvasNode>();
  for (const node of connectedNodes) {
    const pos = g.node(node.id);
    result.set(node.id, {
      ...node,
      x: pos.x - node.width / 2,
      y: pos.y - node.height / 2,
    });
  }

  // Place disconnected nodes in a row below
  let maxY = 0;
  for (const n of result.values()) {
    maxY = Math.max(maxY, n.y + n.height);
  }

  let offsetX = 0;
  const orphanY = connectedNodes.length > 0 ? maxY + 80 : 0;
  for (const node of disconnectedNodes) {
    result.set(node.id, { ...node, x: offsetX, y: orphanY });
    offsetX += node.width + 40;
  }

  return nodes.map(n => result.get(n.id)!);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/data/__tests__/layout.test.ts`
Expected: All PASS.

**Step 5: Wire auto-layout into BoardStore**

Add `autoLayout(boardId, direction, actor)` method to `BoardStore` that reads the board, calls `autoLayout()`, writes updated nodes back.

**Step 6: Commit**

```bash
git add server/src/data/layout.ts server/src/data/__tests__/layout.test.ts
git commit -m "feat: add dagre-based auto-layout engine"
```

---

### Task 4: Mermaid Parser

**Files:**
- Create: `server/src/parsers/mermaid.ts`
- Test: `server/src/parsers/__tests__/mermaid.test.ts`

**Step 1: Write failing tests for flowchart parsing**

`server/src/parsers/__tests__/mermaid.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseMermaid } from '../mermaid.js';

describe('parseMermaid', () => {
  describe('flowcharts', () => {
    it('parses simple flowchart', () => {
      const result = parseMermaid(`graph TD
        A[Start] --> B[Process]
        B --> C[End]`);
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.warnings).toHaveLength(0);
    });

    it('maps shapes to node types', () => {
      const result = parseMermaid(`graph TD
        A[Rectangle]
        B(Rounded)
        C{Diamond}
        D((Circle))
        E[(Cylinder)]
        F{{Hexagon}}`);
      expect(result.nodes.find(n => n.label === 'Rectangle')?.type).toBe('rectangle');
      expect(result.nodes.find(n => n.label === 'Diamond')?.type).toBe('diamond');
      expect(result.nodes.find(n => n.label === 'Circle')?.type).toBe('circle');
      expect(result.nodes.find(n => n.label === 'Cylinder')?.type).toBe('cylinder');
      expect(result.nodes.find(n => n.label === 'Hexagon')?.type).toBe('hexagon');
    });

    it('parses edge labels', () => {
      const result = parseMermaid(`graph TD
        A --> |yes| B
        A --> |no| C`);
      expect(result.edges.find(e => e.label === 'yes')).toBeDefined();
      expect(result.edges.find(e => e.label === 'no')).toBeDefined();
    });

    it('returns warnings for unparseable lines', () => {
      const result = parseMermaid(`graph TD
        A --> B
        ??? invalid line ???`);
      expect(result.nodes).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('sequence diagrams', () => {
    it('parses participants as nodes', () => {
      const result = parseMermaid(`sequenceDiagram
        participant A as Alice
        participant B as Bob
        A->>B: Hello
        B-->>A: Hi back`);
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes.find(n => n.label === 'Alice')).toBeDefined();
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].label).toBe('Hello');
    });
  });

  describe('ERDs', () => {
    it('parses entities and relationships', () => {
      const result = parseMermaid(`erDiagram
        CUSTOMER ||--o{ ORDER : places
        ORDER ||--|{ LINE-ITEM : contains`);
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].label).toContain('places');
    });
  });

  describe('offset', () => {
    it('applies offset to all node positions', () => {
      const result = parseMermaid(`graph TD\n  A --> B`, 100, 200);
      for (const node of result.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(100);
        expect(node.y).toBeGreaterThanOrEqual(200);
      }
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/parsers/__tests__/mermaid.test.ts`
Expected: FAIL

**Step 3: Implement Mermaid parser**

`server/src/parsers/mermaid.ts` — implements `parseMermaid(syntax, offsetX?, offsetY?)`:

- Detects diagram type from first line (`graph`, `sequenceDiagram`, `erDiagram`)
- **Flowchart parser:** Regex-based line parser. Extracts node definitions (ID + shape brackets + label), edge definitions (source, arrow type, target, optional label). Maps bracket patterns to `NodeType`. Runs `autoLayout` on result.
- **Sequence parser:** Extracts `participant` lines → nodes. Message lines (`A->>B: text`) → edges with labels. Nodes arranged left-to-right.
- **ERD parser:** Extracts entity names from relationship lines → nodes. Relationship lines → edges with cardinality + label. Runs `autoLayout` on result.
- Returns `{ nodes: CanvasNode[], edges: CanvasEdge[], warnings: string[] }`
- Unparseable lines added to `warnings` array, parsing continues

**Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/parsers/__tests__/mermaid.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add server/src/parsers/
git commit -m "feat: add Mermaid parser for flowcharts, sequence diagrams, ERDs"
```

---

## Phase 2: Server

### Task 5: REST API

**Files:**
- Create: `server/src/api/routes.ts`
- Create: `server/src/index.ts`
- Test: `server/src/api/__tests__/routes.test.ts`

**Step 1: Write failing tests for key API routes**

`server/src/api/__tests__/routes.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createApp } from '../routes.js';

// Use a lightweight fetch-based test approach
// Tests call the Express app directly via supertest or node --test

describe('REST API', () => {
  let app: ReturnType<typeof createApp>;
  let tmpDir: string;
  let baseUrl: string;
  let server: any;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ic-api-test-'));
    app = createApp(tmpDir);
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    server.close();
    rmSync(tmpDir, { recursive: true });
  });

  it('POST /api/boards creates a board', async () => {
    const res = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Board' }),
    });
    expect(res.status).toBe(201);
    const board = await res.json();
    expect(board.name).toBe('Test Board');
  });

  it('GET /api/boards lists boards', async () => {
    await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Board 1' }),
    });
    const res = await fetch(`${baseUrl}/api/boards`);
    expect(res.status).toBe(200);
    const boards = await res.json();
    expect(boards).toHaveLength(1);
  });

  it('GET /api/boards/:id returns 404 for missing board', async () => {
    const res = await fetch(`${baseUrl}/api/boards/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('POST /api/boards/:id/nodes creates a node', async () => {
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    const board = await createRes.json();
    const res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rectangle', label: 'Node 1' }),
    });
    expect(res.status).toBe(201);
    const updated = await res.json();
    expect(updated.nodes).toHaveLength(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/api/__tests__/routes.test.ts`
Expected: FAIL

**Step 3: Implement routes.ts**

`server/src/api/routes.ts` — exports `createApp(boardsDir)` that returns an Express app:

- Instantiates `BoardStore` with `boardsDir`
- All routes from the design doc's REST API section
- All mutations pass `actor: 'user'` to the data layer
- Error handling middleware: catches thrown errors, maps "not found" → 404, validation → 400, unknown → 500
- Returns JSON `{ error: string }` on errors

**Step 4: Implement server entry point**

`server/src/index.ts`:
```typescript
import { createApp } from './api/routes.js';
import path from 'path';

const boardsDir = process.env.BOARDS_DIR || path.join(process.cwd(), 'boards');
const port = parseInt(process.env.PORT || '3011', 10);

const app = createApp(boardsDir);

// In production, serve frontend static files
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

app.listen(port, () => {
  console.log(`InfiniteCanvas server running on http://localhost:${port}`);
});
```

**Step 5: Run tests to verify they pass**

Run: `cd server && npx vitest run src/api/__tests__/routes.test.ts`
Expected: All PASS.

**Step 6: Manual smoke test**

Run: `cd server && npx tsx src/index.ts`
Then: `curl -X POST http://localhost:3011/api/boards -H 'Content-Type: application/json' -d '{"name":"test"}'`
Expected: JSON response with board data.

**Step 7: Commit**

```bash
git add server/src/api/ server/src/index.ts
git commit -m "feat: add Express REST API with full board/node/edge routes"
```

---

### Task 6: MCP Server

**Files:**
- Create: `server/src/mcp/server.ts`
- Create: `server/src/mcp/tools.ts`
- Create: `server/bin/mcp.ts`
- Test: `server/src/mcp/__tests__/tools.test.ts`

**Step 1: Write failing tests for MCP tool logic**

`server/src/mcp/__tests__/tools.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createMcpToolHandler } from '../tools.js';

describe('MCP Tools', () => {
  let handler: ReturnType<typeof createMcpToolHandler>;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ic-mcp-test-'));
    handler = createMcpToolHandler(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('create_board returns board with id', async () => {
    const result = await handler('create_board', { name: 'Test' });
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test');
  });

  it('list_boards returns empty initially', async () => {
    const result = await handler('list_boards', {});
    expect(result).toEqual([]);
  });

  it('create_node + read_board round-trips', async () => {
    const board = await handler('create_board', { name: 'Test' });
    await handler('create_node', {
      boardId: board.id,
      type: 'diamond',
      label: 'Decision',
    });
    const read = await handler('read_board', { boardId: board.id });
    expect(read.nodes).toHaveLength(1);
    expect(read.nodes[0].type).toBe('diamond');
    // Activity log should show claude as actor
    expect(read.activityLog.every((e: any) => e.actor === 'claude')).toBe(true);
  });

  it('import_mermaid creates nodes and edges', async () => {
    const board = await handler('create_board', { name: 'Test' });
    const result = await handler('import_mermaid', {
      boardId: board.id,
      mermaidSyntax: 'graph TD\n  A[Start] --> B[End]',
    });
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    expect(result.edges.length).toBeGreaterThanOrEqual(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/mcp/__tests__/tools.test.ts`
Expected: FAIL

**Step 3: Implement MCP tools handler**

`server/src/mcp/tools.ts`:
- Exports `createMcpToolHandler(boardsDir)` — returns an async function `(toolName, args) => result`
- Instantiates `BoardStore` with `boardsDir`
- All 14 tools from the design doc, each calling the appropriate `BoardStore` or parser method
- All mutations pass `actor: 'claude'`
- `import_mermaid` calls `parseMermaid`, then creates nodes and edges on the board
- `auto_layout` calls `BoardStore.autoLayout`
- Returns data directly (MCP SDK handles serialization)

**Step 4: Implement MCP server definition**

`server/src/mcp/server.ts`:
- Uses `@modelcontextprotocol/sdk` `Server` class with stdio transport
- Registers all 14 tools with JSON Schema parameter definitions
- Each tool handler calls `createMcpToolHandler`
- Proper error handling: catches exceptions, returns MCP error responses

**Step 5: Create stdio entry point**

`server/bin/mcp.ts`:
```typescript
import { createMcpServer } from '../src/mcp/server.js';
import path from 'path';

const boardsDir = process.env.BOARDS_DIR || path.join(process.cwd(), 'boards');
const server = createMcpServer(boardsDir);
server.start();
```

**Step 6: Run tests to verify they pass**

Run: `cd server && npx vitest run src/mcp/__tests__/tools.test.ts`
Expected: All PASS.

**Step 7: Build and test stdio**

Run: `cd server && npm run build && echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/bin/mcp.js`
Expected: JSON response listing all 14 tools.

**Step 8: Commit**

```bash
git add server/src/mcp/ server/bin/
git commit -m "feat: add MCP server with 14 canvas tools via stdio"
```

---

## Phase 3: Frontend Core

### Task 7: Frontend Scaffold & Board List

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/api.ts`
- Create: `frontend/src/components/BoardList.tsx`
- Create: `frontend/src/styles/global.css`

**Step 1: Create API client**

`frontend/src/api.ts`:
```typescript
const BASE = '/api';

export const api = {
  listBoards: () => fetch(`${BASE}/boards`).then(r => r.json()),
  createBoard: (name: string, description?: string) =>
    fetch(`${BASE}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    }).then(r => r.json()),
  readBoard: (id: string) => fetch(`${BASE}/boards/${id}`).then(r => r.json()),
  deleteBoard: (id: string) => fetch(`${BASE}/boards/${id}`, { method: 'DELETE' }),
  duplicateBoard: (id: string, newName?: string) =>
    fetch(`${BASE}/boards/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName }),
    }).then(r => r.json()),
  createNode: (boardId: string, data: any) =>
    fetch(`${BASE}/boards/${boardId}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  updateNode: (boardId: string, nodeId: string, data: any) =>
    fetch(`${BASE}/boards/${boardId}/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  bulkUpdateNodes: (boardId: string, updates: any[]) =>
    fetch(`${BASE}/boards/${boardId}/nodes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    }).then(r => r.json()),
  deleteNode: (boardId: string, nodeId: string) =>
    fetch(`${BASE}/boards/${boardId}/nodes/${nodeId}`, { method: 'DELETE' }).then(r => r.json()),
  reorderNode: (boardId: string, nodeId: string, action: string) =>
    fetch(`${BASE}/boards/${boardId}/nodes/${nodeId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).then(r => r.json()),
  createEdge: (boardId: string, source: string, target: string, label?: string) =>
    fetch(`${BASE}/boards/${boardId}/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target, label }),
    }).then(r => r.json()),
  deleteEdge: (boardId: string, edgeId: string) =>
    fetch(`${BASE}/boards/${boardId}/edges/${edgeId}`, { method: 'DELETE' }).then(r => r.json()),
  createGroup: (boardId: string, label: string, nodeIds: string[]) =>
    fetch(`${BASE}/boards/${boardId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, nodeIds }),
    }).then(r => r.json()),
  importMermaid: (boardId: string, mermaidSyntax: string) =>
    fetch(`${BASE}/boards/${boardId}/import-mermaid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mermaidSyntax }),
    }).then(r => r.json()),
  autoLayout: (boardId: string, direction?: string) =>
    fetch(`${BASE}/boards/${boardId}/auto-layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    }).then(r => r.json()),
  exportBoard: (boardId: string, format: string) =>
    fetch(`${BASE}/boards/${boardId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    }).then(r => r.json()),
};
```

**Step 2: Create BoardList component**

`frontend/src/components/BoardList.tsx`:
- Fetches boards on mount via `api.listBoards()`
- Displays board cards with name, updatedAt, and thumbnail placeholder
- "Create Board" button opens name input modal
- Delete button with confirmation dialog
- Duplicate button
- Click card navigates to `/board/:id`
- Empty state: "Create your first board" message with prominent create button

**Step 3: Create App with routing**

`frontend/src/App.tsx`:
- Simple hash-based routing (no react-router dependency needed):
  - `#/` → BoardList
  - `#/board/:id` → CanvasView (placeholder for now)
- Global CSS import

**Step 4: Create main.tsx entry point**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 5: Create global.css**

Minimal reset + layout styles. Dark-ish neutral theme (canvas tools look better on slightly dark backgrounds).

**Step 6: Verify it runs**

Run: `npm run dev`
Open: `http://localhost:3010`
Expected: Board list page renders, can create and see a board.

**Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: add frontend scaffold with board list page"
```

---

### Task 8: Canvas View & Custom Node Shapes

**Files:**
- Create: `frontend/src/components/CanvasView.tsx`
- Create: `frontend/src/components/nodes/RectangleNode.tsx`
- Create: `frontend/src/components/nodes/CircleNode.tsx`
- Create: `frontend/src/components/nodes/EllipseNode.tsx`
- Create: `frontend/src/components/nodes/DiamondNode.tsx`
- Create: `frontend/src/components/nodes/HexagonNode.tsx`
- Create: `frontend/src/components/nodes/ParallelogramNode.tsx`
- Create: `frontend/src/components/nodes/CylinderNode.tsx`
- Create: `frontend/src/components/nodes/TriangleNode.tsx`
- Create: `frontend/src/components/nodes/StickyNode.tsx`
- Create: `frontend/src/components/nodes/TextNode.tsx`
- Create: `frontend/src/components/nodes/ImageNode.tsx`
- Create: `frontend/src/components/nodes/GroupNode.tsx`
- Create: `frontend/src/components/nodes/index.ts`
- Create: `frontend/src/hooks/useBoard.ts`

**Step 1: Create useBoard hook**

`frontend/src/hooks/useBoard.ts`:
- Fetches board data on mount via `api.readBoard(boardId)`
- Converts `CanvasNode[]` → React Flow `Node[]` (maps `type`, `position: {x, y}`, `data: { label, style, ... }`)
- Converts `CanvasEdge[]` → React Flow `Edge[]`
- Exposes: `nodes`, `edges`, `onNodesChange`, `onEdgesChange`, `onConnect`, `loading`
- `onNodesChange` handler: on position change, debounced `api.bulkUpdateNodes` call
- `onConnect` handler: calls `api.createEdge`
- Refetch function for external updates

**Step 2: Create custom node components**

Each node component in `frontend/src/components/nodes/`:
- Receives `data` prop with `label`, `style`, `selected`
- Renders SVG shape with the node's dimensions
- Four `<Handle>` elements (top, bottom, left, right) for connections
- Applies `style` props (fill, border color, text color, font size)
- Label rendered inside the shape, centered
- `NodeResizer` component from `@xyflow/react` for resize handles

Implementation notes per shape:
- **RectangleNode:** `<rect>` with rounded corners
- **CircleNode:** `<circle>`
- **EllipseNode:** `<ellipse>`
- **DiamondNode:** `<polygon>` with 4 points (rotated square)
- **HexagonNode:** `<polygon>` with 6 points
- **ParallelogramNode:** `<polygon>` with skewed rectangle points
- **CylinderNode:** `<path>` with top/bottom ellipses + rect body
- **TriangleNode:** `<polygon>` with 3 points
- **StickyNode:** `<rect>` with yellow fill default, drop shadow
- **TextNode:** Just the label text, no shape border
- **ImageNode:** `<image>` element with `data.imageUrl`, fallback placeholder
- **GroupNode:** Dashed `<rect>` border, label at top, children render inside

`frontend/src/components/nodes/index.ts` — exports `nodeTypes` map for React Flow:
```typescript
import { RectangleNode } from './RectangleNode';
// ... all imports
export const nodeTypes = {
  rectangle: RectangleNode,
  circle: CircleNode,
  // ... all types
};
```

**Step 3: Create CanvasView**

`frontend/src/components/CanvasView.tsx`:
- Uses `useBoard(boardId)` hook
- Renders `<ReactFlow>` with:
  - `nodeTypes` from custom nodes
  - `nodes`, `edges`, `onNodesChange`, `onEdgesChange`, `onConnect` from hook
  - `<MiniMap />` component
  - `<Controls />` component
  - `<Background variant="dots" />` component
  - `panOnScroll={false}`, `panOnDrag` with space key modifier
  - `selectionMode` for box select
  - `multiSelectionKeyCode="Shift"`
- Loading spinner while board loads
- Empty board hint text when no nodes

**Step 4: Wire CanvasView into App routing**

Update `App.tsx` to render `<CanvasView boardId={id} />` for `#/board/:id` route.

**Step 5: Verify it runs**

Run: `npm run dev`
Create a board, navigate to it. Use curl to add nodes:
```bash
curl -X POST http://localhost:3011/api/boards/<id>/nodes \
  -H 'Content-Type: application/json' \
  -d '{"type":"rectangle","label":"Test","x":100,"y":100}'
```
Refresh — node should appear on canvas and be draggable.

**Step 6: Commit**

```bash
git add frontend/src/components/ frontend/src/hooks/
git commit -m "feat: add canvas view with 12 custom SVG node shapes"
```

---

### Task 9: Toolbar & Drag-to-Place

**Files:**
- Create: `frontend/src/components/Toolbar.tsx`
- Create: `frontend/src/components/MermaidImportModal.tsx`

**Step 1: Create Toolbar component**

`frontend/src/components/Toolbar.tsx`:
- Left-side vertical toolbar
- **Shape palette:** Grid of draggable shape icons (one per NodeType except group/image). Each icon is a small SVG preview of the shape.
- **Drag-to-place:** Each shape icon has `draggable` attribute. On `onDragStart`, set `dataTransfer` with node type. CanvasView listens for `onDrop` on the ReactFlow wrapper — reads node type from `dataTransfer`, calculates canvas position from drop coordinates using `screenToFlowPosition`, calls `api.createNode`.
- **Click-to-add fallback:** Clicking a shape icon creates node at viewport center.
- **Action buttons:**
  - Auto Layout (dropdown: TB/LR/BT/RL)
  - Import Mermaid (opens modal)
  - Export (dropdown: PNG/SVG)
  - Grid Snap toggle
  - Activity Log toggle
  - Zoom to Fit
- **Board name** displayed at top, editable on click

**Step 2: Create MermaidImportModal**

`frontend/src/components/MermaidImportModal.tsx`:
- Modal with textarea for Mermaid syntax input
- "Import" button calls `api.importMermaid(boardId, syntax)`
- Shows warnings from parser result
- Closes on success, board refetches

**Step 3: Wire toolbar into CanvasView**

Add `<Toolbar>` alongside `<ReactFlow>` in CanvasView. Pass board ID and callbacks.

**Step 4: Verify drag-to-place works**

Run: `npm run dev`
Drag a shape from toolbar onto canvas → node appears at drop position.

**Step 5: Commit**

```bash
git add frontend/src/components/Toolbar.tsx frontend/src/components/MermaidImportModal.tsx
git commit -m "feat: add toolbar with drag-to-place shapes and Mermaid import"
```

---

## Phase 4: Frontend Interactions

### Task 10: Context Menus

**Files:**
- Create: `frontend/src/components/ContextMenu.tsx`

**Step 1: Implement ContextMenu component**

`frontend/src/components/ContextMenu.tsx`:
- Renders a positioned dropdown menu at right-click coordinates
- Three variants based on target:
  - **Node:** Edit label, Change shape, Style submenu, Layer (Bring to Front/Send to Back/Bring Forward/Send Backward), Duplicate, Group selected, Delete
  - **Edge:** Edit label, Change routing (Straight/Step/Bezier), Delete
  - **Canvas:** Paste, Add node (shape picker submenu), Zoom to Fit, Toggle Grid Snap
- Each action calls the appropriate `api.*` method
- Closes on click outside or Escape

**Step 2: Wire into CanvasView**

- `onNodeContextMenu` → show node context menu
- `onEdgeContextMenu` → show edge context menu
- `onPaneContextMenu` → show canvas context menu
- Prevent default browser context menu on canvas

**Step 3: Verify all context menu actions work**

Manual test: right-click node, edge, and canvas. Verify each action.

**Step 4: Commit**

```bash
git add frontend/src/components/ContextMenu.tsx
git commit -m "feat: add context menus for nodes, edges, and canvas"
```

---

### Task 11: Double-Click to Edit & Connection Validation

**Files:**
- Modify: `frontend/src/components/CanvasView.tsx`
- Modify: `frontend/src/components/nodes/*.tsx` (add inline edit mode)

**Step 1: Add inline label editing to node components**

Each custom node component:
- On double-click, switch to edit mode: render `<input>` or `<textarea>` over the label
- On Enter or blur, call `api.updateNode(boardId, nodeId, { label: newLabel })`
- On Escape, cancel edit

**Step 2: Add double-click-on-canvas creates sticky note**

In CanvasView:
- `onPaneClick` with double-click detection: create sticky note at click position via `api.createNode`

**Step 3: Add connection validation**

In CanvasView:
- `isValidConnection` callback:
  - Reject self-loops (`source === target`)
  - Reject if edge already exists between source and target
  - Reject if target is a group node
- Style valid/invalid connection targets via `connectionLineStyle`

**Step 4: Verify**

Double-click node → edit label. Double-click canvas → sticky note. Try connecting a node to itself → rejected.

**Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add inline label editing, double-click create, connection validation"
```

---

### Task 12: Undo/Redo System

**Files:**
- Create: `frontend/src/hooks/useUndoRedo.ts`
- Modify: `frontend/src/hooks/useBoard.ts`

**Step 1: Implement useUndoRedo hook**

`frontend/src/hooks/useUndoRedo.ts`:
```typescript
// Command pattern: each action stores { undo: () => Promise<void>, redo: () => Promise<void> }
interface Command {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  description: string;
}

export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<Command[]>([]);
  const [redoStack, setRedoStack] = useState<Command[]>([]);

  const execute = async (command: Command) => {
    await command.redo();
    setUndoStack(prev => [...prev, command]);
    setRedoStack([]);
  };

  const undo = async () => {
    const command = undoStack[undoStack.length - 1];
    if (!command) return;
    await command.undo();
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, command]);
  };

  const redo = async () => {
    const command = redoStack[redoStack.length - 1];
    if (!command) return;
    await command.redo();
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, command]);
  };

  return { execute, undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 };
}
```

**Step 2: Wire into useBoard**

Wrap all mutation API calls in `execute()`:
- `createNode` → undo calls `deleteNode`, redo calls `createNode`
- `deleteNode` → undo calls `createNode` with saved data, redo calls `deleteNode`
- `moveNodes` → undo restores previous positions, redo applies new positions
- etc.

**Step 3: Verify**

Create node → Ctrl+Z → node gone → Ctrl+Shift+Z → node back.

**Step 4: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add undo/redo system with command pattern"
```

---

### Task 13: Multi-Select, Copy/Paste, Keyboard Shortcuts

**Files:**
- Create: `frontend/src/hooks/useKeyboardShortcuts.ts`
- Create: `frontend/src/hooks/useClipboard.ts`
- Modify: `frontend/src/components/CanvasView.tsx`

**Step 1: Implement useClipboard hook**

`frontend/src/hooks/useClipboard.ts`:
- `copy(nodes, edges)` — stores selected nodes + internal edges to in-memory clipboard (module-level variable for cross-board paste)
- `paste(boardId)` — duplicates clipboard content with new IDs, offset by (20,20), calls `api.createNode` for each, then `api.createEdge` for each, returns new node IDs for selection

**Step 2: Implement useKeyboardShortcuts hook**

`frontend/src/hooks/useKeyboardShortcuts.ts`:
- Registers global keydown listener
- Maps all shortcuts from design doc to callbacks
- Ignores shortcuts when typing in input/textarea
- Shortcuts:
  - Delete/Backspace → delete selected nodes/edges
  - Ctrl+Z → undo
  - Ctrl+Shift+Z → redo
  - Ctrl+A → select all (React Flow `setNodes` with `selected: true`)
  - Ctrl+C → copy selected
  - Ctrl+V → paste
  - Ctrl+G → group selected (`api.createGroup`)
  - Ctrl+F → toggle search bar
  - Ctrl+L → toggle activity log
  - Ctrl+0 → zoom to fit (`reactFlowInstance.fitView()`)
  - +/- → zoom in/out

**Step 3: Wire multi-select**

CanvasView already has `selectionMode` and `multiSelectionKeyCode="Shift"` from Task 8. Verify box select and shift-click work.

For bulk operations on selection: get selected nodes from React Flow state, pass to clipboard/delete/group operations.

**Step 4: Verify all shortcuts**

Manual test each keyboard shortcut.

**Step 5: Commit**

```bash
git add frontend/src/hooks/useKeyboardShortcuts.ts frontend/src/hooks/useClipboard.ts
git commit -m "feat: add keyboard shortcuts, copy/paste, multi-select operations"
```

---

### Task 14: Floating Style Bar

**Files:**
- Create: `frontend/src/components/FloatingStyleBar.tsx`

**Step 1: Implement FloatingStyleBar**

`frontend/src/components/FloatingStyleBar.tsx`:
- Appears above/below selected nodes when 1+ nodes selected
- Positioned relative to selection bounding box
- Controls:
  - Fill color: preset palette (8-10 colors) + hex input
  - Border color: same palette
  - Border width: 1/2/3/4 px buttons
  - Font size: S/M/L/XL presets
  - Text color: same palette
- On change, calls `api.updateNode` for each selected node with new `style` values
- Disappears when nothing selected

**Step 2: Wire into CanvasView**

Render `<FloatingStyleBar>` when `selectedNodes.length > 0`. Pass selected nodes, board ID, and refetch callback.

**Step 3: Verify**

Select node → style bar appears → change fill color → node updates.

**Step 4: Commit**

```bash
git add frontend/src/components/FloatingStyleBar.tsx
git commit -m "feat: add floating style bar for node color, border, and font"
```

---

### Task 15: Search Bar

**Files:**
- Create: `frontend/src/components/SearchBar.tsx`

**Step 1: Implement SearchBar**

`frontend/src/components/SearchBar.tsx`:
- Toggled via Ctrl+F (appears at top of canvas)
- Text input with match count indicator ("3/7 matches")
- Filters: sets `style.opacity: 0.2` on non-matching nodes
- Enter cycles through matches:
  - Selects current match node
  - Calls `reactFlowInstance.fitView({ nodes: [matchNode], padding: 0.5 })` to pan to it
- Escape closes and clears filter
- Debounced filtering (200ms)

**Step 2: Wire into CanvasView**

Conditionally render `<SearchBar>` when search is active. Pass nodes, reactFlowInstance, and close callback.

**Step 3: Verify**

Ctrl+F → type text → non-matching nodes dim → Enter cycles through matches with pan.

**Step 4: Commit**

```bash
git add frontend/src/components/SearchBar.tsx
git commit -m "feat: add search bar with node filtering and pan-to-match"
```

---

### Task 16: Activity Log Drawer

**Files:**
- Create: `frontend/src/components/ActivityLogDrawer.tsx`

**Step 1: Implement ActivityLogDrawer**

`frontend/src/components/ActivityLogDrawer.tsx`:
- Collapsible right-side panel (300px wide)
- Toggled via Ctrl+L or toolbar button
- Displays `board.activityLog` in reverse chronological order
- Each entry shows:
  - Timestamp (relative: "2 min ago", "yesterday")
  - Actor badge: blue for "claude", green for "user"
  - Summary text
- Auto-scrolls to top on new entries
- Pulls fresh data on open and on board refetch

**Step 2: Wire into CanvasView**

Render alongside ReactFlow. Canvas width adjusts when drawer is open.

**Step 3: Verify**

Create nodes via UI (user entries) and via MCP/curl (claude entries). Open drawer → entries appear with correct actor badges.

**Step 4: Commit**

```bash
git add frontend/src/components/ActivityLogDrawer.tsx
git commit -m "feat: add activity log drawer with user/claude actor badges"
```

---

## Phase 5: Frontend Polish

### Task 17: Snap-to-Grid & Alignment Guides

**Files:**
- Create: `frontend/src/hooks/useSnapToGrid.ts`
- Create: `frontend/src/components/AlignmentGuides.tsx`

**Step 1: Implement snap-to-grid**

`frontend/src/hooks/useSnapToGrid.ts`:
- When enabled, rounds node positions to nearest grid increment (default 20px) during `onNodesChange`
- Toggle state stored in component, controlled by toolbar button
- React Flow's `snapToGrid` and `snapGrid` props handle the core behavior

**Step 2: Implement alignment guides**

`frontend/src/components/AlignmentGuides.tsx`:
- During node drag, check alignment of dragged node's center/edges against all other nodes' centers/edges
- When aligned (within 5px threshold), render a line SVG overlay at that coordinate
- Horizontal and vertical guides independently
- Lines extend across the full viewport
- Snap the dragged node to the guide position

**Step 3: Wire into CanvasView**

Pass snap state and render alignment guides as overlay inside ReactFlow.

**Step 4: Commit**

```bash
git add frontend/src/hooks/useSnapToGrid.ts frontend/src/components/AlignmentGuides.tsx
git commit -m "feat: add snap-to-grid and alignment guides during drag"
```

---

### Task 18: Edge Routing & Node Layering UI

**Files:**
- Modify: `frontend/src/components/CanvasView.tsx` (edge types)
- Modify: `frontend/src/components/ContextMenu.tsx` (edge routing + layering actions)

**Step 1: Configure edge routing types**

In CanvasView, define React Flow `edgeTypes` or use built-in types:
- `straight` → `type: 'straight'`
- `step` → `type: 'smoothstep'`
- `bezier` → `type: 'default'` (React Flow's default is bezier)

Map `edge.style.routing` from board data to React Flow edge types.

**Step 2: Add edge routing to context menu**

Edge context menu → "Routing" submenu → Straight / Step / Bezier. On select, calls `api.updateNode` equivalent for edges (or update the edge's style via the board API).

Note: Need to add edge update to the REST API if not present. Add: `PATCH /api/boards/:id/edges/:edgeId` to update edge label/style.

**Step 3: Wire node layering context menu actions**

Node context menu → "Layer" submenu actions call `api.reorderNode(boardId, nodeId, action)`.
After reorder, update React Flow nodes with new `zIndex` values.

**Step 4: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add edge routing modes and node layering via context menu"
```

---

### Task 19: Viewport Persistence & Pan/Zoom Controls

**Files:**
- Create: `frontend/src/hooks/useViewportPersistence.ts`
- Modify: `frontend/src/components/CanvasView.tsx`

**Step 1: Implement viewport persistence**

`frontend/src/hooks/useViewportPersistence.ts`:
- On mount, read `localStorage.getItem(`viewport-${boardId}`)` → parse `{ x, y, zoom }`
- If found, call `reactFlowInstance.setViewport(saved)` after initial render
- On viewport change (debounced 500ms), save to localStorage
- On unmount, save current viewport

**Step 2: Configure pan controls**

In CanvasView:
- `panOnDrag={false}` (disable default)
- `panActivationKeyCode="Space"` — hold space + drag to pan
- Middle mouse button panning via `panOnDrag={[1]}` (button index 1 = middle)
- Disable scroll-to-pan: `zoomOnScroll={false}`, use `zoomOnPinch={true}` for trackpad

**Step 3: Verify**

Navigate to board, pan/zoom, navigate away, come back → viewport restored.

**Step 4: Commit**

```bash
git add frontend/src/hooks/useViewportPersistence.ts
git commit -m "feat: add viewport persistence and space+drag pan controls"
```

---

### Task 20: Image Drag-and-Drop Upload

**Files:**
- Modify: `frontend/src/components/CanvasView.tsx`
- Add: `server/src/api/routes.ts` — image upload route

**Step 1: Add image upload endpoint**

Add to `server/src/api/routes.ts`:
- `POST /api/boards/:id/upload-image` — accepts multipart form data
- Saves image to `boards/assets/{uuid}.{ext}`
- Returns `{ url: '/api/assets/{uuid}.{ext}' }`
- Add static file serving for `/api/assets/` → `boards/assets/`

**Step 2: Add drop handler to CanvasView**

- Listen for `onDrop` and `onDragOver` on the ReactFlow wrapper
- If `dataTransfer.files` contains an image file:
  - Upload via the image upload endpoint
  - Create an image node at the drop position with `data.imageUrl` set to the returned URL
- Visual feedback: show a drop zone indicator when dragging files over the canvas

**Step 3: Verify**

Drag a PNG from Finder onto canvas → image node appears.

**Step 4: Commit**

```bash
git add frontend/src/components/CanvasView.tsx server/src/api/routes.ts
git commit -m "feat: add drag-and-drop image upload to canvas"
```

---

### Task 21: Export (PNG/SVG)

**Files:**
- Create: `frontend/src/hooks/useExport.ts`

**Step 1: Implement client-side export**

`frontend/src/hooks/useExport.ts`:
- Uses `html-to-image` library
- `exportPng(reactFlowWrapper)` → `toPng(element)` → triggers download
- `exportSvg(reactFlowWrapper)` → `toSvg(element)` → triggers download
- Before export: temporarily hide UI elements (minimap, controls, toolbar) via CSS class
- After export: restore UI

**Step 2: Wire export to toolbar**

Toolbar "Export" button dropdown → PNG / SVG → calls `useExport` hook.

**Step 3: Implement server-side export for MCP**

The `export_board` MCP tool needs server-side rendering. Options:
- Use a headless approach: the MCP tool calls the REST API's export endpoint
- REST export endpoint renders the board data to SVG programmatically (no browser needed)
- For PNG, convert SVG to PNG via `sharp` or similar

Simpler approach for V1: MCP `export_board` returns the board as an SVG string built server-side from node/edge data. Less pretty than the browser render but functional without a headless browser dependency.

**Step 4: Verify**

Click Export → PNG → file downloads. Verify it looks correct.

**Step 5: Commit**

```bash
git add frontend/src/hooks/useExport.ts
git commit -m "feat: add PNG and SVG export from canvas"
```

---

### Task 22: Board Thumbnails

**Files:**
- Modify: `frontend/src/hooks/useBoard.ts`
- Modify: `frontend/src/components/BoardList.tsx`

**Step 1: Generate thumbnail on save**

In `useBoard` hook, after any mutation that modifies the board:
- Debounced (2 seconds after last change): capture canvas thumbnail using `html-to-image`'s `toPng` at low resolution (200x150)
- POST thumbnail data URI to a new endpoint: `PATCH /api/boards/:id` with `{ thumbnail: dataUri }`
- Server stores thumbnail in `index.json`

**Step 2: Display thumbnails in BoardList**

Update `BoardList.tsx` to render thumbnail images from `board.thumbnail` data URIs. Fallback to a gray placeholder with the board name.

**Step 3: Verify**

Create board, add nodes, go back to board list → thumbnail shows.

**Step 4: Commit**

```bash
git add frontend/src/hooks/useBoard.ts frontend/src/components/BoardList.tsx
git commit -m "feat: add board thumbnail generation and display"
```

---

### Task 23: Toast Notifications & Confirmation Dialogs

**Files:**
- Create: `frontend/src/components/Toast.tsx`
- Create: `frontend/src/hooks/useToast.ts`
- Create: `frontend/src/components/ConfirmDialog.tsx`

**Step 1: Implement toast system**

`frontend/src/hooks/useToast.ts`:
- Context provider pattern: `<ToastProvider>` wraps the app
- `useToast()` returns `{ toast(message, type) }`
- Types: `success`, `error`, `warning`, `info`
- Auto-dismiss after 3 seconds
- Stack in bottom-right corner

`frontend/src/components/Toast.tsx`:
- Renders toast stack
- Each toast has icon (based on type), message, and close button
- Slide-in animation

**Step 2: Implement confirmation dialog**

`frontend/src/components/ConfirmDialog.tsx`:
- Modal with message, "Cancel" and "Confirm" (red for destructive) buttons
- `useConfirm()` hook returns `confirm(message): Promise<boolean>`

**Step 3: Wire into existing operations**

- Delete board → confirmation dialog
- Delete node → confirmation dialog
- API errors → error toast
- Successful import → success toast with node/edge count
- Copy → info toast "Copied N nodes"

**Step 4: Commit**

```bash
git add frontend/src/components/Toast.tsx frontend/src/hooks/useToast.ts frontend/src/components/ConfirmDialog.tsx
git commit -m "feat: add toast notifications and confirmation dialogs"
```

---

### Task 24: Loading States, Empty States & Responsive Layout

**Files:**
- Create: `frontend/src/components/LoadingSpinner.tsx`
- Modify: `frontend/src/components/BoardList.tsx`
- Modify: `frontend/src/components/CanvasView.tsx`
- Modify: `frontend/src/styles/global.css`

**Step 1: Create LoadingSpinner**

Simple CSS-only spinner component.

**Step 2: Add loading states**

- BoardList: spinner while fetching boards
- CanvasView: spinner while fetching board data
- Toolbar actions (import, auto-layout, export): button loading state

**Step 3: Add empty states**

- BoardList empty: centered message "No boards yet" with large "Create Your First Board" button
- CanvasView empty: centered hint text "Drag shapes from the toolbar or let Claude build something" with subtle arrow pointing to toolbar

**Step 4: Responsive layout**

- Toolbar collapses to icon-only on narrow viewports
- Activity log drawer pushes canvas (doesn't overlay) — canvas `width: calc(100% - drawerWidth)`
- Flex layout for CanvasView: toolbar + canvas + optional drawer

**Step 5: Verify at different window sizes**

Resize browser window. Verify layout reflows correctly.

**Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add loading states, empty states, and responsive layout"
```

---

## Phase 6: Integration

### Task 25: MCP Registration & End-to-End Test

**Files:**
- Modify: `~/.claude/mcp_server_config.json`
- Create: `server/src/__tests__/e2e.test.ts`

**Step 1: Build the server**

Run: `cd server && npm run build`
Expected: Clean compile to `server/dist/`

**Step 2: Register MCP server globally**

Add to `~/.claude/mcp_server_config.json`:
```json
{
  "infinite-canvas": {
    "command": "node",
    "args": ["/Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/server/dist/bin/mcp.js"],
    "env": {
      "BOARDS_DIR": "/Users/mitchcarmen/Documents/Projects/Personal/Infinite_canvas/boards"
    }
  }
}
```

**Step 3: Write end-to-end test**

`server/src/__tests__/e2e.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createMcpToolHandler } from '../mcp/tools.js';
import { createApp } from '../api/routes.js';

describe('E2E: MCP + REST consistency', () => {
  let mcp: ReturnType<typeof createMcpToolHandler>;
  let tmpDir: string;
  let baseUrl: string;
  let server: any;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ic-e2e-'));
    mcp = createMcpToolHandler(tmpDir);
    const app = createApp(tmpDir);
    server = app.listen(0);
    baseUrl = `http://localhost:${(server.address() as any).port}`;
  });

  afterEach(() => {
    server.close();
    rmSync(tmpDir, { recursive: true });
  });

  it('board created via MCP is visible via REST', async () => {
    const board = await mcp('create_board', { name: 'MCP Board' });
    const res = await fetch(`${baseUrl}/api/boards/${board.id}`);
    const read = await res.json();
    expect(read.name).toBe('MCP Board');
    expect(read.activityLog[0].actor).toBe('claude');
  });

  it('node created via REST is visible via MCP', async () => {
    // Create board via REST
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'REST Board' }),
    });
    const board = await createRes.json();

    // Add node via REST
    await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'diamond', label: 'Decision' }),
    });

    // Read via MCP
    const read = await mcp('read_board', { boardId: board.id });
    expect(read.nodes).toHaveLength(1);
    expect(read.nodes[0].type).toBe('diamond');
    expect(read.activityLog.some((e: any) => e.actor === 'user')).toBe(true);
  });

  it('full workflow: MCP creates board, imports mermaid, auto-layouts', async () => {
    const board = await mcp('create_board', { name: 'Workflow Test' });
    const imported = await mcp('import_mermaid', {
      boardId: board.id,
      mermaidSyntax: `graph TD
        A[Start] --> B{Decision}
        B --> |yes| C[Process]
        B --> |no| D[End]`,
    });
    expect(imported.nodes.length).toBeGreaterThanOrEqual(4);
    expect(imported.edges.length).toBeGreaterThanOrEqual(3);

    const laid = await mcp('auto_layout', { boardId: board.id, direction: 'TB' });
    // Verify nodes have distinct positions
    const positions = laid.nodes.map((n: any) => `${n.x},${n.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(laid.nodes.length);
  });
});
```

**Step 4: Run all tests**

Run: `cd server && npx vitest run`
Expected: All tests pass.

**Step 5: Full manual smoke test**

1. Start app: `npm run dev`
2. Open `http://localhost:3010`
3. Create a board via UI
4. Drag shapes onto canvas
5. Connect nodes
6. Right-click → context menu actions
7. Ctrl+Z/Ctrl+Shift+Z undo/redo
8. Import Mermaid flowchart
9. Auto-layout
10. Test MCP via Claude Code (in a separate session):
    - `create_board`, `create_node`, `read_board`, `import_mermaid`

**Step 6: Commit**

```bash
git add server/src/__tests__/e2e.test.ts
git commit -m "test: add end-to-end tests for MCP and REST consistency"
```

---

### Task 26: README & Final Cleanup

**Files:**
- Create: `README.md`
- Create: `CLAUDE.md` (project-level)
- Review: all files for cleanup

**Step 1: Write README.md**

Contents:
- Project description (what InfiniteCanvas is)
- Quick start (`npm install`, `npm run dev`, open localhost:3010)
- MCP setup instructions (copy config to `~/.claude/mcp_server_config.json`)
- Available MCP tools table
- Architecture overview (brief)
- Development (running tests, building for production)

**Step 2: Write project CLAUDE.md**

Contents:
- Project-specific instructions for Claude
- Key file paths and their purposes
- How to run tests
- Data model reference
- MCP tool usage patterns

**Step 3: Final review**

- Check all files compile: `npm run build`
- Run all tests: `npm run test`
- Verify no console errors in browser
- Check `.gitignore` covers everything needed

**Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: add README and project CLAUDE.md"
```

---

## Task Dependency Graph

```
Phase 1: Foundation
  Task 1 (Scaffold) → Task 2 (Data Layer) → Task 3 (Auto-Layout) → Task 4 (Mermaid)

Phase 2: Server
  Task 2 → Task 5 (REST API) → Task 6 (MCP Server)

Phase 3: Frontend Core (depends on Task 5)
  Task 7 (Board List) → Task 8 (Canvas + Nodes) → Task 9 (Toolbar)

Phase 4: Interactions (depends on Task 8)
  Task 10 (Context Menus)
  Task 11 (Inline Edit + Validation)
  Task 12 (Undo/Redo)
  Task 13 (Shortcuts + Copy/Paste)
  Task 14 (Style Bar)
  Task 15 (Search)
  Task 16 (Activity Log)
  Tasks 10-16 can be parallelized — they are independent of each other

Phase 5: Polish (depends on Phase 4)
  Task 17 (Snap/Align)
  Task 18 (Edge Routing + Layering UI)
  Task 19 (Viewport Persistence)
  Task 20 (Image Upload)
  Task 21 (Export)
  Task 22 (Thumbnails)
  Task 23 (Toasts + Dialogs)
  Task 24 (Loading/Empty/Responsive)
  Tasks 17-24 can be parallelized

Phase 6: Integration (depends on everything)
  Task 25 (MCP Registration + E2E)
  Task 26 (README + Cleanup)
```

## Parallelization Opportunities

Tasks that can be dispatched to parallel subagents:

**Batch 1 (Phase 4):** Tasks 10, 11, 12, 13, 14, 15, 16 — all independent frontend features
**Batch 2 (Phase 5):** Tasks 17, 18, 19, 20, 21, 22, 23, 24 — all independent polish features
