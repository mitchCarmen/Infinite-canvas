import { createMcpServer } from '../src/mcp/server.js';
import path from 'path';

const boardsDir = process.env.BOARDS_DIR || path.join(process.cwd(), 'boards');
const server = createMcpServer(boardsDir);

server.start().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
