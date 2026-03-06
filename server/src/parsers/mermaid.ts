import { v4 as uuid } from 'uuid';
import type { CanvasNode, CanvasEdge, NodeType } from '../../../shared/types.js';
import { DEFAULT_NODE_DIMENSIONS } from '../../../shared/types.js';
import { autoLayout } from '../data/layout.js';

export interface ParseResult {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  warnings: string[];
}

// Shape bracket patterns -> NodeType
const SHAPE_MAP: Array<{ pattern: RegExp; type: NodeType }> = [
  { pattern: /^\(\((.+)\)\)$/, type: 'circle' },
  { pattern: /^\{\{(.+)\}\}$/, type: 'hexagon' },
  { pattern: /^\[\((.+)\)\]$/, type: 'cylinder' },
  { pattern: /^\{(.+)\}$/, type: 'diamond' },
  { pattern: /^\[(.+)\]$/, type: 'rectangle' },
  { pattern: /^\((.+)\)$/, type: 'rectangle' },
];

function makeNode(id: string, type: NodeType, label: string): CanvasNode {
  const dims = DEFAULT_NODE_DIMENSIONS[type];
  return {
    id,
    type,
    label,
    x: 0,
    y: 0,
    width: dims.width,
    height: dims.height,
    zIndex: 0,
  };
}

function makeEdge(source: string, target: string, label?: string): CanvasEdge {
  return {
    id: uuid(),
    source,
    target,
    ...(label ? { label } : {}),
  };
}

function parseNodeDefinition(text: string): { id: string; type: NodeType; label: string } | null {
  // Match: ID followed by shape brackets
  const match = text.match(/^(\w+)([\[\(\{].+[\]\)\}])$/);
  if (!match) return null;

  const id = match[1];
  const shapeText = match[2];

  for (const { pattern, type } of SHAPE_MAP) {
    const m = shapeText.match(pattern);
    if (m) {
      return { id, type, label: m[1] };
    }
  }

  return null;
}

// Flowchart edge pattern: source (optional shape) --> |label| target (optional shape)
const EDGE_REGEX = /^(\w+)(\([^)]*\)|\[[^\]]*\]|\{[^}]*\}|\(\([^)]*\)\)|\{\{[^}]*\}\}|\[\([^)]*\)\])?\s*(-->|---|-\.->|==>)\s*(\|([^|]*)\|)?\s*(\w+)(\([^)]*\)|\[[^\]]*\]|\{[^}]*\}|\(\([^)]*\)\)|\{\{[^}]*\}\}|\[\([^)]*\)\])?$/;

function parseFlowchart(lines: string[], direction: string): ParseResult {
  const nodeMap = new Map<string, CanvasNode>();
  const edges: CanvasEdge[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try edge parse first
    const edgeMatch = trimmed.match(EDGE_REGEX);
    if (edgeMatch) {
      const sourceId = edgeMatch[1];
      const sourceShape = edgeMatch[2] || null;
      const label = edgeMatch[5] || undefined;
      const targetId = edgeMatch[6];
      const targetShape = edgeMatch[7] || null;

      // Register source node if not seen
      if (!nodeMap.has(sourceId)) {
        if (sourceShape) {
          const parsed = parseNodeDefinition(sourceId + sourceShape);
          if (parsed) {
            nodeMap.set(sourceId, makeNode(parsed.id, parsed.type, parsed.label));
          } else {
            nodeMap.set(sourceId, makeNode(sourceId, 'rectangle', sourceId));
          }
        } else {
          nodeMap.set(sourceId, makeNode(sourceId, 'rectangle', sourceId));
        }
      }

      // Register target node if not seen
      if (!nodeMap.has(targetId)) {
        if (targetShape) {
          const parsed = parseNodeDefinition(targetId + targetShape);
          if (parsed) {
            nodeMap.set(targetId, makeNode(parsed.id, parsed.type, parsed.label));
          } else {
            nodeMap.set(targetId, makeNode(targetId, 'rectangle', targetId));
          }
        } else {
          nodeMap.set(targetId, makeNode(targetId, 'rectangle', targetId));
        }
      }

      edges.push(makeEdge(sourceId, targetId, label));
      continue;
    }

    // Try standalone node definition
    const nodeDef = parseNodeDefinition(trimmed);
    if (nodeDef) {
      if (!nodeMap.has(nodeDef.id)) {
        nodeMap.set(nodeDef.id, makeNode(nodeDef.id, nodeDef.type, nodeDef.label));
      }
      continue;
    }

    // Unparseable
    warnings.push(`Could not parse line: ${trimmed}`);
  }

  const nodes = Array.from(nodeMap.values());
  const dir = direction === 'LR' || direction === 'RL' ? direction : direction === 'BT' ? 'BT' : 'TB';
  const layoutNodes = autoLayout(nodes, edges, dir as 'TB' | 'LR' | 'BT' | 'RL');

  return { nodes: layoutNodes, edges, warnings };
}

