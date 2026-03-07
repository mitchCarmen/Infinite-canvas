import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { getContrastColor } from '../../utils/color';

export default function StickyNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 200;
  const height = (data.height as number) ?? 200;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? '#fff9c4';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#e6db00';
  const explicitColor = (data.style as Record<string, string>)?.color;
  const color = explicitColor ?? getContrastColor(fill);
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '14px';
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

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
        {!isEditing && (
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
              {label}
            </div>
          </foreignObject>
        )}
      </svg>
      {isEditing && (
        <div className="node-edit-overlay" style={{ padding: 8 }}>
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
