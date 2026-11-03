import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createApp } from '../routes.js';

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

  const send = (method: string, path: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  describe('CORS', () => {
    it('allows localhost and 127.0.0.1 origins on any port', async () => {
      for (const origin of ['http://localhost:3010', 'http://127.0.0.1:5173', 'http://localhost']) {
        const res = await fetch(`${baseUrl}/api/boards`, { headers: { Origin: origin } });
        expect(res.headers.get('access-control-allow-origin')).toBe(origin);
      }
    });

    it('does not allow other origins', async () => {
      for (const origin of ['http://evil.example', 'http://localhost.evil.example', 'http://127.0.0.1.evil.example:3010']) {
        const res = await fetch(`${baseUrl}/api/boards`, { headers: { Origin: origin } });
        expect(res.headers.get('access-control-allow-origin')).toBeNull();
      }
    });
  });

  describe('Image upload', () => {
    const newBoardId = async () => (await (await send('POST', '/api/boards', { name: 'Uploads' })).json()).id;

    it('accepts an image larger than the default 100kb JSON limit', async () => {
      const id = await newBoardId();
      const bytes = Buffer.alloc(1024 * 1024, 7);
      const res = await send('POST', `/api/boards/${id}/upload-image`, {
        imageData: bytes.toString('base64'),
        filename: 'photo.png',
      });
      expect(res.status).toBe(200);
      const { url } = await res.json();
      expect(url).toMatch(/^\/api\/assets\/[0-9a-f-]+\.png$/);
      const asset = await fetch(`${baseUrl}${url}`);
      expect(Buffer.from(await asset.arrayBuffer()).equals(bytes)).toBe(true);
    });

    it('lower-cases the stored extension', async () => {
      const id = await newBoardId();
      const res = await send('POST', `/api/boards/${id}/upload-image`, { imageData: 'aGk=', filename: 'Shot.JPEG' });
      expect(res.status).toBe(200);
      expect((await res.json()).url).toMatch(/\.jpeg$/);
    });

    it('rejects a non-image extension with 400', async () => {
      const id = await newBoardId();
      for (const filename of ['page.html', 'noext', 'x.png.js']) {
        const res = await send('POST', `/api/boards/${id}/upload-image`, { imageData: 'aGk=', filename });
        expect(res.status).toBe(400);
      }
    });

    it('rejects a body over 25mb with 413', async () => {
      const id = await newBoardId();
      const res = await send('POST', `/api/boards/${id}/upload-image`, {
        imageData: 'A'.repeat(26 * 1024 * 1024),
        filename: 'huge.png',
      });
      expect(res.status).toBe(413);
    });
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

  it('DELETE /api/boards/:id deletes a board', async () => {
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Doomed Board' }),
    });
    const board = await createRes.json();
    const res = await fetch(`${baseUrl}/api/boards/${board.id}`, { method: 'DELETE' });
    expect(res.status).toBe(204);

    const getRes = await fetch(`${baseUrl}/api/boards/${board.id}`);
    expect(getRes.status).toBe(404);
  });

  it('POST /api/boards/:id/duplicate duplicates a board', async () => {
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Original' }),
    });
    const board = await createRes.json();
    const res = await fetch(`${baseUrl}/api/boards/${board.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: 'Copy' }),
    });
    expect(res.status).toBe(201);
    const copy = await res.json();
    expect(copy.name).toBe('Copy');
    expect(copy.id).not.toBe(board.id);
  });

  it('PATCH /api/boards/:id/nodes/:nodeId updates a node', async () => {
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    const board = await createRes.json();
    const nodeRes = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rectangle', label: 'Node 1' }),
    });
    const withNode = await nodeRes.json();
    const nodeId = withNode.nodes[0].id;

    const res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.nodes[0].label).toBe('Updated');
  });

  it('DELETE /api/boards/:id/nodes/:nodeId deletes a node', async () => {
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    const board = await createRes.json();
    const nodeRes = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rectangle', label: 'Node 1' }),
    });
    const withNode = await nodeRes.json();
    const nodeId = withNode.nodes[0].id;

    const res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes/${nodeId}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.nodes).toHaveLength(0);
  });

  it('POST /api/boards/:id/edges creates an edge', async () => {
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    const board = await createRes.json();

    // Create two nodes
    const n1Res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rectangle', label: 'A' }),
    });
    const b1 = await n1Res.json();
    const n2Res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rectangle', label: 'B' }),
    });
    const b2 = await n2Res.json();

    const res = await fetch(`${baseUrl}/api/boards/${board.id}/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: b2.nodes[0].id,
        target: b2.nodes[1].id,
      }),
    });
    expect(res.status).toBe(201);
    const updated = await res.json();
    expect(updated.edges).toHaveLength(1);
  });

  it('POST /api/boards/:id/edges returns 400 for self-loop', async () => {
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    const board = await createRes.json();
    const nodeRes = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rectangle', label: 'A' }),
    });
    const withNode = await nodeRes.json();
    const nodeId = withNode.nodes[0].id;

    const res = await fetch(`${baseUrl}/api/boards/${board.id}/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: nodeId, target: nodeId }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/boards/:id/import-mermaid imports mermaid syntax', async () => {
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Mermaid Board' }),
    });
    const board = await createRes.json();

    const res = await fetch(`${baseUrl}/api/boards/${board.id}/import-mermaid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mermaidSyntax: 'graph TD\nA[Start] --> B[End]',
      }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.nodes.length).toBeGreaterThanOrEqual(2);
    expect(updated.edges.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/boards/:id/auto-layout applies layout', async () => {
    const createRes = await fetch(`${baseUrl}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Layout Board' }),
    });
    const board = await createRes.json();

    // Add nodes
    await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rectangle', label: 'A' }),
    });
    await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'rectangle', label: 'B' }),
    });

    const res = await fetch(`${baseUrl}/api/boards/${board.id}/auto-layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: 'LR' }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.nodes).toHaveLength(2);
  });

  // ── Actor Attribution ─────────────────────────────────────────────
  // Every REST mutation must record actor as 'user', never 'claude'.
  // Mirror of the MCP actor tests — both sides of the contract matter.

  describe('Actor attribution', () => {
    it('create_board records actor as user', async () => {
      const res = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Actor Test' }),
      });
      const board = await res.json();
      expect(board.activityLog).toHaveLength(1);
      expect(board.activityLog[0].actor).toBe('user');
      expect(board.activityLog[0].action).toBe('created_board');
    });

    it('create_node records actor as user', async () => {
      const boardRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const board = await boardRes.json();
      const res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'N' }),
      });
      const updated = await res.json();
      const entry = updated.activityLog.find((e: any) => e.action === 'created_node');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('user');
    });

    it('update_node records actor as user', async () => {
      const boardRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const board = await boardRes.json();
      const nodeRes = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'Old' }),
      });
      const withNode = await nodeRes.json();
      const nodeId = withNode.nodes[0].id;

      const res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'New' }),
      });
      const updated = await res.json();
      const entry = updated.activityLog.find((e: any) => e.action === 'updated_node');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('user');
    });

    it('delete_node records actor as user', async () => {
      const boardRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const board = await boardRes.json();
      const nodeRes = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'Gone' }),
      });
      const withNode = await nodeRes.json();
      const nodeId = withNode.nodes[0].id;

      const res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes/${nodeId}`, {
        method: 'DELETE',
      });
      const updated = await res.json();
      const entry = updated.activityLog.find((e: any) => e.action === 'deleted_node');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('user');
    });

    it('create_edge records actor as user', async () => {
      const boardRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const board = await boardRes.json();
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'A' }),
      });
      const b2Res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'B' }),
      });
      const b2 = await b2Res.json();

      const res = await fetch(`${baseUrl}/api/boards/${board.id}/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: b2.nodes[0].id, target: b2.nodes[1].id }),
      });
      const updated = await res.json();
      const entry = updated.activityLog.find((e: any) => e.action === 'created_edge');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('user');
    });

    it('duplicate_board records actor as user', async () => {
      const boardRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Original' }),
      });
      const board = await boardRes.json();

      const res = await fetch(`${baseUrl}/api/boards/${board.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: 'Copy' }),
      });
      const dup = await res.json();
      expect(dup.activityLog).toHaveLength(1);
      expect(dup.activityLog[0].actor).toBe('user');
      expect(dup.activityLog[0].action).toBe('duplicated_board');
    });

    it('import_mermaid records all entries as user', async () => {
      const boardRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Mermaid Test' }),
      });
      const board = await boardRes.json();

      const res = await fetch(`${baseUrl}/api/boards/${board.id}/import-mermaid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mermaidSyntax: 'graph TD\n  A[Start] --> B[End]' }),
      });
      const updated = await res.json();
      expect(updated.activityLog.length).toBeGreaterThan(1);
      const nonUser = updated.activityLog.filter((e: any) => e.actor !== 'user');
      expect(nonUser).toEqual([]);
    });

    it('auto_layout records actor as user', async () => {
      const boardRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Layout Test' }),
      });
      const board = await boardRes.json();
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'A' }),
      });
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'B' }),
      });

      const res = await fetch(`${baseUrl}/api/boards/${board.id}/auto-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'TB' }),
      });
      const updated = await res.json();
      const entry = updated.activityLog.find((e: any) => e.action === 'auto_layout');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('user');
    });

    it('full REST workflow never produces a claude actor entry', async () => {
      const boardRes = await fetch(`${baseUrl}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Full Workflow' }),
      });
      const board = await boardRes.json();

      // Create two nodes
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rectangle', label: 'A' }),
      });
      const b2Res = await fetch(`${baseUrl}/api/boards/${board.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'circle', label: 'B' }),
      });
      const b2 = await b2Res.json();

      // Update a node
      await fetch(`${baseUrl}/api/boards/${board.id}/nodes/${b2.nodes[0].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'A2' }),
      });

      // Create edge
      await fetch(`${baseUrl}/api/boards/${board.id}/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: b2.nodes[0].id, target: b2.nodes[1].id }),
      });

      // Auto-layout
      await fetch(`${baseUrl}/api/boards/${board.id}/auto-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'LR' }),
      });

      // Read final state
      const readRes = await fetch(`${baseUrl}/api/boards/${board.id}`);
      const final = await readRes.json();
      expect(final.activityLog.length).toBeGreaterThan(4);
      expect(final.activityLog.every((e: any) => e.actor === 'user')).toBe(true);
      expect(final.activityLog.some((e: any) => e.actor === 'claude')).toBe(false);
    });
  });
});
