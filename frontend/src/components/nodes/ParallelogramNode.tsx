import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';

export default function ParallelogramNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 150;
  const height = (data.height as number) ?? 80;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? '#ffffff';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#333333';
  const color = (data.style as Record<string, string>)?.color ?? '#000000';
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '14px';
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  const skew = width * 0.2;
  const points = `${skew},1 ${width - 1},1 ${width - skew},${height - 1} 1,${height - 1}`;

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected} minWidth={80} minHeight={40} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polygon points={points} fill={fill} stroke={borderColor} strokeWidth={2} />
        {!isEditing && (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={color}
            fontSize={fontSize}
          >
            {label}
          </text>
        )}
      </svg>
      {isEditing && (
        <div className="node-edit-overlay">
          <input
            ref={inputRef}
            className="node-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{ fontSize }}
          />
        </div>
      )}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
}
