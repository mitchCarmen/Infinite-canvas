import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as schemas from '../api/schemas.js';
import { createMcpToolHandler } from './tools.js';

export function createMcpServer(boardsDir: string): { start: () => Promise<void> } {
  const mcpServer = new McpServer(
    { name: 'infinite-canvas', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  const handler = createMcpToolHandler(boardsDir);

  function wrapHandler(toolName: string) {
    return async (args: Record<string, any>) => {
      try {
        const result = await handler(toolName, args);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    };
  }

  // 1. create_board
  mcpServer.tool(
    'create_board',
    'Create a new canvas board',
    schemas.createBoard.shape,
    (args) => wrapHandler('create_board')(args),
  );

  // 2. list_boards
  mcpServer.tool(
    'list_boards',
    'List all boards',
    (extra) => wrapHandler('list_boards')({}),
  );

  // 3. read_board
  mcpServer.tool(
    'read_board',
    'Read a board by ID',
    { boardId: z.string() },
    (args) => wrapHandler('read_board')(args),
  );

  // 4. delete_board
  mcpServer.tool(
    'delete_board',
    'Delete a board by ID',
    { boardId: z.string() },
    (args) => wrapHandler('delete_board')(args),
  );

  // 5. duplicate_board
  mcpServer.tool(
    'duplicate_board',
    'Duplicate a board',
    { boardId: z.string(), ...schemas.duplicateBoard.shape },
    (args) => wrapHandler('duplicate_board')(args),
  );

  // 6. create_node
  mcpServer.tool(
    'create_node',
    'Create a node on a board',
    {
      boardId: z.string(),
      ...schemas.createNode.pick({ type: true, label: true, x: true, y: true, style: true }).shape,
    },
    (args) => wrapHandler('create_node')(args),
  );

  // 7. update_node
  mcpServer.tool(
    'update_node',
    'Update a node on a board',
    { boardId: z.string(), nodeId: z.string(), ...schemas.updateNode.shape },
    (args) => wrapHandler('update_node')(args),
  );

  // 8. delete_node
  mcpServer.tool(
    'delete_node',
    'Delete a node from a board',
    { boardId: z.string(), nodeId: z.string() },
    (args) => wrapHandler('delete_node')(args),
  );

  // 9. create_edge
  mcpServer.tool(
    'create_edge',
    'Create an edge between two nodes. For sequential flows, use step routing with directional handles.',
    { boardId: z.string(), ...schemas.createEdge.shape },
    (args) => wrapHandler('create_edge')(args),
  );

  // 10. delete_edge
  mcpServer.tool(
    'delete_edge',
    'Delete an edge from a board',
    { boardId: z.string(), edgeId: z.string() },
    (args) => wrapHandler('delete_edge')(args),
  );

  // 11. create_group
  mcpServer.tool(
    'create_group',
    'Create a group containing specified nodes',
    { boardId: z.string(), ...schemas.createGroup.shape },
    (args) => wrapHandler('create_group')(args),
  );

  // 12. import_mermaid
  mcpServer.tool(
    'import_mermaid',
    'Import a Mermaid diagram into a board',
    { boardId: z.string(), ...schemas.importMermaid.shape },
    (args) => wrapHandler('import_mermaid')(args),
  );

  // 13. auto_layout
  mcpServer.tool(
    'auto_layout',
    'Auto-layout nodes on a board using dagre',
    { boardId: z.string(), ...schemas.autoLayout.shape },
    (args) => wrapHandler('auto_layout')(args),
  );

  // 14. export_board
  mcpServer.tool(
    'export_board',
    'Export a board as JSON',
    {
      boardId: z.string(),
      format: z.string().optional(),
    },
    (args) => wrapHandler('export_board')(args),
  );

  return {
    async start() {
      const transport = new StdioServerTransport();
      await mcpServer.connect(transport);
    },
  };
}
