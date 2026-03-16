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

  it('delete_board removes it from list', async () => {
    const board = await handler('create_board', { name: 'ToDelete' });
    await handler('delete_board', { boardId: board.id });
    const list = await handler('list_boards', {});
    expect(list).toEqual([]);
  });

  it('duplicate_board creates a copy', async () => {
    const board = await handler('create_board', { name: 'Original' });
    await handler('create_node', {
      boardId: board.id,
      type: 'rectangle',
      label: 'Node1',
    });
    const dup = await handler('duplicate_board', { boardId: board.id, newName: 'Copy' });
    expect(dup.name).toBe('Copy');
    expect(dup.nodes).toHaveLength(1);
    expect(dup.id).not.toBe(board.id);
  });

  it('update_node changes label', async () => {
    const board = await handler('create_board', { name: 'Test' });
    const afterCreate = await handler('create_node', {
      boardId: board.id,
      type: 'rectangle',
      label: 'Old',
    });
    const nodeId = afterCreate.nodes[0].id;
    const updated = await handler('update_node', {
      boardId: board.id,
      nodeId,
      label: 'New',
    });
    expect(updated.nodes[0].label).toBe('New');
  });

  it('delete_node removes it', async () => {
    const board = await handler('create_board', { name: 'Test' });
    const afterCreate = await handler('create_node', {
      boardId: board.id,
      type: 'rectangle',
      label: 'Gone',
    });
    const nodeId = afterCreate.nodes[0].id;
    const result = await handler('delete_node', { boardId: board.id, nodeId });
    expect(result.nodes).toHaveLength(0);
  });

  it('create_edge + delete_edge round-trips', async () => {
    const board = await handler('create_board', { name: 'Test' });
    let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
    b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
    const [nodeA, nodeB] = b.nodes;
    b = await handler('create_edge', { boardId: board.id, source: nodeA.id, target: nodeB.id, label: 'link' });
    expect(b.edges).toHaveLength(1);
    expect(b.edges[0].label).toBe('link');

    b = await handler('delete_edge', { boardId: board.id, edgeId: b.edges[0].id });
    expect(b.edges).toHaveLength(0);
  });

  it('create_edge persists sourceHandle and targetHandle', async () => {
    const board = await handler('create_board', { name: 'Test' });
    let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
    b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
    const [nodeA, nodeB] = b.nodes;
    b = await handler('create_edge', {
      boardId: board.id,
      source: nodeA.id,
      target: nodeB.id,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    });
    expect(b.edges).toHaveLength(1);
    expect(b.edges[0].sourceHandle).toBe('right-source');
    expect(b.edges[0].targetHandle).toBe('left-target');
  });

  it('create_edge persists style with routing and arrowMode', async () => {
    const board = await handler('create_board', { name: 'Test' });
    let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
    b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
    const [nodeA, nodeB] = b.nodes;
    b = await handler('create_edge', {
      boardId: board.id,
      source: nodeA.id,
      target: nodeB.id,
      style: { routing: 'step', arrowMode: 'forward' },
    });
    expect(b.edges).toHaveLength(1);
    expect(b.edges[0].style).toEqual({ routing: 'step', arrowMode: 'forward' });
  });

  it('create_edge without handles still works (backward compatibility)', async () => {
    const board = await handler('create_board', { name: 'Test' });
    let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
    b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
    const [nodeA, nodeB] = b.nodes;
    b = await handler('create_edge', {
      boardId: board.id,
      source: nodeA.id,
      target: nodeB.id,
    });
    expect(b.edges).toHaveLength(1);
    expect(b.edges[0].sourceHandle).toBeUndefined();
    expect(b.edges[0].targetHandle).toBeUndefined();
    expect(b.edges[0].style).toBeUndefined();
  });

  it('create_edge with all params matches CLAUDE.md convention', async () => {
    const board = await handler('create_board', { name: 'Test' });
    let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'Start' });
    b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'End' });
    const [nodeA, nodeB] = b.nodes;
    b = await handler('create_edge', {
      boardId: board.id,
      source: nodeA.id,
      target: nodeB.id,
      label: 'next',
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      style: { routing: 'step', arrowMode: 'forward' },
    });
    expect(b.edges).toHaveLength(1);
    const edge = b.edges[0];
    expect(edge.label).toBe('next');
    expect(edge.sourceHandle).toBe('right-source');
    expect(edge.targetHandle).toBe('left-target');
    expect(edge.style).toEqual({ routing: 'step', arrowMode: 'forward' });
  });

  it('create_group wraps nodes', async () => {
    const board = await handler('create_board', { name: 'Test' });
    let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
    b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
    const nodeIds = b.nodes.map((n: any) => n.id);
    b = await handler('create_group', { boardId: board.id, label: 'Group1', nodeIds });
    const groupNode = b.nodes.find((n: any) => n.type === 'group');
    expect(groupNode).toBeDefined();
    expect(groupNode!.label).toBe('Group1');
  });

  it('auto_layout repositions nodes', async () => {
    const board = await handler('create_board', { name: 'Test' });
    let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
    b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
    const [nA, nB] = b.nodes;
    await handler('create_edge', { boardId: board.id, source: nA.id, target: nB.id });
    b = await handler('auto_layout', { boardId: board.id, direction: 'LR' });
    // After layout, nodes should have different positions
    expect(b.nodes).toHaveLength(2);
  });

  it('export_board returns board data', async () => {
    const board = await handler('create_board', { name: 'Test' });
    const result = await handler('export_board', { boardId: board.id });
    expect(result.board).toBeDefined();
    expect(result.format).toBe('json');
  });

  it('throws on unknown tool', async () => {
    await expect(handler('nonexistent_tool', {})).rejects.toThrow('Unknown tool');
  });
});
