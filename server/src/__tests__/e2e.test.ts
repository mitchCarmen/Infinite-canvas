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
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'REST Board' }),
    });
    const board = await createRes.json();

    await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'diamond', label: 'Decision' }),
    });

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
    const positions = laid.nodes.map((n: any) => `${n.x},${n.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(laid.nodes.length);
  });

  // ── Mixed Actor Attribution ────────────────────────────────────────
  // The core user scenario: Claude builds something via MCP, user edits
  // via the UI (REST), and the activity log correctly shows who did what.

  describe('Mixed actor attribution', () => {
    it('MCP create + REST edit produces both actor types in one board', async () => {
      // Claude creates the board via MCP
      const board = await mcp('create_board', { name: 'Mixed Board' });

      // User adds a node via REST
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'User Node' }),
      });

      // Claude adds a node via MCP
      await mcp('create_node', { boardId: board.id, type: 'circle', label: 'Claude Node' });

      const read = await mcp('read_board', { boardId: board.id });
      const actors = read.activityLog.map((e: any) => e.actor);
      expect(actors).toContain('user');
      expect(actors).toContain('claude');
    });

    it('activity entries are in correct chronological order across actors', async () => {
      const board = await mcp('create_board', { name: 'Chrono Test' });

      // REST creates node
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'REST First' }),
      });

      // MCP creates node
      await mcp('create_node', { boardId: board.id, type: 'rectangle', label: 'MCP Second' });

      const read = await mcp('read_board', { boardId: board.id });
      const timestamps = read.activityLog.map((e: any) => new Date(e.timestamp).getTime());

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('actor attribution survives interleaved mutation sequence', async () => {
      // Simulates a real session: Claude builds a diagram, user tweaks it,
      // Claude adjusts layout, user deletes something
      const board = await mcp('create_board', { name: 'Interleaved' });

      // Claude: create two nodes and an edge
      let b = await mcp('create_node', { boardId: board.id, type: 'rectangle', label: 'Start' });
      b = await mcp('create_node', { boardId: board.id, type: 'diamond', label: 'Decision' });
      await mcp('create_edge', {
        boardId: board.id, source: b.nodes[0].id, target: b.nodes[1].id,
      });

      // User: rename the first node via REST
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes/${b.nodes[0].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Begin' }),
      });

      // Claude: auto-layout
      await mcp('auto_layout', { boardId: board.id });

      // User: add another node via REST
      const addRes = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'User Added' }),
      });
      const afterAdd = await addRes.json();

      // User: delete that node via REST
      const userNodeId = afterAdd.nodes.find((n: any) => n.label === 'User Added')!.id;
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes/${userNodeId}`, {
        method: 'DELETE',
      });

      const final = await mcp('read_board', { boardId: board.id });
      const log = final.activityLog;

      // Expected sequence of actors:
      // claude: created_board, created_node, created_node, created_edge, auto_layout
      // user: updated_node, created_node, deleted_node
      const claudeEntries = log.filter((e: any) => e.actor === 'claude');
      const userEntries = log.filter((e: any) => e.actor === 'user');

      expect(claudeEntries.length).toBe(5);
      expect(userEntries.length).toBe(3);

      // Verify specific actions map to correct actors
      expect(claudeEntries.map((e: any) => e.action)).toEqual(
        expect.arrayContaining(['created_board', 'created_node', 'created_edge', 'auto_layout']),
      );
      expect(userEntries.map((e: any) => e.action)).toEqual(
        expect.arrayContaining(['updated_node', 'created_node', 'deleted_node']),
      );
    });

    it('each activity entry has a unique id regardless of actor', async () => {
      const board = await mcp('create_board', { name: 'ID Test' });
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'REST' }),
      });
      await mcp('create_node', { boardId: board.id, type: 'rectangle', label: 'MCP' });

      const read = await mcp('read_board', { boardId: board.id });
      const ids = read.activityLog.map((e: any) => e.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('MCP board visible via REST preserves claude actor entries', async () => {
      // Claude creates board with nodes via MCP
      const board = await mcp('create_board', { name: 'MCP Board' });
      await mcp('create_node', { boardId: board.id, type: 'rectangle', label: 'N' });

      // Read it back via REST — actor should still be 'claude'
      const res = await fetch(`${baseUrl}/api/boards/${board.id}`);
      const read = await res.json();
      expect(read.activityLog.every((e: any) => e.actor === 'claude')).toBe(true);
    });

    it('REST board visible via MCP preserves user actor entries', async () => {
      // User creates board with nodes via REST
      const createRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'REST Board' }),
      });
      const board = await createRes.json();
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'N' }),
      });

      // Read it back via MCP — actor should still be 'user'
      const read = await mcp('read_board', { boardId: board.id });
      expect(read.activityLog.every((e: any) => e.actor === 'user')).toBe(true);
    });

    it('duplicate via MCP of REST-created board starts fresh with claude actor', async () => {
      // User creates a board with history via REST
      const createRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'User Original' }),
      });
      const board = await createRes.json();
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'User Node' }),
      });

      // Claude duplicates it via MCP
      const dup = await mcp('duplicate_board', { boardId: board.id, newName: 'Claude Copy' });

      // Duplicate should have fresh log with only claude's duplication entry
      expect(dup.activityLog).toHaveLength(1);
      expect(dup.activityLog[0].actor).toBe('claude');
      expect(dup.activityLog[0].action).toBe('duplicated_board');
    });

    it('duplicate via REST of MCP-created board starts fresh with user actor', async () => {
      // Claude creates a board with history via MCP
      const board = await mcp('create_board', { name: 'Claude Original' });
      await mcp('create_node', { boardId: board.id, type: 'rectangle', label: 'Claude Node' });

      // User duplicates it via REST
      const res = await fetch(`${baseUrl}/api/boards/${board.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: 'User Copy' }),
      });
      const dup = await res.json();

      // Duplicate should have fresh log with only user's duplication entry
      expect(dup.activityLog).toHaveLength(1);
      expect(dup.activityLog[0].actor).toBe('user');
      expect(dup.activityLog[0].action).toBe('duplicated_board');
    });
  });
});
