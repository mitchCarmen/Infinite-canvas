import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';

export default function CylinderNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 100;
  const height = (data.height as number) ?? 120;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? '#ffffff';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#333333';
  const color = (data.style as Record<string, string>)?.color ?? '#000000';
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '14px';

  const ry = height * 0.1;
  const bodyTop = ry;
  const bodyBottom = height - ry;
  const rx = width / 2 - 1;

  const d = [
    // Top ellipse
    `M 1,${bodyTop}`,
    `A ${rx},${ry} 0 0,1 ${width - 1},${bodyTop}`,
    // Right side
    `L ${width - 1},${bodyBottom}`,
    // Bottom ellipse
    `A ${rx},${ry} 0 0,1 1,${bodyBottom}`,
    // Left side
    `Z`,
    // Top ellipse visible arc (front)
    `M 1,${bodyTop}`,
    `A ${rx},${ry} 0 0,0 ${width - 1},${bodyTop}`,
  ].join(' ');

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected} minWidth={50} minHeight={60} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={d} fill={fill} stroke={borderColor} strokeWidth={2} />
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={fontSize}
        >
          {data.label as string}
        </text>
      </svg>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
}
