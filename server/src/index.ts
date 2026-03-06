import { createApp } from './api/routes.js';
import path from 'path';
import express from 'express';

const boardsDir = process.env.BOARDS_DIR || path.join(process.cwd(), 'boards');
const port = parseInt(process.env.PORT || '3011', 10);

const app = createApp(boardsDir);

// In production, serve frontend static files
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

app.listen(port, () => {
  console.log(`InfiniteCanvas server running on http://localhost:${port}`);
});
