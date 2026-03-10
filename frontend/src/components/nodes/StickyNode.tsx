import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { useNodeStyle } from '../../hooks/useNodeStyle';
import NodeBadges from './NodeBadges';

export default function StickyNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 200;
  const height = (data.height as number) ?? 200;
  const {
    fill: rawFill, borderColor: rawBorderColor, color, fontSize, fontFamily, fontWeight,
    textAlign, verticalAlign, locked, link, emoji,
  } = useNodeStyle(data);
  // Sticky notes use yellow defaults instead of white
  const style = (data.style as Record<string, string>) ?? {};
  const fill = style.backgroundColor ?? '#fff9c4';
  const borderColor = style.borderColor ?? '#e6db00';
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  const alignItems = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
  const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected && !locked} minWidth={80} minHeight={80} />
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
                fontFamily,
                fontWeight,
                textAlign,
                display: 'flex',
                alignItems,
                justifyContent,
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
