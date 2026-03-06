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
});
