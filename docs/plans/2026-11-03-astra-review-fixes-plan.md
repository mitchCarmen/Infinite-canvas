# Astra/Codex whole-repo review — fix plan (lanes)

Source review: `docs/plans/2026-10-28-astra-codex-whole-repo-review.md` (21 findings, all confirmed by cross-check). Each Codex item has a GitHub issue; each lane's PR closes its items.

## Global Constraints

- Conventional commits (`feat:`, `fix:`, `refactor:`, `test:`). Commit messages NEVER mention Claude, AI, or carry `Co-Authored-By` lines.
- Server gate before every commit: `cd server && npx vitest run` (all green, no new warnings) and `cd server && npm run build`. Frontend gate: `cd frontend && npx tsc --noEmit` (until Lane E lands, the single known failure `src/utils/__tests__/color.test.ts: Cannot find module 'vitest'` is pre-existing and acceptable; any OTHER error is yours).
- Ponytail: shortest correct diff, no new abstractions, no new dependencies except where a task says so. Mark deliberate ceilings with a `ponytail:` comment.
- Never simplify away trust-boundary validation or data-loss handling.
- File ownership is strict: edit ONLY the files listed for your lane. If a fix genuinely needs another file, stop and report DONE_WITH_CONCERNS / BLOCKED with the exact need.
- All MCP tools use `actor: 'claude'`; REST uses `actor: 'user'`. Board mutations return the full Board.
- Child node positions are RELATIVE to their parent group (React Flow semantics) from Lane A onward. Parent nodes must precede their children in `board.nodes`.
- Work in your own worktree/branch. Push the branch and open a PR against `main` whose body lists `Closes #N` for every issue the lane resolves. Do not merge.

---

## Task 1: Lane A — BoardStore hardening (phase 1)

**Owns:** `server/src/data/boards.ts`, `server/src/data/__tests__/boards.test.ts`, `shared/types.ts` (additive only: new exported constants/types). Nothing else.

Implement, with a test for each in `boards.test.ts` (TDD: red → green):

