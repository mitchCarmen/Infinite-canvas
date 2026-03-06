import { BoardStore } from '../data/boards.js';
import { parseMermaid } from '../parsers/mermaid.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler = (toolName: string, args: Record<string, any>) => Promise<any>;

export function createMcpToolHandler(boardsDir: string): ToolHandler {
  const store = new BoardStore(boardsDir);
  const actor = 'claude' as const;

  return async (toolName: string, args: Record<string, any>): Promise<any> => {
    switch (toolName) {
      case 'create_board':
        return store.createBoard(args.name, actor, args.description);

      case 'list_boards':
        return store.listBoards();

      case 'read_board':
        return store.readBoard(args.boardId);

      case 'delete_board':
        await store.deleteBoard(args.boardId);
        return { success: true };

      case 'duplicate_board':
        return store.duplicateBoard(args.boardId, actor, args.newName);

      case 'create_node':
        return store.createNode(args.boardId, {
          type: args.type,
          label: args.label,
          x: args.x,
          y: args.y,
          style: args.style,
        }, actor);

      case 'update_node':
        return store.updateNode(args.boardId, args.nodeId, {
          label: args.label,
          x: args.x,
          y: args.y,
          width: args.width,
          height: args.height,
          style: args.style,
        }, actor);

      case 'delete_node':
        return store.deleteNode(args.boardId, args.nodeId, actor);

      case 'create_edge':
        return store.createEdge(args.boardId, args.source, args.target, actor, args.label);

      case 'delete_edge':
        return store.deleteEdge(args.boardId, args.edgeId, actor);

      case 'create_group':
        return store.createGroup(args.boardId, args.label, args.nodeIds, actor);

      case 'import_mermaid': {
        const parsed = parseMermaid(args.mermaidSyntax);
        const boardId = args.boardId;

        // Build mapping from mermaid node IDs to real UUIDs
        const idMap = new Map<string, string>();
        let board = await store.readBoard(boardId);

        for (const node of parsed.nodes) {
          board = await store.createNode(boardId, {
            type: node.type,
            label: node.label,
            x: node.x,
            y: node.y,
          }, actor);
          const createdNode = board.nodes[board.nodes.length - 1];
          idMap.set(node.id, createdNode.id);
        }

        for (const edge of parsed.edges) {
          const source = idMap.get(edge.source);
          const target = idMap.get(edge.target);
          if (source && target) {
            board = await store.createEdge(boardId, source, target, actor, edge.label);
          }
        }

        return board;
      }

      case 'auto_layout':
        return store.autoLayoutBoard(args.boardId, args.direction || 'TB', actor);

      case 'export_board': {
        const board = await store.readBoard(args.boardId);
        return { board, format: args.format || 'json' };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  };
}
