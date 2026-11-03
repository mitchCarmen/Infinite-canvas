import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, renameSync, readdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import type {
  Board,
  BoardIndex,
  CanvasNode,
  CanvasEdge,
  NodeType,
  ReorderAction,
} from '../../../shared/types.js';
import { DEFAULT_NODE_DIMENSIONS } from '../../../shared/types.js';
import { createActivity } from './activity.js';
import { autoLayout } from './layout.js';

const BOARD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CreateNodeOpts {
  type: NodeType;
  label: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: Record<string, string>;
  data?: Record<string, unknown>;
}

interface UpdateNodeOpts {
  type?: NodeType;
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: Record<string, string>;
  data?: Record<string, unknown>;
}

export class BoardStore {
  private readonly boardsDir: string;
  private readonly indexPath: string;

  constructor(baseDir: string) {
    this.boardsDir = join(baseDir, 'boards');
    this.indexPath = join(baseDir, 'index.json');
    if (!existsSync(this.boardsDir)) {
      mkdirSync(this.boardsDir, { recursive: true });
    }
  }

  // --- Index management ---

  private _readIndex(): BoardIndex[] {
    if (!existsSync(this.indexPath)) return [];
    const raw = readFileSync(this.indexPath, 'utf-8');
    return JSON.parse(raw) as BoardIndex[];
  }

  private _writeIndex(entries: BoardIndex[]): void {
    const tmp = `${this.indexPath}.${process.pid}.${uuid()}.tmp`;
    writeFileSync(tmp, JSON.stringify(entries, null, 2), 'utf-8');
    renameSync(tmp, this.indexPath);
  }

  // --- Board file I/O ---

  private _boardPath(id: string): string {
    // Ids reach here from REST params and MCP args; anything but a UUID could escape boardsDir.
    if (!BOARD_ID_RE.test(id)) throw new Error('Board not found');
    return join(this.boardsDir, `${id}.json`);
  }

  private _readBoardFile(id: string): Board {
    const p = this._boardPath(id);
    if (!existsSync(p)) throw new Error('Board not found');
    const raw = readFileSync(p, 'utf-8');
    return JSON.parse(raw) as Board;
  }

  // ponytail: no cross-process lock; REST and MCP are separate processes, per-board lock if concurrent edits ever matter
  private _writeBoardFile(board: Board): void {
    const p = this._boardPath(board.id);
    const tmp = `${p}.${process.pid}.${uuid()}.tmp`;
    writeFileSync(tmp, JSON.stringify(board, null, 2), 'utf-8');
    renameSync(tmp, p);
  }

  // --- Board CRUD ---

  async createBoard(name: string, actor: 'user' | 'claude', description?: string): Promise<Board> {
    const now = new Date().toISOString();
    const board: Board = {
      id: uuid(),
      name,
      description,
      nodes: [],
      edges: [],
      activityLog: [createActivity(actor, 'created_board', `Created board "${name}"`)],
      createdAt: now,
      updatedAt: now,
    };
    this._writeBoardFile(board);

    const index = this._readIndex();
    index.push({ id: board.id, name: board.name, updatedAt: board.updatedAt });
    this._writeIndex(index);

    return board;
  }

  async listBoards(): Promise<BoardIndex[]> {
    const index = this._readIndex();
    const known = new Set(index.map(e => e.id));
    let added = false;
    // Recover boards whose index entry was lost (e.g. a write from the other process won the race).
    for (const file of readdirSync(this.boardsDir)) {
      const id = file.slice(0, -'.json'.length);
      if (!file.endsWith('.json') || !BOARD_ID_RE.test(id) || known.has(id)) continue;
      try {
        const board = this._readBoardFile(id);
        index.push({ id, name: board.name, updatedAt: board.updatedAt });
        added = true;
      } catch {
        // Unreadable board file: leave it out of the listing rather than failing the whole list.
      }
    }
    if (added) this._writeIndex(index);
    return index;
  }

  async readBoard(boardId: string): Promise<Board> {
    return this._readBoardFile(boardId);
  }

