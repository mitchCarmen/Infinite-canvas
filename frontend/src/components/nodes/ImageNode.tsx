import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';

export default function ImageNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 200;
  const height = (data.height as number) ?? 200;
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#cccccc';
  const imageUrl = data.imageUrl as string | undefined;
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected} minWidth={50} minHeight={50} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          fill="#f5f5f5"
          stroke={borderColor}
          strokeWidth={1}
        />
        {imageUrl ? (
          <image
            href={imageUrl}
            x={1}
            y={1}
            width={width - 2}
            height={height - 2}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : !isEditing ? (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#999"
            fontSize="14px"
          >
            {label || 'No image'}
          </text>
        ) : null}
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
          />
        </div>
      )}
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
    </div>
  );
}
