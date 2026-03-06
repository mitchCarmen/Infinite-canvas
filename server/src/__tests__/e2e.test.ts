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
});
