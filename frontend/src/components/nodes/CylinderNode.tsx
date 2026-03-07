import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { getContrastColor } from '../../utils/color';

export default function CylinderNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 100;
  const height = (data.height as number) ?? 120;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? '#ffffff';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#333333';
  const explicitColor = (data.style as Record<string, string>)?.color;
  const color = explicitColor ?? getContrastColor(fill);
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '14px';
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  const ry = height * 0.1;
  const bodyTop = ry;
  const bodyBottom = height - ry;
  const rx = width / 2 - 1;

  const d = [
    `M 1,${bodyTop}`,
    `A ${rx},${ry} 0 0,1 ${width - 1},${bodyTop}`,
    `L ${width - 1},${bodyBottom}`,
    `A ${rx},${ry} 0 0,1 1,${bodyBottom}`,
    `Z`,
    `M 1,${bodyTop}`,
    `A ${rx},${ry} 0 0,0 ${width - 1},${bodyTop}`,
  ].join(' ');

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected} minWidth={50} minHeight={60} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={d} fill={fill} stroke={borderColor} strokeWidth={2} />
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
