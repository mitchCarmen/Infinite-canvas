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

  // Save viewport on changes (debounced)
  const saveViewport = useCallback(() => {
    if (!reactFlowInstance) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const viewport = reactFlowInstance.getViewport();
      localStorage.setItem(storageKey(boardId), JSON.stringify(viewport));
    }, DEBOUNCE_MS);
  }, [boardId, reactFlowInstance]);

  // Listen to move events via onMoveEnd equivalent — poll on interval is too heavy,
  // so we hook into the ReactFlow instance's viewport getter on a MutationObserver-free approach:
  // We attach a handler via the onMove callback from CanvasView.
  // Instead, let's save on any interaction by using a periodic check.
  // Actually, the simplest approach: save on beforeunload + periodic save.
  useEffect(() => {
    if (!reactFlowInstance) return;

    // Save every 2 seconds if viewport changed
    let lastSaved = '';
    const interval = setInterval(() => {
      const viewport = reactFlowInstance.getViewport();
      const serialized = JSON.stringify(viewport);
      if (serialized !== lastSaved) {
        localStorage.setItem(storageKey(boardId), serialized);
        lastSaved = serialized;
      }
    }, 2000);

    const handleBeforeUnload = () => {
      const viewport = reactFlowInstance.getViewport();
      localStorage.setItem(storageKey(boardId), JSON.stringify(viewport));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save on unmount
      handleBeforeUnload();
    };
  }, [boardId, reactFlowInstance]);

  return { saveViewport };
}
