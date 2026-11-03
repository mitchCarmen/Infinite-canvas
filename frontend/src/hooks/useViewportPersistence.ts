import { useEffect, useRef, useCallback } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';

const DEBOUNCE_MS = 500;

function storageKey(boardId: string): string {
  return `viewport-${boardId}`;
}

/**
 * Persists and restores the viewport (pan + zoom) for a given board
 * using localStorage. Debounces saves to avoid excessive writes.
 */
export function useViewportPersistence(
  boardId: string,
  reactFlowInstance: ReactFlowInstance | null,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  // Restore viewport on mount (once instance is available)
  useEffect(() => {
    if (!reactFlowInstance || restoredRef.current) return;
    restoredRef.current = true;

    const raw = localStorage.getItem(storageKey(boardId));
    if (raw) {
      try {
        const saved = JSON.parse(raw) as { x: number; y: number; zoom: number };
        reactFlowInstance.setViewport(saved);
      } catch {
        // Corrupt data, ignore
      }
    }
  }, [boardId, reactFlowInstance]);

  // Save viewport on move end (debounced); CanvasView wires this to onMoveEnd
  const saveViewport = useCallback(() => {
    if (!reactFlowInstance) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const viewport = reactFlowInstance.getViewport();
      localStorage.setItem(storageKey(boardId), JSON.stringify(viewport));
    }, DEBOUNCE_MS);
  }, [boardId, reactFlowInstance]);

  // Unmount save covers in-app navigation; beforeunload covers refresh/close,
  // where React never unmounts and a pending debounced save would be lost.
  useEffect(() => {
    if (!reactFlowInstance) return;

    const save = () => {
      const viewport = reactFlowInstance.getViewport();
      localStorage.setItem(storageKey(boardId), JSON.stringify(viewport));
    };
    window.addEventListener('beforeunload', save);

    return () => {
      window.removeEventListener('beforeunload', save);
      if (timerRef.current) clearTimeout(timerRef.current);
      save();
    };
  }, [boardId, reactFlowInstance]);

  return { saveViewport };
}
