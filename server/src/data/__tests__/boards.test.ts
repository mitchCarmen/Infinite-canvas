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
      const withNode = await store.createNode(original.id, { type: 'rectangle', label: 'Node 1' }, 'user');
      const originalNodeId = withNode.nodes[0].id;
      const dupe = await store.duplicateBoard(original.id, 'user', 'Copy');
      expect(dupe.name).toBe('Copy');
      expect(dupe.nodes).toHaveLength(1);
      expect(dupe.id).not.toBe(original.id);
      expect(dupe.nodes[0].id).not.toBe(originalNodeId);
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
