import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  MarkerType,
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
    const isLocked = n.data?.locked === true;
    const node: Node = {
      id: n.id,
      type: n.type,
      position: { x: n.x, y: n.y },
      data: {
        ...(n.data ?? {}),
        label: n.label,
        style: n.style ?? {},
        width: n.width,
        height: n.height,
        nodeType: n.type,
      },
      zIndex: n.zIndex,
      style: { width: n.width, height: n.height },
      draggable: !isLocked,
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

const ARROW_MARKER = { type: MarkerType.ArrowClosed, width: 20, height: 20 };

function toFlowEdges(canvasEdges: CanvasEdge[]): Edge[] {
  return canvasEdges.map((e) => {
    const edgeStyle = e.style as Record<string, string> | undefined;
    const routing = edgeStyle?.routing;
    const arrowMode = edgeStyle?.arrowMode ?? 'forward';
    const type = mapEdgeRouting(routing);

    const markers: Pick<Edge, 'markerEnd' | 'markerStart'> = {};
    if (arrowMode === 'forward' || arrowMode === 'both') {
      markers.markerEnd = ARROW_MARKER;
    }
    if (arrowMode === 'reverse' || arrowMode === 'both') {
      markers.markerStart = ARROW_MARKER;
    }

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
      ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
      label: e.label,
      ...(type ? { type } : {}),
      ...markers,
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
  const movedIdsRef = useRef<Set<string>>(new Set());
  const thumbnailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (thumbnailDebounceRef.current) clearTimeout(thumbnailDebounceRef.current);
    };
  }, []);

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

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeBase(changes);

      const positionDone = changes.some(
        (c) => c.type === 'position' && 'dragging' in c && c.dragging === false,
      );

      if (positionDone) {
        for (const c of changes) {
          if (c.type === 'position') movedIdsRef.current.add(c.id);
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const movedIds = movedIdsRef.current;
          movedIdsRef.current = new Set();
          setNodes((currentNodes) => {
            const updates = currentNodes
              .filter((n) => movedIds.has(n.id))
              .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
            if (updates.length > 0) {
              api.bulkUpdateNodes(boardId, updates).catch(console.error);
            }
            return currentNodes;
          });
        }, 300);
        captureThumbnail();
      }

      // Persist resize dimensions when resize ends
      const resizeEnd = changes.find(
        (c) => c.type === 'dimensions' && 'resizing' in c && c.resizing === false && c.dimensions,
      );
      if (resizeEnd && resizeEnd.type === 'dimensions' && resizeEnd.dimensions) {
        const { id, dimensions } = resizeEnd;
        setNodes((currentNodes) => {
          const node = currentNodes.find((n) => n.id === id);
          if (node) {
            api.updateNode(boardId, id, {
              width: dimensions.width,
              height: dimensions.height,
              x: node.position.x,
              y: node.position.y,
            }).catch(console.error);
          }
          return currentNodes;
        });
        captureThumbnail();
      }
    },
    [onNodesChangeBase, boardId, setNodes, captureThumbnail],
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
          markerEnd: ARROW_MARKER,
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
