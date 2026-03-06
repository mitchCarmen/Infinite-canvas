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
import { api } from '../api';
import type { Board, CanvasNode, CanvasEdge } from '@shared/types';

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

function toFlowEdges(canvasEdges: CanvasEdge[]): Edge[] {
  return canvasEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    style: e.style as Record<string, string> | undefined,
  }));
}

export function useBoard(boardId: string) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const data: Board = await api.readBoard(boardId);
      setBoard(data);
      setNodes(toFlowNodes(data.nodes));
      setEdges(toFlowEdges(data.edges));
    } finally {
      setLoading(false);
    }
  }, [boardId, setNodes, setEdges]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

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
      }
    },
    [onNodesChangeBase, boardId, setNodes],
  );

  const onEdgesChange: OnEdgesChange = onEdgesChangeBase;

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (connection.source && connection.target) {
        api
          .createEdge(boardId, connection.source, connection.target)
          .then((newEdge: CanvasEdge) => {
            setEdges((eds) => [
              ...eds,
              {
                id: newEdge.id,
                source: newEdge.source,
                target: newEdge.target,
                label: newEdge.label,
              },
            ]);
          })
          .catch(console.error);
      }
    },
    [boardId, setEdges],
  );

  return {
    nodes,
    edges,
    board,
    onNodesChange,
    onEdgesChange,
    onConnect,
    loading,
    refetch: fetchBoard,
  };
}
