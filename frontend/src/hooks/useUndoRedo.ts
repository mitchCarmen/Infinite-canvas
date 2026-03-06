import { useState, useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
  description: string;
}

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const isProgrammaticRef = useRef(false);

  const takeSnapshot = useCallback(
    (nodes: Node[], edges: Edge[], description: string) => {
      const snapshot: Snapshot = {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
        description,
      };
      setUndoStack((prev) => {
        const next = [...prev, snapshot];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
      setRedoStack([]);
    },
    [],
  );

  const undo = useCallback(
    (
      currentNodes: Node[],
      currentEdges: Edge[],
      restore: (nodes: Node[], edges: Edge[]) => void,
    ) => {
      setUndoStack((prev) => {
        if (prev.length === 0) return prev;
        const snapshot = prev[prev.length - 1];
        const currentSnapshot: Snapshot = {
          nodes: structuredClone(currentNodes),
          edges: structuredClone(currentEdges),
          description: snapshot.description,
        };
        setRedoStack((r) => [...r, currentSnapshot]);
        isProgrammaticRef.current = true;
        restore(snapshot.nodes, snapshot.edges);
        return prev.slice(0, -1);
      });
    },
    [],
  );

  const redo = useCallback(
    (restore: (nodes: Node[], edges: Edge[]) => void) => {
      setRedoStack((prev) => {
        if (prev.length === 0) return prev;
        const snapshot = prev[prev.length - 1];
        setUndoStack((u) => {
          // Save current state before redo - we read from the snapshot being restored
          return [...u, { ...snapshot, description: snapshot.description }];
        });
        isProgrammaticRef.current = true;
        restore(snapshot.nodes, snapshot.edges);
        return prev.slice(0, -1);
      });
    },
    [],
  );

  return {
    takeSnapshot,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    isProgrammaticRef,
  };
}
