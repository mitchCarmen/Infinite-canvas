import { useState, useCallback } from 'react';

interface UseSnapToGridReturn {
  snapToGrid: boolean;
  snapGrid: [number, number];
  toggleSnap: () => void;
  setSnapToGrid: (enabled: boolean) => void;
}

export function useSnapToGrid(gridSize: number = 20): UseSnapToGridReturn {
  const [snapToGrid, setSnapToGrid] = useState(false);
  const snapGrid: [number, number] = [gridSize, gridSize];

  const toggleSnap = useCallback(() => {
    setSnapToGrid((prev) => !prev);
  }, []);

  return { snapToGrid, snapGrid, toggleSnap, setSnapToGrid };
}
