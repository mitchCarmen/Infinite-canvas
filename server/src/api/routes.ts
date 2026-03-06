import express from 'express';
import cors from 'cors';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { BoardStore } from '../data/boards.js';
import { parseMermaid } from '../parsers/mermaid.js';

export function createApp(boardsDir: string) {
  const app = express();
  const store = new BoardStore(boardsDir);

  app.use(express.json());
  app.use(cors());

  // --- Board CRUD ---

  app.get('/api/boards', async (_req, res, next) => {
    try {
      const boards = await store.listBoards();
      res.json(boards);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/boards', async (req, res, next) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      const board = await store.createBoard(name, 'user', description);
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/boards/:id', async (req, res, next) => {
    try {
      const board = await store.readBoard(req.params.id);
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/boards/:id', async (req, res, next) => {
    try {
      await store.deleteBoard(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/boards/:id/duplicate', async (req, res, next) => {
    try {
      const { newName } = req.body ?? {};
      const board = await store.duplicateBoard(req.params.id, 'user', newName);
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/boards/:id', async (req, res, next) => {
    try {
      const { name, description, thumbnail } = req.body;
      const board = await store.updateBoardMetadata(req.params.id, { name, description, thumbnail }, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Node operations ---

  app.post('/api/boards/:id/nodes', async (req, res, next) => {
    try {
      const { type, label, x, y, width, height, style, data } = req.body;
      if (!type || !label) {
        res.status(400).json({ error: 'type and label are required' });
        return;
      }
      const board = await store.createNode(req.params.id, { type, label, x, y, width, height, style, data }, 'user');
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/boards/:id/nodes/:nodeId', async (req, res, next) => {
    try {
      const { label, x, y, width, height, style, data } = req.body;
      const board = await store.updateNode(req.params.id, req.params.nodeId, { label, x, y, width, height, style, data }, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/boards/:id/nodes', async (req, res, next) => {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        res.status(400).json({ error: 'updates array is required' });
        return;
      }
      // Map from API format { id, ... } to store format { nodeId, ... }
      const mapped = updates.map((u: any) => ({ nodeId: u.id, ...u }));
      const board = await store.bulkUpdateNodes(req.params.id, mapped, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/boards/:id/nodes/:nodeId', async (req, res, next) => {
    try {
      const board = await store.deleteNode(req.params.id, req.params.nodeId, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/boards/:id/nodes/:nodeId/reorder', async (req, res, next) => {
    try {
      const { action } = req.body;
      if (!action) {
        res.status(400).json({ error: 'action is required' });
        return;
      }
      const board = await store.reorderNode(req.params.id, req.params.nodeId, action, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Edge operations ---

  app.post('/api/boards/:id/edges', async (req, res, next) => {
    try {
      const { source, target, label, style } = req.body;
      if (!source || !target) {
        res.status(400).json({ error: 'source and target are required' });
        return;
      }
      const board = await store.createEdge(req.params.id, source, target, 'user', label, style);
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/boards/:id/edges/:edgeId', async (req, res, next) => {
    try {
      const { label, style } = req.body;
      const board = await store.updateEdge(req.params.id, req.params.edgeId, { label, style }, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/boards/:id/edges/:edgeId', async (req, res, next) => {
    try {
      const board = await store.deleteEdge(req.params.id, req.params.edgeId, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Groups ---

  app.post('/api/boards/:id/groups', async (req, res, next) => {
    try {
      const { label, nodeIds } = req.body;
      if (!label || !Array.isArray(nodeIds)) {
        res.status(400).json({ error: 'label and nodeIds array are required' });
        return;
      }
      const board = await store.createGroup(req.params.id, label, nodeIds, 'user');
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Import Mermaid ---

  app.post('/api/boards/:id/import-mermaid', async (req, res, next) => {
    try {
      const { mermaidSyntax } = req.body;
      if (!mermaidSyntax) {
        res.status(400).json({ error: 'mermaidSyntax is required' });
        return;
      }

      const parsed = parseMermaid(mermaidSyntax);

      // Add each parsed node and edge to the board via the store
      // This ensures activity logging and validation for each element
      let board = await store.readBoard(req.params.id);
      const boardId = req.params.id;

      // Create a mapping from mermaid node IDs to real UUIDs
      const idMap = new Map<string, string>();

      for (const node of parsed.nodes) {
        board = await store.createNode(boardId, {
          type: node.type,
          label: node.label,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        }, 'user');
        // The last added node is at the end of the array
        const createdNode = board.nodes[board.nodes.length - 1];
        idMap.set(node.id, createdNode.id);
      }

      for (const edge of parsed.edges) {
        const source = idMap.get(edge.source);
        const target = idMap.get(edge.target);
        if (source && target) {
          board = await store.createEdge(boardId, source, target, 'user', edge.label);
        }
      }

      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Auto-layout ---

  app.post('/api/boards/:id/auto-layout', async (req, res, next) => {
    try {
      const { direction } = req.body ?? {};
      const dir = direction || 'TB';
      const board = await store.autoLayoutBoard(req.params.id, dir, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Export (placeholder) ---

  app.post('/api/boards/:id/export', async (req, res, next) => {
    try {
      const board = await store.readBoard(req.params.id);
      res.json({ board, format: 'json' });
    } catch (err) {
      next(err);
    }
  });

  // --- Image upload ---

  const assetsDir = join(boardsDir, 'assets');

  app.post('/api/boards/:id/upload-image', async (req, res, next) => {
    try {
      const { imageData, filename } = req.body;
      if (!imageData || !filename) {
        res.status(400).json({ error: 'imageData and filename are required' });
        return;
      }

      // Validate board exists
      await store.readBoard(req.params.id);

      if (!existsSync(assetsDir)) {
        mkdirSync(assetsDir, { recursive: true });
      }

      const ext = filename.split('.').pop() || 'png';
      const assetId = uuid();
      const assetFilename = `${assetId}.${ext}`;
      const buffer = Buffer.from(imageData, 'base64');
      writeFileSync(join(assetsDir, assetFilename), buffer);

      res.json({ url: `/api/assets/${assetFilename}` });
    } catch (err) {
      next(err);
    }
  });

  // --- Static assets ---

  app.use('/api/assets', express.static(assetsDir));

  // --- Error handling middleware ---

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err.message || 'Internal server error';

    if (message.includes('not found') || message.includes('Not found')) {
      res.status(404).json({ error: message });
      return;
    }

    if (
      message.includes('Self-loop') ||
      message.includes('Duplicate') ||
      message.includes('No valid nodes') ||
      message.includes('Cannot target a group') ||
      message.includes('is required')
    ) {
      res.status(400).json({ error: message });
      return;
    }

    console.error('Unhandled error:', err);
    res.status(500).json({ error: message });
  });

  return app;
}
