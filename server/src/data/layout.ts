import dagre from 'dagre';
import type { CanvasNode, CanvasEdge } from '../../../shared/types.js';

type Direction = 'TB' | 'LR' | 'BT' | 'RL';

export function autoLayout(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  direction: Direction = 'TB',
): CanvasNode[] {
  // Separate connected vs disconnected nodes
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const connectedNodes = nodes.filter(n => connectedIds.has(n.id));
  const disconnectedNodes = nodes.filter(n => !connectedIds.has(n.id));

  // Build dagre graph for connected nodes
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of connectedNodes) {
    g.setNode(node.id, { width: node.width, height: node.height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Build result map
  const result = new Map<string, CanvasNode>();
  for (const node of connectedNodes) {
    const pos = g.node(node.id);
    result.set(node.id, {
      ...node,
      x: pos.x - node.width / 2,
      y: pos.y - node.height / 2,
    });
  }

  // Place disconnected nodes in a row below
  let maxY = 0;
  for (const n of result.values()) {
    maxY = Math.max(maxY, n.y + n.height);
  }

  let offsetX = 0;
  const orphanY = connectedNodes.length > 0 ? maxY + 80 : 0;
  for (const node of disconnectedNodes) {
    result.set(node.id, { ...node, x: offsetX, y: orphanY });
    offsetX += node.width + 40;
  }

  return nodes.map(n => result.get(n.id)!);
}
