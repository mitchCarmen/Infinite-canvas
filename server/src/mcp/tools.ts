import { BoardStore } from '../data/boards.js';
import { parseMermaid } from '../parsers/mermaid.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler = (toolName: string, args: Record<string, any>) => Promise<any>;

export function createMcpToolHandler(boardsDir: string): ToolHandler {
  const store = new BoardStore(boardsDir);
  const actor = 'claude' as const;

  async function enrichBoardError<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      if (err.message === 'Board not found') {
        const boards = await store.listBoards();
        throw new Error(
          `Board not found in BOARDS_DIR (${boardsDir}). ${boards.length} board(s) available. Verify the MCP server's BOARDS_DIR matches the Express server.`
        );
      }
      throw err;
    }
  }

  return async (toolName: string, args: Record<string, any>): Promise<any> => {
    switch (toolName) {
      case 'create_board':
        return store.createBoard(args.name, actor, args.description);

      case 'list_boards': {
        const boards = await store.listBoards();
        if (boards.length === 0) {
          return {
            boards: [],
            boardsDir,
            hint: 'No boards found. If boards exist in the UI, the MCP BOARDS_DIR may be misconfigured.',
          };
        }
        return boards;
      }

      case 'read_board':
        return enrichBoardError(() => store.readBoard(args.boardId));

      case 'delete_board':
        return enrichBoardError(async () => {
          await store.deleteBoard(args.boardId);
          return { success: true };
        });

      case 'duplicate_board':
        return enrichBoardError(() => store.duplicateBoard(args.boardId, actor, args.newName));

      case 'create_node':
        return enrichBoardError(() => store.createNode(args.boardId, {
          type: args.type,
          label: args.label,
          x: args.x,
          y: args.y,
          style: args.style,
        }, actor));

      case 'update_node':
        return enrichBoardError(() => store.updateNode(args.boardId, args.nodeId, {
          type: args.type,
          label: args.label,
          x: args.x,
          y: args.y,
          width: args.width,
          height: args.height,
          style: args.style,
          data: args.data,
        }, actor));

      case 'delete_node':
        return enrichBoardError(() => store.deleteNode(args.boardId, args.nodeId, actor));

      case 'create_edge':
        return enrichBoardError(() => store.createEdge(
          args.boardId, args.source, args.target, actor,
          args.label, args.style, args.sourceHandle, args.targetHandle,
        ));

      case 'delete_edge':
        return enrichBoardError(() => store.deleteEdge(args.boardId, args.edgeId, actor));

      case 'create_group':
        return enrichBoardError(() => store.createGroup(args.boardId, args.label, args.nodeIds, actor));

      case 'import_mermaid':
        return enrichBoardError(async () => {
          const parsed = parseMermaid(args.mermaidSyntax);
          const { board, warnings } = await store.importGraph(args.boardId, parsed, actor);
          return { ...board, warnings: [...parsed.warnings, ...warnings] };
        });

      case 'auto_layout':
        return enrichBoardError(() => store.autoLayoutBoard(args.boardId, args.direction || 'TB', actor));

      case 'export_board':
        return enrichBoardError(async () => {
          const board = await store.readBoard(args.boardId);
          return { board, format: args.format || 'json' };
        });

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  };
}
