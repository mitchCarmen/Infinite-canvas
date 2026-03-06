import { describe, it, expect } from 'vitest';
import { autoLayout } from '../layout.js';
import type { CanvasNode, CanvasEdge } from '../../../../shared/types.js';

describe('autoLayout', () => {
  it('assigns positions to nodes in a simple chain', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'rectangle', label: 'A', x: 0, y: 0, width: 150, height: 80, zIndex: 1 },
      { id: 'b', type: 'rectangle', label: 'B', x: 0, y: 0, width: 150, height: 80, zIndex: 2 },
    ];
    const edges: CanvasEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const result = autoLayout(nodes, edges, 'TB');
    // Nodes should not overlap — at least one coordinate must differ
    expect(result[0].x !== result[1].x || result[0].y !== result[1].y).toBe(true);
    // In TB layout, A should be above B
    expect(result.find(n => n.id === 'a')!.y).toBeLessThan(result.find(n => n.id === 'b')!.y);
  });

  it('preserves zIndex values', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'rectangle', label: 'A', x: 0, y: 0, width: 150, height: 80, zIndex: 5 },
      { id: 'b', type: 'rectangle', label: 'B', x: 0, y: 0, width: 150, height: 80, zIndex: 10 },
    ];
    const edges: CanvasEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const result = autoLayout(nodes, edges, 'TB');
    expect(result.find(n => n.id === 'a')!.zIndex).toBe(5);
    expect(result.find(n => n.id === 'b')!.zIndex).toBe(10);
  });

  it('handles LR direction', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'rectangle', label: 'A', x: 0, y: 0, width: 150, height: 80, zIndex: 1 },
      { id: 'b', type: 'rectangle', label: 'B', x: 0, y: 0, width: 150, height: 80, zIndex: 2 },
    ];
    const edges: CanvasEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const result = autoLayout(nodes, edges, 'LR');
    expect(result.find(n => n.id === 'a')!.x).toBeLessThan(result.find(n => n.id === 'b')!.x);
  });

  it('positions disconnected nodes in a row', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'rectangle', label: 'A', x: 0, y: 0, width: 150, height: 80, zIndex: 1 },
      { id: 'b', type: 'rectangle', label: 'B', x: 0, y: 0, width: 150, height: 80, zIndex: 2 },
      { id: 'orphan', type: 'circle', label: 'O', x: 0, y: 0, width: 100, height: 100, zIndex: 3 },
    ];
    const edges: CanvasEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const result = autoLayout(nodes, edges, 'TB');
    const orphan = result.find(n => n.id === 'orphan')!;
    const maxY = Math.max(...result.filter(n => n.id !== 'orphan').map(n => n.y));
    // Orphan should be placed below the graph
    expect(orphan.y).toBeGreaterThanOrEqual(maxY);
  });
});
