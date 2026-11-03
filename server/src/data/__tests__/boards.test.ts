import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BoardStore } from '../boards.js';
import type { CanvasNode, CanvasEdge } from '../../../../shared/types.js';

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

    it('updateNode can change node type and resets dimensions', async () => {
      const board = await store.createBoard('test', 'user');
      const b2 = await store.createNode(board.id, { type: 'rectangle', label: 'R1' }, 'user');
      const nodeId = b2.nodes[0].id;

      const b3 = await store.updateNode(board.id, nodeId, { type: 'circle' }, 'user');
      const updated = b3.nodes.find(n => n.id === nodeId)!;
      expect(updated.type).toBe('circle');
      expect(updated.width).toBe(100);  // DEFAULT_NODE_DIMENSIONS.circle.width
      expect(updated.height).toBe(100); // DEFAULT_NODE_DIMENSIONS.circle.height
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

  describe('board id guard', () => {
    it('rejects non-UUID ids before touching the filesystem', async () => {
      const outside = join(tmpDir, 'x.json');
      writeFileSync(outside, JSON.stringify({ id: 'x', name: 'outside', nodes: [], edges: [], activityLog: [] }));
      await expect(store.readBoard('../../package')).rejects.toThrow('Board not found');
      await expect(store.readBoard('../x')).rejects.toThrow('Board not found');
      await expect(store.deleteBoard('../x')).rejects.toThrow('Board not found');
      expect(existsSync(outside)).toBe(true);
    });
  });

  describe('createGroup semantics', () => {
    it('stores child positions relative to the group and puts the group before its children', async () => {
      const board = await store.createBoard('Test', 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'Z', x: 900, y: 900 }, 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'A', x: 0, y: 0 }, 'user');
      const b = await store.createNode(board.id, { type: 'rectangle', label: 'B', x: 200, y: 200 }, 'user');
      const ids = b.nodes.slice(1).map(n => n.id);
      const updated = await store.createGroup(board.id, 'G', ids, 'user');
      const groupIdx = updated.nodes.findIndex(n => n.type === 'group');
      const group = updated.nodes[groupIdx];
      expect([group.x, group.y]).toEqual([-40, -40]);
      const a = updated.nodes.find(n => n.label === 'A')!;
      const bb = updated.nodes.find(n => n.label === 'B')!;
      expect([a.x, a.y]).toEqual([40, 40]);
      expect([bb.x, bb.y]).toEqual([240, 240]);
      const children = updated.nodes.filter(n => n.parentId === group.id);
      expect(children).toHaveLength(2);
      for (const child of children) {
        expect(groupIdx).toBeLessThan(updated.nodes.indexOf(child));
      }
    });

    it('ignores nodes that already belong to a group', async () => {
      const board = await store.createBoard('Test', 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'A', x: 0, y: 0 }, 'user');
      const b = await store.createNode(board.id, { type: 'rectangle', label: 'C', x: 500, y: 0 }, 'user');
      const [aId, cId] = b.nodes.map(n => n.id);
      const g1 = await store.createGroup(board.id, 'G1', [aId], 'user');
      const g1Id = g1.nodes.find(n => n.label === 'G1')!.id;
      const updated = await store.createGroup(board.id, 'G2', [aId, cId], 'user');
      const g2Id = updated.nodes.find(n => n.label === 'G2')!.id;
      expect(updated.nodes.find(n => n.id === aId)!.parentId).toBe(g1Id);
      expect(updated.nodes.find(n => n.id === cId)!.parentId).toBe(g2Id);
    });
  });

  describe('deleteNode on a group', () => {
    it('ungroups children and restores absolute positions', async () => {
      const board = await store.createBoard('Test', 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'A', x: 0, y: 0 }, 'user');
      const b = await store.createNode(board.id, { type: 'rectangle', label: 'B', x: 200, y: 200 }, 'user');
      const grouped = await store.createGroup(board.id, 'G', b.nodes.map(n => n.id), 'user');
      const groupId = grouped.nodes.find(n => n.type === 'group')!.id;
      const updated = await store.deleteNode(board.id, groupId, 'user');
      expect(updated.nodes).toHaveLength(2);
      const a = updated.nodes.find(n => n.label === 'A')!;
      const bb = updated.nodes.find(n => n.label === 'B')!;
      expect(a.parentId).toBeUndefined();
      expect(bb.parentId).toBeUndefined();
      expect([a.x, a.y]).toEqual([0, 0]);
      expect([bb.x, bb.y]).toEqual([200, 200]);
    });

    it('re-parents children of a nested group to the outer group', async () => {
      const board = await store.createBoard('Test', 'user');
      const b = await store.createNode(board.id, { type: 'rectangle', label: 'A', x: 100, y: 100 }, 'user');
      const aId = b.nodes[0].id;
      const inner = await store.createGroup(board.id, 'Inner', [aId], 'user');
      const innerId = inner.nodes.find(n => n.label === 'Inner')!.id;
      const outer = await store.createGroup(board.id, 'Outer', [innerId], 'user');
      const outerId = outer.nodes.find(n => n.label === 'Outer')!.id;
      const updated = await store.deleteNode(board.id, innerId, 'user');
      const a = updated.nodes.find(n => n.id === aId)!;
      expect(a.parentId).toBe(outerId);
      // Inner sat at (60,60) absolute, Outer at (20,20): A is (80,80) relative to Outer.
      expect([a.x, a.y]).toEqual([80, 80]);
    });
  });

  describe('temp files', () => {
    it('two stores writing the same board do not collide', async () => {
      const other = new BoardStore(tmpDir);
      const board = await store.createBoard('Test', 'user');
      // Squat the old fixed temp names: unique temp paths must not care.
      mkdirSync(join(tmpDir, 'boards', `${board.id}.json.tmp`));
      mkdirSync(join(tmpDir, 'index.json.tmp'));
      await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      await other.createNode(board.id, { type: 'rectangle', label: 'B' }, 'claude');
      const final = await store.readBoard(board.id);
      expect(final.nodes.map(n => n.label)).toEqual(['A', 'B']);
    });
  });

  describe('index recovery', () => {
    it('listBoards re-adds boards missing from index.json', async () => {
      const board = await store.createBoard('Lost', 'user');
      const indexPath = join(tmpDir, 'index.json');
      writeFileSync(indexPath, '[]');
      const boards = await store.listBoards();
      expect(boards).toEqual([{ id: board.id, name: 'Lost', updatedAt: board.updatedAt }]);
      expect(JSON.parse(readFileSync(indexPath, 'utf-8'))).toEqual(boards);
    });

    it('listBoards skips unreadable board files', async () => {
      writeFileSync(join(tmpDir, 'boards', '00000000-0000-4000-8000-000000000000.json'), '{oops');
      expect(await store.listBoards()).toEqual([]);
    });

    it('board mutations re-add a missing index entry', async () => {
      const board = await store.createBoard('Lost', 'user');
      const indexPath = join(tmpDir, 'index.json');
      writeFileSync(indexPath, '[]');
      await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
      expect(index.map((e: { id: string }) => e.id)).toEqual([board.id]);
    });
  });

  describe('bulkUpdateNodes', () => {
    it('updates several nodes and rejects unknown ids', async () => {
      const board = await store.createBoard('Test', 'user');
      await store.createNode(board.id, { type: 'rectangle', label: 'A' }, 'user');
      const b = await store.createNode(board.id, { type: 'rectangle', label: 'B' }, 'user');
      const [aId, bId] = b.nodes.map(n => n.id);
      const updated = await store.bulkUpdateNodes(board.id, [
        { nodeId: aId, x: 10 }, { nodeId: bId, y: 20, label: 'B2' },
      ], 'user');
      expect(updated.nodes[0].x).toBe(10);
      expect(updated.nodes[1].y).toBe(20);
      expect(updated.nodes[1].label).toBe('B2');
      await expect(store.bulkUpdateNodes(board.id, [{ nodeId: 'nope', x: 1 }], 'user'))
        .rejects.toThrow('Node not found: nope');
    });
  });
});
