import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';

export default function StickyNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 200;
  const height = (data.height as number) ?? 200;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? '#fff9c4';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#e6db00';
  const color = (data.style as Record<string, string>)?.color ?? '#000000';
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '14px';

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected} minWidth={80} minHeight={80} />
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.2))' }}
      >
        <rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          fill={fill}
          stroke={borderColor}
          strokeWidth={1}
        />
        <foreignObject x={8} y={8} width={width - 16} height={height - 16}>
          <div
            style={{
              color,
              fontSize,
              wordWrap: 'break-word',
              overflow: 'hidden',
              width: '100%',
              height: '100%',
            }}
          >
            {data.label as string}
          </div>
        </foreignObject>
      </svg>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
}
