import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';

export default function GroupNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 400;
  const height = (data.height as number) ?? 300;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? 'rgba(200, 200, 200, 0.1)';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#888888';
  const color = (data.style as Record<string, string>)?.color ?? '#555555';
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '13px';

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected} minWidth={100} minHeight={80} />
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
          strokeDasharray="8 4"
        />
        <text
          x={10}
          y={18}
          fill={color}
          fontSize={fontSize}
          fontWeight="600"
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
