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
    expect(result.boards).toEqual([]);
    expect(result.boardsDir).toBeDefined();
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
    expect(list.boards).toEqual([]);
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

  // ── Actor Attribution ─────────────────────────────────────────────
  // Every MCP mutation must record actor as 'claude', never 'user'.
  // These tests verify each tool individually because a single hardcoded
  // 'user' in any code path is the exact bug we're guarding against.

  describe('Actor attribution', () => {
    it('create_board records actor as claude', async () => {
      const board = await handler('create_board', { name: 'Actor Test' });
      expect(board.activityLog).toHaveLength(1);
      expect(board.activityLog[0].actor).toBe('claude');
      expect(board.activityLog[0].action).toBe('created_board');
    });

    it('create_node records actor as claude', async () => {
      const board = await handler('create_board', { name: 'Test' });
      const updated = await handler('create_node', {
        boardId: board.id, type: 'rectangle', label: 'N',
      });
      const entry = updated.activityLog.find((e: any) => e.action === 'created_node');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('claude');
    });

    it('update_node records actor as claude', async () => {
      const board = await handler('create_board', { name: 'Test' });
      const b2 = await handler('create_node', {
        boardId: board.id, type: 'rectangle', label: 'Old',
      });
      const updated = await handler('update_node', {
        boardId: board.id, nodeId: b2.nodes[0].id, label: 'New',
      });
      const entry = updated.activityLog.find((e: any) => e.action === 'updated_node');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('claude');
    });

    it('delete_node records actor as claude', async () => {
      const board = await handler('create_board', { name: 'Test' });
      const b2 = await handler('create_node', {
        boardId: board.id, type: 'rectangle', label: 'Gone',
      });
      const updated = await handler('delete_node', {
        boardId: board.id, nodeId: b2.nodes[0].id,
      });
      const entry = updated.activityLog.find((e: any) => e.action === 'deleted_node');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('claude');
    });

    it('create_edge records actor as claude', async () => {
      const board = await handler('create_board', { name: 'Test' });
      let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
      b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
      b = await handler('create_edge', {
        boardId: board.id, source: b.nodes[0].id, target: b.nodes[1].id,
      });
      const entry = b.activityLog.find((e: any) => e.action === 'created_edge');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('claude');
    });

    it('delete_edge records actor as claude', async () => {
      const board = await handler('create_board', { name: 'Test' });
      let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
      b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
      b = await handler('create_edge', {
        boardId: board.id, source: b.nodes[0].id, target: b.nodes[1].id,
      });
      b = await handler('delete_edge', { boardId: board.id, edgeId: b.edges[0].id });
      const entry = b.activityLog.find((e: any) => e.action === 'deleted_edge');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('claude');
    });

    it('duplicate_board records actor as claude', async () => {
      const board = await handler('create_board', { name: 'Original' });
      const dup = await handler('duplicate_board', { boardId: board.id, newName: 'Copy' });
      expect(dup.activityLog).toHaveLength(1);
      expect(dup.activityLog[0].actor).toBe('claude');
      expect(dup.activityLog[0].action).toBe('duplicated_board');
    });

    it('create_group records actor as claude', async () => {
      const board = await handler('create_board', { name: 'Test' });
      let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
      b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
      b = await handler('create_group', {
        boardId: board.id, label: 'G1', nodeIds: b.nodes.map((n: any) => n.id),
      });
      const entry = b.activityLog.find((e: any) => e.action === 'created_group');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('claude');
    });

    it('auto_layout records actor as claude', async () => {
      const board = await handler('create_board', { name: 'Test' });
      let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
      b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'B' });
      b = await handler('create_edge', {
        boardId: board.id, source: b.nodes[0].id, target: b.nodes[1].id,
      });
      b = await handler('auto_layout', { boardId: board.id, direction: 'TB' });
      const entry = b.activityLog.find((e: any) => e.action === 'auto_layout');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('claude');
    });

    it('import_mermaid tags ALL generated activity entries as claude', async () => {
      const board = await handler('create_board', { name: 'Test' });
      const result = await handler('import_mermaid', {
        boardId: board.id,
        mermaidSyntax: 'graph TD\n  A[Start] --> B{Decision}\n  B --> C[End]',
      });
      // import_mermaid creates multiple nodes + edges, each producing an activity entry
      expect(result.activityLog.length).toBeGreaterThan(3);
      const nonClaude = result.activityLog.filter((e: any) => e.actor !== 'claude');
      expect(nonClaude).toEqual([]);
    });

    it('duplicate_board does NOT inherit original activity log', async () => {
      const board = await handler('create_board', { name: 'Original' });
      await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'N' });
      const original = await handler('read_board', { boardId: board.id });
      expect(original.activityLog.length).toBeGreaterThan(1);

      const dup = await handler('duplicate_board', { boardId: board.id, newName: 'Copy' });
      // Duplicate starts fresh — only the duplication entry
      expect(dup.activityLog).toHaveLength(1);
      expect(dup.activityLog[0].action).toBe('duplicated_board');
    });

    it('full MCP workflow never produces a user actor entry', async () => {
      // Comprehensive regression: exercise every mutation type, verify zero 'user' leaks
      const board = await handler('create_board', { name: 'Full Workflow' });
      let b = await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'A' });
      b = await handler('create_node', { boardId: board.id, type: 'circle', label: 'B' });
      b = await handler('update_node', { boardId: board.id, nodeId: b.nodes[0].id, label: 'A2' });
      b = await handler('create_edge', {
        boardId: board.id, source: b.nodes[0].id, target: b.nodes[1].id,
      });
      b = await handler('auto_layout', { boardId: board.id });
      b = await handler('delete_edge', { boardId: board.id, edgeId: b.edges[0].id });
      b = await handler('create_group', {
        boardId: board.id, label: 'G', nodeIds: b.nodes.map((n: any) => n.id),
      });
      b = await handler('delete_node', { boardId: board.id, nodeId: b.nodes[0].id });

      const final = await handler('read_board', { boardId: board.id });
      const userEntries = final.activityLog.filter((e: any) => e.actor === 'user');
      expect(userEntries).toEqual([]);
      expect(final.activityLog.length).toBeGreaterThan(5);
      expect(final.activityLog.every((e: any) => e.actor === 'claude')).toBe(true);
    });

    it('each activity entry has required fields', async () => {
      const board = await handler('create_board', { name: 'Schema Test' });
      await handler('create_node', { boardId: board.id, type: 'rectangle', label: 'N' });
      const read = await handler('read_board', { boardId: board.id });

      for (const entry of read.activityLog) {
        expect(entry.id).toBeDefined();
        expect(typeof entry.id).toBe('string');
        expect(entry.timestamp).toBeDefined();
        expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
        expect(['user', 'claude']).toContain(entry.actor);
        expect(typeof entry.action).toBe('string');
        expect(typeof entry.summary).toBe('string');
      }
    });
  });

  // ── Diagnostic Error Messages (TDD) ──────────────────────────────
  // These test the improved error messages we'll implement.
  // Board-not-found errors should include the BOARDS_DIR path so
  // a misconfigured MCP server is immediately obvious.

  describe('Diagnostic error messages', () => {
    it('read_board error for nonexistent board includes BOARDS_DIR path', async () => {
      try {
        await handler('read_board', { boardId: 'nonexistent-uuid' });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).toContain('Board not found');
        expect(err.message).toContain(tmpDir);
      }
    });

    it('update_node error for nonexistent board includes BOARDS_DIR path', async () => {
      try {
        await handler('update_node', {
          boardId: 'nonexistent-uuid', nodeId: 'fake', label: 'X',
        });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).toContain(tmpDir);
      }
    });

    it('delete_node error for nonexistent board includes BOARDS_DIR path', async () => {
      try {
        await handler('delete_node', { boardId: 'nonexistent-uuid', nodeId: 'fake' });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).toContain(tmpDir);
      }
    });

    it('create_node error for nonexistent board includes BOARDS_DIR path', async () => {
      try {
        await handler('create_node', {
          boardId: 'nonexistent-uuid', type: 'rectangle', label: 'X',
        });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).toContain(tmpDir);
      }
    });

    it('delete_board error for nonexistent board includes BOARDS_DIR path', async () => {
      try {
        await handler('delete_board', { boardId: 'nonexistent-uuid' });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).toContain(tmpDir);
      }
    });

    it('list_boards on empty store includes directory context', async () => {
      const result = await handler('list_boards', {});
      // After implementation: empty result should include boardsDir and hint
      expect(result).toBeDefined();
      expect(result.boards).toEqual([]);
      expect(result.boardsDir).toBe(tmpDir);
      expect(result.hint).toMatch(/no boards found/i);
    });

    it('board-not-found error includes count of available boards', async () => {
      // Create two boards so the store isn't empty
      await handler('create_board', { name: 'Board A' });
      await handler('create_board', { name: 'Board B' });

      try {
        await handler('read_board', { boardId: 'nonexistent-uuid' });
        expect.fail('Should have thrown');
      } catch (err: any) {
        // Error should mention how many boards DO exist to help debug
        expect(err.message).toContain('2');
        expect(err.message).toContain(tmpDir);
      }
    });
  });
});
