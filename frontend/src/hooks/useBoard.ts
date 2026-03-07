import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeChange,
} from '@xyflow/react';
import { toPng } from 'html-to-image';
import { api } from '../api';
import type { Board, CanvasNode, CanvasEdge } from '@shared/types';
import { useUndoRedo } from './useUndoRedo';

function toFlowNodes(canvasNodes: CanvasNode[]): Node[] {
  return canvasNodes.map((n) => {
    const node: Node = {
      id: n.id,
      type: n.type,
      position: { x: n.x, y: n.y },
      data: {
        label: n.label,
        style: n.style ?? {},
        width: n.width,
        height: n.height,
        nodeType: n.type,
        ...(n.data ?? {}),
      },
      zIndex: n.zIndex,
      style: { width: n.width, height: n.height },
    };
    if (n.parentId) {
      node.parentId = n.parentId;
      node.extent = 'parent';
    }
    return node;
  });
}

function mapEdgeRouting(routing?: string): string | undefined {
  switch (routing) {
    case 'straight':
      return 'straight';
    case 'step':
      return 'smoothstep';
    case 'bezier':
      return 'default';
    default:
      return undefined;
  }
}

function toFlowEdges(canvasEdges: CanvasEdge[]): Edge[] {
  return canvasEdges.map((e) => {
    const edgeStyle = e.style as Record<string, string> | undefined;
    const routing = edgeStyle?.routing;
    const type = mapEdgeRouting(routing);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
      ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
      label: e.label,
      ...(type ? { type } : {}),
      style: edgeStyle,
    };
  });
}

export function useBoard(boardId: string) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { takeSnapshot, undo: undoAction, redo: redoAction, canUndo, canRedo } = useUndoRedo();
  const initialLoadDone = useRef(false);

  const fetchBoard = useCallback(async () => {
    if (!initialLoadDone.current) {
      setLoading(true);
    }
    try {
      const data: Board = await api.readBoard(boardId);
      setBoard(data);
      setNodes(toFlowNodes(data.nodes));
      setEdges(toFlowEdges(data.edges));
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [boardId, setNodes, setEdges]);

  useEffect(() => {
    initialLoadDone.current = false;
    fetchBoard();
  }, [fetchBoard]);

  // Generate board thumbnail debounced after node changes
  const captureThumbnail = useCallback(() => {
    if (thumbnailDebounceRef.current) clearTimeout(thumbnailDebounceRef.current);
    thumbnailDebounceRef.current = setTimeout(() => {
      const el = document.querySelector('.react-flow') as HTMLElement | null;
      if (!el) return;
      toPng(el, { width: 200, height: 150, canvasWidth: 200, canvasHeight: 150, cacheBust: true })
        .then((dataUri) => {
          api.updateBoardMetadata(boardId, { thumbnail: dataUri }).catch(console.error);
        })
        .catch(console.error);
    }, 2000);
  }, [boardId]);

  // Trigger thumbnail after board loads with nodes
  useEffect(() => {
    if (!loading && nodes.length > 0) {
      captureThumbnail();
    }
  }, [loading, nodes.length, captureThumbnail]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);

      const positionDone = changes.some(
        (c) => c.type === 'position' && 'dragging' in c && c.dragging === false,
      );

      if (positionDone) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          setNodes((currentNodes) => {
            const updates = currentNodes.map((n) => ({
              id: n.id,
              x: n.position.x,
              y: n.position.y,
            }));
            api.bulkUpdateNodes(boardId, updates).catch(console.error);
            return currentNodes;
          });
        }, 300);
        captureThumbnail();
      }
    },
    [onNodesChangeBase, boardId, setNodes],
  );

  const onEdgesChange: OnEdgesChange = onEdgesChangeBase;

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (connection.source && connection.target) {
        const srcHandle = connection.sourceHandle ?? undefined;
        const tgtHandle = connection.targetHandle ?? undefined;

        // Optimistically add edge so it appears immediately
        const tempId = `temp-${Date.now()}`;
        const tempEdge: Edge = {
          id: tempId,
          source: connection.source,
          target: connection.target,
          ...(srcHandle ? { sourceHandle: srcHandle } : {}),
          ...(tgtHandle ? { targetHandle: tgtHandle } : {}),
        };
        setEdges((eds) => [...eds, tempEdge]);

        // Persist to server, then replace temp edge with server version
        api
          .createEdge(boardId, connection.source, connection.target, undefined, srcHandle, tgtHandle)
          .then((board: Board) => {
            setEdges(toFlowEdges(board.edges));
          })
          .catch(console.error);
      }
    },
    [boardId, setEdges],
  );

  const snapshot = useCallback(
    (description: string) => {
      takeSnapshot(nodes, edges, description);
    },
    [nodes, edges, takeSnapshot],
  );

  const restore = useCallback(
    (restoredNodes: Node[], restoredEdges: Edge[]) => {
      setNodes(restoredNodes);
      setEdges(restoredEdges);
      // Sync restored state to backend
      const nodeUpdates = restoredNodes.map((n) => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
      }));
      api.bulkUpdateNodes(boardId, nodeUpdates).catch(console.error);
    },
    [boardId, setNodes, setEdges],
  );

  const undo = useCallback(() => {
    undoAction(nodes, edges, restore);
  }, [undoAction, nodes, edges, restore]);

  const redo = useCallback(() => {
    redoAction(restore);
  }, [redoAction, restore]);

  return {
    nodes,
    edges,
    board,
    onNodesChange,
    onEdgesChange,
    onConnect,
    loading,
    refetch: fetchBoard,
    setNodes,
    setEdges,
    snapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
