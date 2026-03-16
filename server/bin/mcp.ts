import { createMcpServer } from '../src/mcp/server.js';
import path from 'path';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const boardsDir = process.env.BOARDS_DIR || path.join(process.cwd(), 'boards');

// Startup validation — log to stderr (doesn't interfere with stdio MCP transport)
console.error(`[infinite-canvas] BOARDS_DIR: ${boardsDir}`);

if (!existsSync(boardsDir)) {
  console.error(`[infinite-canvas] WARNING: BOARDS_DIR does not exist, will be created on first write`);
}

if (existsSync(boardsDir)) {
  try {
    const testFile = path.join(boardsDir, '.write-test');
    writeFileSync(testFile, '');
    unlinkSync(testFile);
  } catch {
    console.error(`[infinite-canvas] WARNING: BOARDS_DIR is not writable`);
  }
}

const indexPath = path.join(boardsDir, 'index.json');
if (existsSync(indexPath)) {
  try {
    const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
    console.error(`[infinite-canvas] Found ${index.length} board(s)`);
  } catch {
    console.error(`[infinite-canvas] WARNING: index.json exists but could not be parsed`);
  }
} else {
  console.error(`[infinite-canvas] WARNING: No index.json found at ${indexPath} — is this the right directory?`);
}

const server = createMcpServer(boardsDir);

server.start().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