1. **Board-id guard (Codex #1, P1).** `_boardPath(id)` must accept only canonical UUIDs (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`); anything else throws `new Error('Board not found')` before any fs call. Test: `readBoard('../../package')` and `deleteBoard('../x')` throw 'Board not found' and no file outside `boardsDir` is touched.
2. **Group semantics (Codex #6, P1).** In `createGroup`: only nodes WITHOUT an existing `parentId` are eligible children (nodes already in a group are ignored); compute the bounding box from the children's absolute positions as today; set each child's `x`/`y` to `child.x - group.x`, `child.y - group.y`; insert the group node into `board.nodes` immediately BEFORE the first child (not at the end) so parents precede children. Test: positions are relative, group index < every child index.
3. **Ungroup on group delete (Codex #12, P2).** In `deleteNode`, if the deleted node is a group, every child with `parentId === nodeId` gets `parentId` removed and `x`/`y` converted back to absolute (`child.x + group.x`). Test it.
4. **Unique temp files (Codex #2, P1 → treated as P2).** `_writeBoardFile` and `_writeIndex` write to `${target}.${process.pid}.${randomUUID()}.tmp` (use `crypto.randomUUID` or the existing `uuid` import) then `renameSync`. Add a `// ponytail: no cross-process lock; REST and MCP are separate processes, per-board lock if concurrent edits ever matter` comment at `_writeBoardFile`. Test: two stores writing the same board id do not throw.
5. **Index recovery (Codex #14, P2 → P3).** `listBoards()` reconciles: any `<uuid>.json` in `boardsDir` with no index entry gets one added (`id`, `name`, `updatedAt` read from the file) and the index is rewritten once if anything was added. `_updateIndex` also pushes an entry when missing. Test: delete an entry from index.json, call `listBoards`, entry is back.
6. **Node-id map in bulk updates (Codex #19, P2 → P3).** `bulkUpdateNodes` builds `new Map(board.nodes.map(n => [n.id, n]))` once instead of `findIndex` per update. Behaviour unchanged; existing tests cover it.
7. **`importGraph` store method (for Codex #9, P2).** New public method:
   ```ts
   importGraph(
     boardId: string,
     graph: { nodes: Array<{ id: string } & CreateNodeOpts>; edges: Array<{ source: string; target: string; label?: string }> },
     actor: 'user' | 'claude',
   ): Promise<{ board: Board; warnings: string[] }>
   ```
   `graph.nodes[].id` are caller-side temp ids (e.g. Mermaid ids). Validate fully BEFORE mutating: unknown temp ids in edges, self-loops, and duplicate (source,target) pairs (within the import or against existing edges) are SKIPPED with a warning string each; nodes are created like `createNode` (uuid, zIndex max+1 per node, default dims) and edges like `createEdge`. One `_writeBoardFile` + `_updateIndex` at the end, one activity entry `imported_graph` with summary `Imported N nodes and M edges`. If zero nodes, still succeed (empty import). Export `CreateNodeOpts` from the module so other files can type it. Tests: happy path writes once (spy on fs or check activityLog length === 2), duplicate edge yields a warning and no partial state.
8. **`replaceGraph` store method (for Codex #5, P1).** New public method:
   ```ts
   replaceGraph(boardId: string, nodes: CanvasNode[], edges: CanvasEdge[], actor: 'user' | 'claude'): Promise<Board>
   ```
   Validates: every node `type` is a known `NodeType`; every node `id`/`label` is a string and `x`,`y`,`width`,`height`,`zIndex` are finite numbers; node ids unique; every `parentId` references a node in the same set; every edge `source`/`target` references a node id in the set, no self-loops, no duplicate pairs. On any violation throw `new Error('Invalid graph: <reason>')`. Replaces `board.nodes` and `board.edges` wholesale, one write, activity `restored_graph`. Add `export const NODE_TYPES = [...] as const` to `shared/types.ts` (keep `NodeType` derived from it or identical) so the store and MCP schema share one list. Tests: valid replace round-trips; dangling edge throws 'Invalid graph'.

Do NOT change `autoLayout` / `layout.ts` (follow-up issue exists for relative-child layout).

**Gate:** `cd server && npx vitest run` green; `npm run build` green. Commit per item or per logical group.

---

## Task 2: Lane D — Frontend state hooks (phase 1)

**Owns:** `frontend/src/api.ts`, `frontend/src/hooks/useBoard.ts`, `frontend/src/hooks/useUndoRedo.ts`, `frontend/src/hooks/useClipboard.ts`, `frontend/src/hooks/useViewportPersistence.ts`, `frontend/src/components/CanvasView.tsx`, `frontend/src/styles/global.css` (additive only, if an error state needs a class). Nothing else — in particular NOT `NodeFormattingToolbar.tsx`, NOT `tsconfig.json`.

No frontend test runner exists; your gate is `cd frontend && npx tsc --noEmit` (only the pre-existing `color.test.ts` vitest error is acceptable) plus a manual smoke: `npm run dev` from the worktree root (ports 3010/3011 — if they are busy because the dock app is running, use `PORT=3111` for the server and `vite --port 3110`, and point the Vite proxy at the server port via the existing `frontend/vite.config.ts` only if it reads an env var; otherwise stop the dock app's servers first with `lsof -ti:3010 -ti:3011 | xargs kill`) and exercise the changed flows with the Playwright MCP (localhost only) if available, otherwise describe exactly what you verified by reading the code paths.

1. **Throwing API client (Codex #11, P2).** Add one `request<T>(path, init?)` helper in `api.ts` that does `fetch`, and on `!res.ok` throws `new Error(body.error ?? res.statusText)` (parse JSON body if possible), else returns `res.json()` (or `undefined` for 204). Every helper uses it; `deleteBoard` included. Keep the exported surface identical.
2. **Paste uses the created node (Codex #8, P2).** `createNode` returns a Board; take `board.nodes[board.nodes.length - 1].id` for `idMap`. Keep the loop sequential.
3. **Redo saves current state (Codex #13, P2).** `redo(currentNodes, currentEdges, restore)` pushes a snapshot of the CURRENT state onto the undo stack (not the snapshot being restored). Update the `useBoard` caller.
4. **Initial fetch error state (Codex #17, P2).** `fetchBoard` catches, stores `error: string | null` in state (cleared on success), and `useBoard` returns it. `CanvasView` renders a minimal centered error panel with the message and a "Retry" button calling `refetch` when `error` is set and `board` is null. No alerts/dialogs.
5. **Roll back failed optimistic edge (Codex #16, P2).** In `onConnect`, on rejection remove the temp edge (`setEdges(eds => eds.filter(e => e.id !== tempId))`) and `console.error` the message. (Thanks to item 1 the rejection path now actually fires.)
6. **Viewport save on move end (Codex #21, P3).** Delete the 2-second interval and the dead comments in `useViewportPersistence`. Keep: restore on mount, the debounced `saveViewport`, and the unmount save. `CanvasView` passes `onMoveEnd={saveViewport}` to `<ReactFlow>`. Remove the `beforeunload` listener only if the unmount save already covers refresh; otherwise keep it (your call, say which in the report).
7. **Parents before children (supports Codex #6).** In `toFlowNodes`, stable-sort so nodes without `parentId` come first (one `sort` call). Child positions arriving from the server are already relative (Lane A) — pass them through unchanged.

**Gate:** tsc as above. Commit per item.

---

## Task 3: Lane E — Build, toolbar, launcher (phase 1)

**Owns:** `frontend/tsconfig.json`, `frontend/package.json`, `frontend/package-lock.json` (if present), root `package.json`, `frontend/src/components/toolbar/NodeFormattingToolbar.tsx`, `assets/InfiniteCanvas.app/Contents/MacOS/launch`. Nothing else.

1. **Frontend build passes (Codex #4, P1).** Ruling: add `vitest` as a frontend devDependency (same version range the server already uses — read `server/package.json`) and a `"test": "vitest run"` script; root `package.json` `test` runs server then frontend tests. Verify `cd frontend && npx tsc --noEmit` is clean, `npx vitest run` passes the existing `color.test.ts`, and `npm run build` succeeds. Do NOT exclude tests from tsc.
2. **Bulk endpoint for multi-node formatting (Codex #20, P2).** `applyData` builds every cleaned `data` payload then calls `api.bulkUpdateNodes(boardId, updates)` once; `handleChangeType` likewise sends one bulk request with `type`, `width`, `height` per node. `applyStyle` already does this — match its shape. The REST bulk route maps `{ id, ... }` → `{ nodeId, ... }` and the store accepts `type`/`data` already.
3. **Tracked launcher path (Codex #18, P2).** Set `PROJECT_DIR` in `assets/InfiniteCanvas.app/Contents/MacOS/launch` to `/Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas`. One line; the installed copy in `/Applications` was already patched by hand.

**Gate:** `cd frontend && npx tsc --noEmit && npx vitest run && npm run build`. Commit per item.

---

## Task 4: Lane B — Server boundary (phase 2, after Lane A merges)

**Owns:** `server/src/api/routes.ts`, `server/src/api/schemas.ts` (new), `server/src/index.ts`, `server/src/mcp/tools.ts`, `server/src/mcp/server.ts`, `server/src/api/__tests__/routes.test.ts`, `server/src/mcp/__tests__/tools.test.ts`, `server/src/__tests__/e2e.test.ts`, `server/package.json` only if a dependency is truly missing (zod is already there). Nothing else — `boards.ts` is frozen; use its `importGraph`, `replaceGraph`, and `shared/types.ts` `NODE_TYPES` as they exist on `main`.

1. **Loopback + CORS (Codex #3, P1).** `app.listen(port, '127.0.0.1', ...)`. `cors({ origin: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ })`. Note in a comment that production mode serves the frontend from the same origin.
2. **Upload body limit (Codex #7, P1).** Ruling: global `express.json({ limit: '25mb' })` (the app is loopback-only after item 1). In the upload route, whitelist the extension (`png|jpg|jpeg|gif|webp|svg`, lower-cased, else 400) and reject decoded buffers over 20 MB with 400.
3. **Request validation (Codex #10, P2).** New `server/src/api/schemas.ts` with zod schemas (zod is already a server dependency) for: create node, update node, bulk update (`updates[]` with `id`), create edge (handles from `VALID_SOURCE_HANDLES`/`VALID_TARGET_HANDLES`), update edge, create group, reorder (`ReorderAction` enum), board metadata, duplicate, mermaid import, auto-layout direction, upload, and the new graph replace (item 6). Node `type` uses `NODE_TYPES` from `shared/types.ts`; `server.ts` imports the same list instead of its local copy. Numbers must be finite; width/height positive. A tiny `validate(schema)(req.body)` helper that throws `new Error('Invalid request: ' + zod issues summary)`. Error middleware maps messages starting with `Invalid` to 400. Tests: `x: "bad"`, negative width, unknown type, array `style` → 400; valid payloads unchanged.
4. **Mermaid warnings returned (Codex #15, P2) + atomic import (Codex #9, P2).** Both `POST /api/boards/:id/import-mermaid` and the MCP `import_mermaid` call `parseMermaid` then `store.importGraph(...)` once, and return `{ ...board, warnings: [...parsed.warnings, ...importWarnings] }`. Remove the per-node/per-edge loops. The existing `MermaidImportModal` already reads `result.warnings` — do not touch it. Tests: a diagram with a repeated edge imports all nodes, one edge, and returns a warning; activity log has exactly one `imported_graph` entry.
5. **Error middleware**: keep existing mappings; add the `Invalid` → 400 rule.
6. **Graph replace route (for Codex #5, P1).** `PUT /api/boards/:id/graph` with body `{ nodes: CanvasNode[], edges: CanvasEdge[] }` validated by schema, calls `store.replaceGraph`, returns the Board. `Invalid graph` errors → 400 via the rule above. Test: round-trip and a dangling edge → 400.

**Gate:** `cd server && npx vitest run && npm run build`. Commit per item.

---

## Task 5: Lane F — Persisted undo/redo (phase 2, parallel with Lane B, after Lane D merges)

**Owns:** `frontend/src/api.ts`, `frontend/src/hooks/useBoard.ts`. Nothing else.

Contract from Lane B (may not be merged yet — code against it): `PUT /api/boards/:id/graph`, body `{ nodes: CanvasNode[], edges: CanvasEdge[] }`, returns the full Board; 400 with `{ error }` on invalid graph.

1. Add `api.replaceGraph(boardId, nodes: CanvasNode[], edges: CanvasEdge[])` using the `request` helper.
2. In `useBoard`, add `toCanvasNodes(nodes: Node[]): CanvasNode[]` and `toCanvasEdges(edges: Edge[]): CanvasEdge[]` — exact inverses of `toFlowNodes`/`toFlowEdges`: strip the internal data keys (`label`, `style`, `width`, `height`, `nodeType`, `boardId`, `nodeId`, `canvasLight`, `isEditing`, `onStartEdit`, `onFinishEdit`, `onCancelEdit`) back out of `data`, restore `label`, `style`, `width`, `height`, `zIndex`, `parentId`, `type`; edges keep `id`, `source`, `target`, handles, `label`, `style`. Positions pass through (relative for children).
3. `restore` calls `api.replaceGraph` with the converted arrays, then `setBoard` from the response and re-derives `nodes`/`edges` from it (so ids/order match the server). On failure, `console.error` and `refetch()`.
4. Remove the old position-only `bulkUpdateNodes` call from `restore`.

**Gate:** `cd frontend && npx tsc --noEmit` clean (Lane E has landed by now). Smoke: create node → undo → refresh page → node is gone; redo → refresh → node is back. Report exactly what you verified.
