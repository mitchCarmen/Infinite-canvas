import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';

export default function RectangleNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 150;
  const height = (data.height as number) ?? 80;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? '#ffffff';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#333333';
  const color = (data.style as Record<string, string>)?.color ?? '#000000';
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '14px';

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected} minWidth={50} minHeight={30} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          rx={4}
          ry={4}
          fill={fill}
          stroke={borderColor}
          strokeWidth={2}
        />
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
