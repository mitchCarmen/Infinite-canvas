import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';

export default function DiamondNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 120;
  const height = (data.height as number) ?? 120;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? '#ffffff';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#333333';
  const color = (data.style as Record<string, string>)?.color ?? '#000000';
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '14px';
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  const cx = width / 2;
  const cy = height / 2;
  const points = `${cx},1 ${width - 1},${cy} ${cx},${height - 1} 1,${cy}`;

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected} minWidth={60} minHeight={60} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polygon points={points} fill={fill} stroke={borderColor} strokeWidth={2} />
        {!isEditing && (
          <text
            x={cx}
            y={cy}
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
