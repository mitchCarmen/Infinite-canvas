import express from 'express';
import cors from 'cors';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { BoardStore } from '../data/boards.js';
import { parseMermaid } from '../parsers/mermaid.js';
import * as schemas from './schemas.js';
import { validate } from './schemas.js';

export function createApp(boardsDir: string) {
  const app = express();
  const store = new BoardStore(boardsDir);

  // Global, not per-route: a route-level parser cannot run after this one. Base64 images need the headroom.
  app.use(express.json({ limit: '25mb' }));
  // Dev: the Vite frontend runs on another localhost port. Production serves the frontend from this same origin.
  app.use(cors({ origin: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ }));

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
      const { name, description } = validate(schemas.createBoard)(req.body);
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
      const { newName } = validate(schemas.duplicateBoard)(req.body);
      const board = await store.duplicateBoard(req.params.id, 'user', newName);
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/boards/:id', async (req, res, next) => {
    try {
      const board = await store.updateBoardMetadata(req.params.id, validate(schemas.boardMetadata)(req.body), 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Node operations ---

  app.post('/api/boards/:id/nodes', async (req, res, next) => {
    try {
      const board = await store.createNode(req.params.id, validate(schemas.createNode)(req.body), 'user');
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/boards/:id/nodes/:nodeId', async (req, res, next) => {
    try {
      const updates = validate(schemas.updateNode)(req.body);
      const board = await store.updateNode(req.params.id, req.params.nodeId, updates, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/boards/:id/nodes', async (req, res, next) => {
    try {
      const { updates } = validate(schemas.bulkUpdateNodes)(req.body);
      // Map from API format { id, ... } to store format { nodeId, ... }
      const mapped = updates.map(u => ({ nodeId: u.id, ...u }));
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
      const { action } = validate(schemas.reorderNode)(req.body);
      const board = await store.reorderNode(req.params.id, req.params.nodeId, action, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Edge operations ---

  app.post('/api/boards/:id/edges', async (req, res, next) => {
    try {
      const { source, target, label, style, sourceHandle, targetHandle } = validate(schemas.createEdge)(req.body);
      const board = await store.createEdge(req.params.id, source, target, 'user', label, style, sourceHandle, targetHandle);
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/boards/:id/edges/:edgeId', async (req, res, next) => {
    try {
      const board = await store.updateEdge(req.params.id, req.params.edgeId, validate(schemas.updateEdge)(req.body), 'user');
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
      const { label, nodeIds } = validate(schemas.createGroup)(req.body);
      const board = await store.createGroup(req.params.id, label, nodeIds, 'user');
      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Graph replace (undo/redo restore) ---

  app.put('/api/boards/:id/graph', async (req, res, next) => {
    try {
      const { nodes, edges } = validate(schemas.replaceGraph)(req.body);
      const board = await store.replaceGraph(req.params.id, nodes, edges, 'user');
      res.json(board);
    } catch (err) {
      next(err);
    }
  });

  // --- Import Mermaid ---

  app.post('/api/boards/:id/import-mermaid', async (req, res, next) => {
    try {
      const { mermaidSyntax } = validate(schemas.importMermaid)(req.body);

      const parsed = parseMermaid(mermaidSyntax);
      const { board, warnings } = await store.importGraph(req.params.id, parsed, 'user');
      res.json({ ...board, warnings: [...parsed.warnings, ...warnings] });
    } catch (err) {
      next(err);
    }
  });

  // --- Auto-layout ---

  app.post('/api/boards/:id/auto-layout', async (req, res, next) => {
    try {
      const { direction = 'TB' } = validate(schemas.autoLayout)(req.body);
      const board = await store.autoLayoutBoard(req.params.id, direction, 'user');
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
  const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

  app.post('/api/boards/:id/upload-image', async (req, res, next) => {
    try {
      const { imageData, filename } = validate(schemas.uploadImage)(req.body);
      const ext = /\.(png|jpe?g|gif|webp|svg)$/i.exec(filename)?.[1].toLowerCase();
      if (!ext) {
        res.status(400).json({ error: 'filename must end in .png, .jpg, .jpeg, .gif, .webp or .svg' });
        return;
      }

      // Validate board exists
      await store.readBoard(req.params.id);

      if (!existsSync(assetsDir)) {
        mkdirSync(assetsDir, { recursive: true });
      }

      const buffer = Buffer.from(imageData, 'base64');
      // Unreachable while the JSON limit is 25mb (base64 is 4/3 the decoded size); guards the write if that limit grows.
      if (buffer.length > MAX_IMAGE_BYTES) {
        res.status(400).json({ error: 'Image exceeds 20 MB' });
        return;
      }
      const assetFilename = `${uuid()}.${ext}`;
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
      message.startsWith('Invalid') ||
      message.includes('Self-loop') ||
      message.includes('Duplicate') ||
      message.includes('No valid nodes') ||
      message.includes('Cannot target a group') ||
      message.includes('is required')
    ) {
      res.status(400).json({ error: message });
      return;
    }

    // body-parser errors (oversized or malformed JSON) carry their own 4xx status.
    const status = (err as { status?: number }).status;
    if (status && status >= 400 && status < 500) {
      res.status(status).json({ error: message });
      return;
    }

    console.error('Unhandled error:', err);
    res.status(500).json({ error: message });
  });

  return app;
}
