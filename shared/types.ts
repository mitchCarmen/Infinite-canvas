export type NodeType =
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'diamond'
  | 'hexagon'
  | 'parallelogram'
  | 'cylinder'
  | 'triangle'
  | 'sticky'
  | 'text'
  | 'image'
  | 'group';

export interface CanvasNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  style?: Record<string, string>;
  parentId?: string;
  data?: Record<string, unknown>;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  style?: Record<string, string>;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor: 'user' | 'claude';
  action: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  activityLog: ActivityEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardIndex {
  id: string;
  name: string;
  updatedAt: string;
  thumbnail?: string;
}

export type ReorderAction = 'bring_to_front' | 'send_to_back' | 'bring_forward' | 'send_backward';

export const VALID_SOURCE_HANDLES = [
  'top-source', 'bottom-source', 'left-source', 'right-source',
] as const;

export const VALID_TARGET_HANDLES = [
  'top-target', 'bottom-target', 'left-target', 'right-target',
] as const;

export type SourceHandle = typeof VALID_SOURCE_HANDLES[number];
export type TargetHandle = typeof VALID_TARGET_HANDLES[number];

export const DEFAULT_NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  rectangle: { width: 150, height: 80 },
  circle: { width: 100, height: 100 },
  ellipse: { width: 140, height: 80 },
  diamond: { width: 120, height: 120 },
  hexagon: { width: 130, height: 100 },
  parallelogram: { width: 150, height: 80 },
  cylinder: { width: 100, height: 120 },
  triangle: { width: 120, height: 100 },
  sticky: { width: 200, height: 200 },
  text: { width: 150, height: 40 },
  image: { width: 200, height: 200 },
  group: { width: 400, height: 300 },
};
