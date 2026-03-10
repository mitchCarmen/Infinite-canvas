import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { useNodeStyle } from '../../hooks/useNodeStyle';
import NodeBadges from './NodeBadges';

export default function CircleNode({ data, selected }: NodeProps) {
  const w = (data.width as number) ?? 100;
  const h = (data.height as number) ?? 100;
  const diameter = Math.min(w, h);
  const r = diameter / 2 - 1;
  const {
    fill, borderColor, color, fontSize, fontFamily, fontWeight,
    textAlign, verticalAlign, locked, link, emoji,
  } = useNodeStyle(data);
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  const alignItems = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
  const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';

  return (
    <div style={{ width: diameter, height: diameter, position: 'relative' }}>
      <NodeResizer isVisible={!!selected && !locked} minWidth={40} minHeight={40} />
      <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`}>
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={r}
          fill={fill}
          stroke={borderColor}
          strokeWidth={2}
        />
        {!isEditing && (
          <foreignObject x={4} y={4} width={diameter - 8} height={diameter - 8}>
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems, justifyContent,
              color, fontSize, fontFamily, fontWeight,
              textAlign, overflow: 'hidden', wordBreak: 'break-word',
            }}>
              {label}
            </div>
          </foreignObject>
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
            style={{ fontSize, fontFamily }}
          />
        </div>
      )}
      <NodeBadges link={link} emoji={emoji} locked={locked} />
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
