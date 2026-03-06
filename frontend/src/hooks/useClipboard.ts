import { useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { api } from '../api';

interface ClipboardData {
  nodes: Node[];
  edges: Edge[];
}

// Module-level clipboard for cross-board paste
let clipboard: ClipboardData | null = null;

export function useClipboard(boardId: string, refetch: () => Promise<void>) {
  const pasteCountRef = useRef(0);

  const copy = useCallback((selectedNodes: Node[], allEdges: Edge[]) => {
    if (selectedNodes.length === 0) return;

    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const internalEdges = allEdges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
    );

    clipboard = {
      nodes: structuredClone(selectedNodes),
      edges: structuredClone(internalEdges),
    };
    pasteCountRef.current = 0;
  }, []);

  const paste = useCallback(async () => {
    if (!clipboard || clipboard.nodes.length === 0) return;

    pasteCountRef.current += 1;
    const offset = pasteCountRef.current * 20;
    const idMap = new Map<string, string>();

    // Create nodes with offset positions and collect new IDs
    for (const node of clipboard.nodes) {
      const newNode = await api.createNode(boardId, {
        type: node.type ?? 'rectangle',
        label: (node.data?.label as string) ?? node.type ?? 'Node',
        x: node.position.x + offset,
        y: node.position.y + offset,
        width: node.data?.width as number | undefined,
        height: node.data?.height as number | undefined,
        style: node.data?.style as Record<string, string> | undefined,
        data: node.data,
      });
      idMap.set(node.id, newNode.id);
    }

    // Re-create internal edges with mapped IDs
    for (const edge of clipboard.edges) {
      const newSource = idMap.get(edge.source);
      const newTarget = idMap.get(edge.target);
      if (newSource && newTarget) {
        await api.createEdge(boardId, newSource, newTarget, edge.label as string | undefined);
      }
    }

    await refetch();
  }, [boardId, refetch]);

  const hasClipboard = useCallback(() => {
    return clipboard !== null && clipboard.nodes.length > 0;
  }, []);

  return { copy, paste, hasClipboard };
}
