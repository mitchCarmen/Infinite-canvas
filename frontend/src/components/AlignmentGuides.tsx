import React, { useMemo } from 'react';
import { useStore, type ReactFlowState } from '@xyflow/react';

const THRESHOLD = 5;
const GUIDE_COLOR = '#2196F3';
const GUIDE_DASH = '4 2';

interface AlignmentGuidesProps {
  enabled: boolean;
}

/**
 * Renders alignment guide lines when a node being dragged aligns with
 * other nodes' centers or edges (within a pixel threshold).
 * Must be rendered inside a ReactFlow component.
 */
export default function AlignmentGuides({ enabled }: AlignmentGuidesProps) {
  const nodes = useStore((state: ReactFlowState) => state.nodes);
  const transform = useStore((state: ReactFlowState) => state.transform);

  const guides = useMemo(() => {
    if (!enabled) return { horizontal: [] as number[], vertical: [] as number[] };

    const dragging = nodes.filter(
      (n) => n.dragging && n.measured?.width != null && n.measured?.height != null,
    );
    if (dragging.length === 0) return { horizontal: [] as number[], vertical: [] as number[] };

    const stationary = nodes.filter(
      (n) => !n.dragging && n.measured?.width != null && n.measured?.height != null,
    );

    const horizontalGuides: number[] = [];
    const verticalGuides: number[] = [];

    for (const dragNode of dragging) {
      const dw = dragNode.measured!.width!;
      const dh = dragNode.measured!.height!;
      const dCenterX = dragNode.position.x + dw / 2;
      const dCenterY = dragNode.position.y + dh / 2;
      const dLeft = dragNode.position.x;
      const dRight = dragNode.position.x + dw;
      const dTop = dragNode.position.y;
      const dBottom = dragNode.position.y + dh;

      for (const other of stationary) {
        const ow = other.measured!.width!;
        const oh = other.measured!.height!;
        const oCenterX = other.position.x + ow / 2;
        const oCenterY = other.position.y + oh / 2;
        const oLeft = other.position.x;
        const oRight = other.position.x + ow;
        const oTop = other.position.y;
        const oBottom = other.position.y + oh;

        // Vertical guides (x-axis alignment)
        const xChecks = [
          { drag: dCenterX, other: oCenterX },
          { drag: dLeft, other: oLeft },
          { drag: dRight, other: oRight },
          { drag: dLeft, other: oRight },
          { drag: dRight, other: oLeft },
          { drag: dCenterX, other: oLeft },
          { drag: dCenterX, other: oRight },
          { drag: dLeft, other: oCenterX },
          { drag: dRight, other: oCenterX },
        ];
        for (const check of xChecks) {
          if (Math.abs(check.drag - check.other) < THRESHOLD) {
            verticalGuides.push(check.other);
          }
        }

        // Horizontal guides (y-axis alignment)
        const yChecks = [
          { drag: dCenterY, other: oCenterY },
          { drag: dTop, other: oTop },
          { drag: dBottom, other: oBottom },
          { drag: dTop, other: oBottom },
          { drag: dBottom, other: oTop },
          { drag: dCenterY, other: oTop },
          { drag: dCenterY, other: oBottom },
          { drag: dTop, other: oCenterY },
          { drag: dBottom, other: oCenterY },
        ];
        for (const check of yChecks) {
          if (Math.abs(check.drag - check.other) < THRESHOLD) {
            horizontalGuides.push(check.other);
          }
        }
      }
    }

    // Deduplicate
    return {
      horizontal: [...new Set(horizontalGuides)],
      vertical: [...new Set(verticalGuides)],
    };
  }, [enabled, nodes]);

  if (!enabled) return null;
  if (guides.horizontal.length === 0 && guides.vertical.length === 0) return null;

  // Convert flow coordinates to screen coordinates using the transform [zoom, 0, tx, 0, zoom, ty]
  const [tx, ty, zoom] = transform;

  // Use a very large range in flow coordinates
  const EXTENT = 100000;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      <g transform={`translate(${tx}, ${ty}) scale(${zoom})`}>
        {guides.vertical.map((x, i) => (
          <line
            key={`v-${i}`}
            x1={x}
            y1={-EXTENT}
            x2={x}
            y2={EXTENT}
            stroke={GUIDE_COLOR}
            strokeWidth={1 / zoom}
            strokeDasharray={GUIDE_DASH}
          />
        ))}
        {guides.horizontal.map((y, i) => (
          <line
            key={`h-${i}`}
            x1={-EXTENT}
            y1={y}
            x2={EXTENT}
            y2={y}
            stroke={GUIDE_COLOR}
            strokeWidth={1 / zoom}
            strokeDasharray={GUIDE_DASH}
          />
        ))}
      </g>
    </svg>
  );
}