  async updateBoardMetadata(boardId: string, updates: { name?: string; description?: string; thumbnail?: string }, actor: 'user' | 'claude'): Promise<Board> {
    const board = this._readBoardFile(boardId);
    if (updates.name !== undefined) board.name = updates.name;
    if (updates.description !== undefined) board.description = updates.description;
    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'updated_board', `Updated board metadata`));
    this._writeBoardFile(board);

    const index = this._readIndex();
    const entry = index.find(e => e.id === boardId);
    if (entry) {
      if (updates.name !== undefined) entry.name = updates.name;
      if (updates.thumbnail !== undefined) entry.thumbnail = updates.thumbnail;
      entry.updatedAt = board.updatedAt;
      this._writeIndex(index);
    }

    return board;
  }

  async deleteBoard(boardId: string): Promise<void> {
    const p = this._boardPath(boardId);
    if (!existsSync(p)) throw new Error('Board not found');
    unlinkSync(p);

    const index = this._readIndex().filter(e => e.id !== boardId);
    this._writeIndex(index);
  }

  async duplicateBoard(boardId: string, actor: 'user' | 'claude', newName?: string): Promise<Board> {
    const original = this._readBoardFile(boardId);
    const now = new Date().toISOString();
    const newId = uuid();

    // Build a map from old node IDs to new node IDs
    const nodeIdMap = new Map<string, string>();
    for (const node of original.nodes) {
      nodeIdMap.set(node.id, uuid());
    }

    const newNodes: CanvasNode[] = original.nodes.map(n => ({
      ...n,
      id: nodeIdMap.get(n.id)!,
      parentId: n.parentId ? nodeIdMap.get(n.parentId) : undefined,
    }));

    const newEdges: CanvasEdge[] = original.edges.map(e => ({
      ...e,
      id: uuid(),
      source: nodeIdMap.get(e.source)!,
      target: nodeIdMap.get(e.target)!,
    }));

    const dupName = newName ?? `${original.name} (copy)`;
    const board: Board = {
      id: newId,
      name: dupName,
      description: original.description,
      nodes: newNodes,
      edges: newEdges,
      activityLog: [createActivity(actor, 'duplicated_board', `Duplicated board from "${original.name}"`)],
      createdAt: now,
      updatedAt: now,
    };

    this._writeBoardFile(board);
    const index = this._readIndex();
    index.push({ id: board.id, name: board.name, updatedAt: board.updatedAt });
    this._writeIndex(index);

    return board;
  }

  // --- Node operations ---

  async createNode(boardId: string, opts: CreateNodeOpts, actor: 'user' | 'claude'): Promise<Board> {
    const board = this._readBoardFile(boardId);
    const dims = DEFAULT_NODE_DIMENSIONS[opts.type];
    const maxZ = board.nodes.length > 0 ? Math.max(...board.nodes.map(n => n.zIndex)) : 0;

    const node: CanvasNode = {
      id: uuid(),
      type: opts.type,
      label: opts.label,
      x: opts.x ?? 0,
      y: opts.y ?? 0,
      width: opts.width ?? dims.width,
      height: opts.height ?? dims.height,
      zIndex: maxZ + 1,
      style: opts.style,
      data: opts.data,
    };

    board.nodes.push(node);
    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'created_node', `Created node "${opts.label}"`));
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  async updateNode(boardId: string, nodeId: string, updates: UpdateNodeOpts, actor: 'user' | 'claude'): Promise<Board> {
    const board = this._readBoardFile(boardId);
    const idx = board.nodes.findIndex(n => n.id === nodeId);
    if (idx === -1) throw new Error('Node not found');

    const node = board.nodes[idx];
    if (updates.type !== undefined && updates.type !== node.type) {
      node.type = updates.type;
      if (updates.width === undefined) node.width = DEFAULT_NODE_DIMENSIONS[updates.type].width;
      if (updates.height === undefined) node.height = DEFAULT_NODE_DIMENSIONS[updates.type].height;
    }
    if (updates.label !== undefined) node.label = updates.label;
    if (updates.x !== undefined) node.x = updates.x;
    if (updates.y !== undefined) node.y = updates.y;
    if (updates.width !== undefined) node.width = updates.width;
    if (updates.height !== undefined) node.height = updates.height;
    if (updates.style !== undefined) node.style = updates.style;
    if (updates.data !== undefined) node.data = updates.data;

    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'updated_node', `Updated node "${node.label}"`));
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  async bulkUpdateNodes(
    boardId: string,
    updates: Array<{ nodeId: string } & UpdateNodeOpts>,
    actor: 'user' | 'claude',
  ): Promise<Board> {
    const board = this._readBoardFile(boardId);

    for (const update of updates) {
      const idx = board.nodes.findIndex(n => n.id === update.nodeId);
      if (idx === -1) throw new Error(`Node not found: ${update.nodeId}`);

      const node = board.nodes[idx];
      if (update.type !== undefined && update.type !== node.type) {
        node.type = update.type;
        if (update.width === undefined) node.width = DEFAULT_NODE_DIMENSIONS[update.type].width;
        if (update.height === undefined) node.height = DEFAULT_NODE_DIMENSIONS[update.type].height;
      }
      if (update.label !== undefined) node.label = update.label;
      if (update.x !== undefined) node.x = update.x;
      if (update.y !== undefined) node.y = update.y;
      if (update.width !== undefined) node.width = update.width;
      if (update.height !== undefined) node.height = update.height;
      if (update.style !== undefined) node.style = update.style;
      if (update.data !== undefined) node.data = update.data;
    }

    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'bulk_updated_nodes', `Bulk updated ${updates.length} nodes`));
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  async deleteNode(boardId: string, nodeId: string, actor: 'user' | 'claude'): Promise<Board> {
    const board = this._readBoardFile(boardId);
    const idx = board.nodes.findIndex(n => n.id === nodeId);
    if (idx === -1) throw new Error('Node not found');

    const [removed] = board.nodes.splice(idx, 1);
    const label = removed.label;

    // Ungroup: children move up to the removed node's parent (or the canvas), keeping their on-screen position.
    for (const child of board.nodes) {
      if (child.parentId !== nodeId) continue;
      child.x += removed.x;
      child.y += removed.y;
      if (removed.parentId) child.parentId = removed.parentId;
      else delete child.parentId;
    }

    // Cascade: remove all edges connected to this node
    board.edges = board.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'deleted_node', `Deleted node "${label}"`));
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  // --- Edge operations ---

  async createEdge(
    boardId: string,
    source: string,
    target: string,
    actor: 'user' | 'claude',
    label?: string,
    style?: Record<string, string>,
    sourceHandle?: string,
    targetHandle?: string,
  ): Promise<Board> {
    const board = this._readBoardFile(boardId);

    // Validate
    if (source === target) throw new Error('Self-loops not allowed');

    const sourceNode = board.nodes.find(n => n.id === source);
    const targetNode = board.nodes.find(n => n.id === target);
    if (!sourceNode) throw new Error('Source node not found');
    if (!targetNode) throw new Error('Target node not found');
    if (targetNode.type === 'group') throw new Error('Cannot target a group node');

    const duplicate = board.edges.find(e => e.source === source && e.target === target);
    if (duplicate) throw new Error('Duplicate edge');

    const edge: CanvasEdge = {
      id: uuid(),
      source,
      target,
      ...(sourceHandle ? { sourceHandle } : {}),
      ...(targetHandle ? { targetHandle } : {}),
      label,
      style,
    };

    board.edges.push(edge);
    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'created_edge', `Connected "${sourceNode.label}" to "${targetNode.label}"`));
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  async updateEdge(
    boardId: string,
    edgeId: string,
    updates: { label?: string; style?: Record<string, string> },
    actor: 'user' | 'claude',
  ): Promise<Board> {
    const board = this._readBoardFile(boardId);
    const idx = board.edges.findIndex(e => e.id === edgeId);
    if (idx === -1) throw new Error('Edge not found');

    const edge = board.edges[idx];
    if (updates.label !== undefined) edge.label = updates.label;
    if (updates.style !== undefined) edge.style = { ...(edge.style ?? {}), ...updates.style };

    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'updated_edge', `Updated edge`));
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  async deleteEdge(boardId: string, edgeId: string, actor: 'user' | 'claude'): Promise<Board> {
    const board = this._readBoardFile(boardId);
    const idx = board.edges.findIndex(e => e.id === edgeId);
    if (idx === -1) throw new Error('Edge not found');

    board.edges.splice(idx, 1);
    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'deleted_edge', `Deleted edge`));
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  // --- Reorder ---

  async reorderNode(boardId: string, nodeId: string, action: ReorderAction, actor: 'user' | 'claude'): Promise<Board> {
    const board = this._readBoardFile(boardId);
    const node = board.nodes.find(n => n.id === nodeId);
    if (!node) throw new Error('Node not found');

    const zValues = board.nodes.map(n => n.zIndex);
    const maxZ = Math.max(...zValues);
    const minZ = Math.min(...zValues);

    switch (action) {
      case 'bring_to_front':
        node.zIndex = maxZ + 1;
        break;
      case 'send_to_back':
        node.zIndex = minZ - 1;
        break;
      case 'bring_forward': {
        // Find next higher zIndex
        const higher = zValues.filter(z => z > node.zIndex).sort((a, b) => a - b);
        if (higher.length > 0) {
          const swapTarget = board.nodes.find(n => n.zIndex === higher[0] && n.id !== nodeId);
          if (swapTarget) {
            const tmp = node.zIndex;
            node.zIndex = swapTarget.zIndex;
            swapTarget.zIndex = tmp;
          }
        }
        break;
      }
      case 'send_backward': {
        // Find next lower zIndex
        const lower = zValues.filter(z => z < node.zIndex).sort((a, b) => b - a);
        if (lower.length > 0) {
          const swapTarget = board.nodes.find(n => n.zIndex === lower[0] && n.id !== nodeId);
          if (swapTarget) {
            const tmp = node.zIndex;
            node.zIndex = swapTarget.zIndex;
            swapTarget.zIndex = tmp;
          }
        }
        break;
      }
    }

    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'reordered_node', `Reordered node "${node.label}" (${action})`));
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  // --- Groups ---

  async createGroup(
    boardId: string,
    label: string,
    nodeIds: string[],
    actor: 'user' | 'claude',
  ): Promise<Board> {
    const board = this._readBoardFile(boardId);

    // Nodes already in a group keep their parent; their positions are relative to it.
    const children = board.nodes.filter(n => nodeIds.includes(n.id) && !n.parentId);
    if (children.length === 0) throw new Error('No valid nodes for group');

    // Compute bounding box with padding
    const padding = 40;
    const minX = Math.min(...children.map(n => n.x)) - padding;
    const minY = Math.min(...children.map(n => n.y)) - padding;
    const maxX = Math.max(...children.map(n => n.x + n.width)) + padding;
    const maxY = Math.max(...children.map(n => n.y + n.height)) + padding;

    const minZ = Math.min(...board.nodes.map(n => n.zIndex));

    const groupNode: CanvasNode = {
      id: uuid(),
      type: 'group',
      label,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      zIndex: minZ - 1, // Group goes behind children
    };

    // React Flow needs parents before children and child positions relative to the parent.
    board.nodes.splice(board.nodes.indexOf(children[0]), 0, groupNode);
    for (const child of children) {
      child.parentId = groupNode.id;
      child.x -= groupNode.x;
      child.y -= groupNode.y;
    }

    board.updatedAt = new Date().toISOString();
    board.activityLog.push(createActivity(actor, 'created_group', `Created group "${label}" with ${children.length} nodes`));
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  // --- Auto-layout ---

  async autoLayoutBoard(
    boardId: string,
    direction: 'TB' | 'LR' | 'BT' | 'RL',
    actor: 'user' | 'claude',
  ): Promise<Board> {
    const board = this._readBoardFile(boardId);
    board.nodes = autoLayout(board.nodes, board.edges, direction);
    board.updatedAt = new Date().toISOString();
    board.activityLog.push(
      createActivity(actor, 'auto_layout', `Applied auto-layout (${direction})`),
    );
    this._writeBoardFile(board);
    this._updateIndex(board);
    return board;
  }

  // --- Helpers ---

  private _updateIndex(board: Board): void {
    const index = this._readIndex();
    const entry = index.find(e => e.id === board.id);
    if (entry) {
      entry.name = board.name;
      entry.updatedAt = board.updatedAt;
    } else {
      index.push({ id: board.id, name: board.name, updatedAt: board.updatedAt });
    }
    this._writeIndex(index);
  }
}
