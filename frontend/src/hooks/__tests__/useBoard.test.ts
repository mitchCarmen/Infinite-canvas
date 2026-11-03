import { describe, it, expect } from 'vitest';
import type { CanvasNode, CanvasEdge } from '@shared/types';
import { toFlowNodes, toFlowEdges, toCanvasNodes, toCanvasEdges } from '../useBoard';

const nodes: CanvasNode[] = [
  {
    id: 'g1', type: 'group', label: 'Group', x: 10, y: 20, width: 400, height: 300, zIndex: 0,
    style: { fill: '#222' },
  },
  {
    id: 'n1', type: 'rectangle', label: 'Child', x: 30, y: 40, width: 150, height: 80, zIndex: 2,
    style: { fill: '#fff', fontSize: '14' }, parentId: 'g1',
    data: { locked: true, link: 'https://example.com', emoji: '🚀' },
  },
  { id: 'n2', type: 'diamond', label: 'Top', x: -5, y: 0, width: 120, height: 120, zIndex: 1, style: {} },
];

const edges: CanvasEdge[] = [
  {
    id: 'e1', source: 'g1', target: 'n2', sourceHandle: 'right-source', targetHandle: 'left-target',
    label: 'next', style: { routing: 'step', arrowMode: 'forward' },
  },
  { id: 'e2', source: 'n2', target: 'n1' },
];

describe('toCanvasNodes / toCanvasEdges', () => {
  it('round-trips nodes through toFlowNodes (parents first, positions untouched)', () => {
    expect(toCanvasNodes(toFlowNodes(nodes))).toEqual([nodes[0], nodes[2], nodes[1]]);
  });

  it('strips UI-only data keys injected by CanvasView', () => {
    const flow = toFlowNodes([nodes[1]]).map((n) => ({
      ...n,
      data: {
        ...n.data, boardId: 'b', nodeId: n.id, canvasLight: true, isEditing: false,
        onStartEdit: () => {}, onFinishEdit: () => {}, onCancelEdit: () => {},
      },
    }));
    expect(toCanvasNodes(flow)).toEqual([nodes[1]]);
  });

  it('prefers React Flow resize dimensions over stale data width/height', () => {
    const [flow] = toFlowNodes([nodes[2]]);
    const [restored] = toCanvasNodes([{ ...flow, width: 300, height: 90 }]);
    expect(restored).toMatchObject({ width: 300, height: 90 });
  });

  it('round-trips edges through toFlowEdges', () => {
    expect(toCanvasEdges(toFlowEdges(edges))).toEqual(edges);
  });
});
