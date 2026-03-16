import { useMemo, useState, useCallback } from 'react';
import type { Edge } from '@xyflow/react';

interface AdjacencyEntry {
  incoming: Edge[];  // edges where this node is the target
  outgoing: Edge[];  // edges where this node is the source
}

type AdjacencyMap = Map<string, AdjacencyEntry>;

function buildAdjacencyMap(edges: Edge[]): AdjacencyMap {
  const map: AdjacencyMap = new Map();

  const getEntry = (nodeId: string): AdjacencyEntry => {
    let entry = map.get(nodeId);
    if (!entry) {
      entry = { incoming: [], outgoing: [] };
      map.set(nodeId, entry);
    }
    return entry;
  };

  for (const edge of edges) {
    getEntry(edge.source).outgoing.push(edge);
    getEntry(edge.target).incoming.push(edge);
  }

  return map;
}

function traceLineage(
  clickedEdge: Edge,
  adjacencyMap: AdjacencyMap,
): { edgeIds: Set<string>; nodeIds: Set<string> } {
  const edgeIds = new Set<string>([clickedEdge.id]);
  const nodeIds = new Set<string>();
  const visitedNodes = new Set<string>();

  // BFS upstream from the clicked edge's source
  const upstreamQueue = [clickedEdge.source];
  while (upstreamQueue.length > 0) {
    const nodeId = upstreamQueue.shift()!;
    if (visitedNodes.has(nodeId)) continue;
    visitedNodes.add(nodeId);
    nodeIds.add(nodeId);

    const entry = adjacencyMap.get(nodeId);
    if (!entry) continue;
    for (const edge of entry.incoming) {
      edgeIds.add(edge.id);
      upstreamQueue.push(edge.source);
    }
  }

  // BFS downstream from the clicked edge's target
  const downstreamQueue = [clickedEdge.target];
  while (downstreamQueue.length > 0) {
    const nodeId = downstreamQueue.shift()!;
    if (visitedNodes.has(nodeId)) continue;
    visitedNodes.add(nodeId);
    nodeIds.add(nodeId);

    const entry = adjacencyMap.get(nodeId);
    if (!entry) continue;
    for (const edge of entry.outgoing) {
      edgeIds.add(edge.id);
      downstreamQueue.push(edge.target);
    }
  }

  return { edgeIds, nodeIds };
}

export function useLineageHighlight(edges: Edge[]) {
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  const adjacencyMap = useMemo(() => buildAdjacencyMap(edges), [edges]);

  const lineageActive = highlightedEdgeIds.size > 0;

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const { edgeIds, nodeIds } = traceLineage(edge, adjacencyMap);
      setHighlightedEdgeIds(edgeIds);
      setHighlightedNodeIds(nodeIds);
    },
    [adjacencyMap],
  );

  // Stable empty set to avoid unnecessary memo recalculations
  const EMPTY = useMemo(() => new Set<string>(), []);

  const clearHighlight = useCallback(() => {
    setHighlightedEdgeIds(EMPTY);
    setHighlightedNodeIds(EMPTY);
  }, [EMPTY]);

  return { highlightedEdgeIds, highlightedNodeIds, lineageActive, onEdgeClick, clearHighlight };
}