function parseSequenceDiagram(lines: string[]): ParseResult {
  const nodeMap = new Map<string, CanvasNode>();
  const edges: CanvasEdge[] = [];
  const warnings: string[] = [];

  const participantRegex = /^participant\s+(\w+)(?:\s+as\s+(.+))?$/;
  const messageRegex = /^(\w+)\s*(->>|-->>|->|-->)\s*(\w+)\s*:\s*(.+)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const pMatch = trimmed.match(participantRegex);
    if (pMatch) {
      const id = pMatch[1];
      const label = pMatch[2] || id;
      if (!nodeMap.has(id)) {
        nodeMap.set(id, makeNode(id, 'rectangle', label));
      }
      continue;
    }

    const mMatch = trimmed.match(messageRegex);
    if (mMatch) {
      const sourceId = mMatch[1];
      const targetId = mMatch[3];
      const label = mMatch[4].trim();

      // Auto-create participants if not declared
      if (!nodeMap.has(sourceId)) {
        nodeMap.set(sourceId, makeNode(sourceId, 'rectangle', sourceId));
      }
      if (!nodeMap.has(targetId)) {
        nodeMap.set(targetId, makeNode(targetId, 'rectangle', targetId));
      }

      edges.push(makeEdge(sourceId, targetId, label));
      continue;
    }

    warnings.push(`Could not parse line: ${trimmed}`);
  }

  // Arrange participants left-to-right
  const nodes = Array.from(nodeMap.values());
  let xOffset = 0;
  for (const node of nodes) {
    node.x = xOffset;
    node.y = 0;
    xOffset += node.width + 60;
  }

  return { nodes, edges, warnings };
}

function parseErDiagram(lines: string[]): ParseResult {
  const nodeMap = new Map<string, CanvasNode>();
  const edges: CanvasEdge[] = [];
  const warnings: string[] = [];

  // ERD relationship: ENTITY1 ||--o{ ENTITY2 : label
  const relRegex = /^(\S+)\s+(\|[\|o]--|\}[\|o]--|\|[\|o]\.\.|\}[\|o]\.\.)([o\|{][\|{]|[o\|{][\|{])\s+(\S+)\s*:\s*(.+)$/;
  // Simpler fallback: ENTITY1 <anything with |, o, {, }, -, .> ENTITY2 : label
  const relRegexSimple = /^(\S+)\s+\S*[\|o\{\}][-\.]+[o\|\{\}]\S*\s+(\S+)\s*:\s*(.+)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(relRegex) || trimmed.match(relRegexSimple);
    if (match) {
      let entity1: string, entity2: string, label: string;

      if (match.length === 6) {
        // Full regex
        entity1 = match[1];
        entity2 = match[4];
        label = match[5].trim();
      } else {
        // Simple regex
        entity1 = match[1];
        entity2 = match[2];
        label = match[3].trim();
      }

      if (!nodeMap.has(entity1)) {
        nodeMap.set(entity1, makeNode(entity1, 'rectangle', entity1));
      }
      if (!nodeMap.has(entity2)) {
        nodeMap.set(entity2, makeNode(entity2, 'rectangle', entity2));
      }

      edges.push(makeEdge(entity1, entity2, label));
      continue;
    }

    warnings.push(`Could not parse line: ${trimmed}`);
  }

  const nodes = Array.from(nodeMap.values());
  const layoutNodes = autoLayout(nodes, edges);

  return { nodes: layoutNodes, edges, warnings };
}

export function parseMermaid(
  syntax: string,
  offsetX: number = 0,
  offsetY: number = 0,
): ParseResult {
  const lines = syntax.split('\n');
  const firstLine = lines[0].trim().toLowerCase();
  const contentLines = lines.slice(1);

  let result: ParseResult;

  if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
    // Extract direction: graph TD, graph LR, etc.
    const dirMatch = firstLine.match(/(?:graph|flowchart)\s+(td|tb|lr|rl|bt)/i);
    const direction = dirMatch ? dirMatch[1].toUpperCase() : 'TB';
    result = parseFlowchart(contentLines, direction);
  } else if (firstLine.startsWith('sequencediagram')) {
    result = parseSequenceDiagram(contentLines);
  } else if (firstLine.startsWith('erdiagram')) {
    result = parseErDiagram(contentLines);
  } else {
    result = { nodes: [], edges: [], warnings: [`Unknown diagram type: ${firstLine}`] };
  }

  // Apply offset
  if (offsetX !== 0 || offsetY !== 0) {
    for (const node of result.nodes) {
      node.x += offsetX;
      node.y += offsetY;
    }
  }

  return result;
}
