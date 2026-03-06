import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';

export default function HexagonNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 130;
  const height = (data.height as number) ?? 100;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? '#ffffff';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#333333';
  const color = (data.style as Record<string, string>)?.color ?? '#000000';
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '14px';
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  const inset = width * 0.25;
  const points = [
    `${inset},1`,
    `${width - inset},1`,
    `${width - 1},${height / 2}`,
    `${width - inset},${height - 1}`,
    `${inset},${height - 1}`,
    `1,${height / 2}`,
  ].join(' ');

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected} minWidth={60} minHeight={50} />
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
            style={{ fontSize, color }}
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
