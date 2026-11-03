The repository contains release-blocking security, persistence, build, and state-synchronization defects, including arbitrary path access, cross-process lost updates, and a frontend build that currently fails. Ponytail net: -20 lines possible.

Full review comments:

- [P1] Constrain board IDs before constructing file paths — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/data/boards.ts:66-68
  A `boardId` such as `../../package` escapes `boardsDir`, allowing REST or MCP callers to read or delete arbitrary JSON files, including `server/package.json`. Require UUID board IDs and verify the resolved path remains inside `boardsDir` before every file operation.

- [P1] Serialize board writes across REST and MCP processes — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/data/boards.ts:77-81
  When REST and MCP mutate the same board concurrently, both can read the old snapshot and then overwrite each other; sharing the same `.tmp` filename also permits rename failures or the wrong snapshot being committed. Use a cross-process per-board lock or route all persistence through one process, with unique temporary files.

- [P1] Bind the unauthenticated API to loopback — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/index.ts:21-21
  `app.listen(port)` binds to all interfaces while the API has no authentication and `cors()` allows every origin, so LAN peers or browser pages can read, modify, and delete local boards. Bind to `127.0.0.1`/`::1` and restrict CORS to the local frontend origin.

- [P1] Add the missing frontend Vitest dependency — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/frontend/src/utils/__tests__/color.test.ts:1-1
  The production build runs `tsc`, which includes this test and fails with `TS2307: Cannot find module 'vitest'` because the frontend package does not declare Vitest. Add Vitest to frontend devDependencies and a test script, or exclude test files from the build configuration.

- [P1] Persist complete state when undoing structural changes — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/frontend/src/hooks/useBoard.ts:234-245
  Undo restores nodes and edges only in React state, while the backend receives position updates alone. Undoing add, delete, paste, or group therefore leaves persisted data unchanged and disappears on refetch; implement server-side snapshots or reconcile node and edge creation, deletion, and updates atomically.

- [P1] Store groups using React Flow parent semantics — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/data/boards.ts:459-464
  The group is appended after its children and child coordinates remain absolute, but React Flow requires parents before children and interprets child positions relative to the parent. Grouping therefore emits a missing-parent warning and shifts or clamps children; insert the parent before its children and subtract the group origin from each child position.

- [P1] Accept normal-sized image uploads — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/api/routes.ts:13-13
  `express.json()` retains its 100 KB default limit, so typical base64-encoded images are rejected before the upload route runs. Use multipart or a bounded, explicitly larger limit for this endpoint while retaining a deliberate maximum upload size.

- [P2] Read the created node ID from the returned board — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/frontend/src/hooks/useClipboard.ts:40-50
  `api.createNode` returns a full `Board`, so `newNode.id` is the board ID rather than the newly created node ID. Pasting connected nodes consequently persists the nodes but fails while recreating edges; return the created node explicitly or select the newly appended node from the returned board.

- [P2] Make Mermaid imports atomic — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/api/routes.ts:229-234
  Each parsed element is committed independently, so a later failure leaves a partial import. A common sequence diagram with multiple messages between the same participants creates all nodes and one edge before duplicate-edge validation aborts; validate first and commit the complete import in one BoardStore transaction.

- [P2] Reject invalid REST node payloads before persistence — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/api/routes.ts:81-88
  The REST boundary checks only truthiness, so payloads such as `x: "bad"`, negative dimensions, arrays for style, or unsupported node types can be persisted or produce a 500, while MCP inputs are schema-validated. Apply shared runtime schemas with finite numeric bounds and enums before calling BoardStore.

- [P2] Throw on non-successful REST responses — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/frontend/src/api.ts:4-4
  API helpers parse JSON without checking `response.ok`, so 4xx/5xx responses resolve as successes and caller error handlers never run. Centralize fetch handling, parse the error body, and throw for non-2xx statuses before returning typed data.

- [P2] Detach children when deleting a group — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/data/boards.ts:282-286
  Deleting a group removes only that node and connected edges, leaving every child with a dangling `parentId`. Subsequent React Flow loads cannot resolve the parent; explicitly ungroup children while preserving absolute positions, or cascade-delete them according to a documented policy.

- [P2] Save the current state before applying redo — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/frontend/src/hooks/useUndoRedo.ts:56-67
  Redo pushes the snapshot being restored onto the undo stack instead of the current pre-redo state. After undo → redo, the next undo restores the same state and becomes a no-op; pass current nodes and edges into redo and snapshot them before restoring the redo entry.

- [P2] Keep the board index recoverable from interrupted writes — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/data/boards.ts:98-102
  Board creation commits the board file before updating `index.json`; a crash or index-write failure between these operations leaves a valid but unreachable board. Treat the index as rebuildable from board files or introduce a transaction/journal covering both writes.

- [P2] Return Mermaid parser warnings to callers — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/api/routes.ts:237-237
  The parser produces warnings and the modal explicitly reads `result.warnings`, but this route returns only the board. Unsupported lines are therefore silently omitted and the modal closes as if import succeeded; return both board and warnings consistently from REST and MCP.

- [P2] Remove optimistic edges when persistence fails — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/frontend/src/hooks/useBoard.ts:215-221
  If edge creation is rejected, such as when targeting a group or racing another edge creation, the temporary edge remains visible indefinitely even though it was never saved. Remove the temporary edge or refetch in the rejection handler while surfacing the error.

- [P2] Handle initial board-fetch failures — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/frontend/src/hooks/useBoard.ts:123-126
  The effect invokes `fetchBoard()` without handling rejection, and `fetchBoard` has only a `finally` block. If the server is unavailable or the board is malformed, this produces an unhandled promise rejection and leaves an empty canvas with no error state; catch the failure and render a retryable error.

- [P2] Derive the app launcher path from its location — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/assets/InfiniteCanvas.app/Contents/MacOS/launch:7-7
  The tracked launcher points to `/Projects/Personal/Infinite_canvas`, which does not exist in this checkout, so launching the packaged app exits at its `cd`. Derive the repository path relative to the launcher or update it to the current `Personal Projects` location.

- [P2] Index nodes once during bulk updates — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/server/src/data/boards.ts:249-251
  Every update performs a full `findIndex` scan, making a bulk move of n nodes O(n²). Build a node-ID map once, then apply each update in O(1), especially because multi-selection drag sends this path.

- [P2] Use the bulk endpoint for multi-node formatting — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/frontend/src/components/toolbar/NodeFormattingToolbar.tsx:100-110
  Applying data formatting sends one full-board read/write request per selected node, producing partial updates on network failure and unnecessary disk churn even though `bulkUpdateNodes` already supports data changes. Build all cleaned data payloads and submit one bulk request.

- [P3] Replace viewport polling with React Flow move events — /Users/mitchcarmen/Documents/Projects/Personal Projects/Infinite_canvas/frontend/src/hooks/useViewportPersistence.ts:47-56
  The hook defines an unused debounced saver and separately polls the viewport every two seconds. Use React Flow's native `onMoveEnd` callback plus an unmount save, removing the timer, interval, and dead return path; net: -20 lines possible.