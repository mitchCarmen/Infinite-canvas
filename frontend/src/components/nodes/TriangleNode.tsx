import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { useNodeStyle } from '../../hooks/useNodeStyle';
import NodeBadges from './NodeBadges';
import { areNodePropsEqual } from './areNodePropsEqual';

const TriangleNode = React.memo(function TriangleNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 120;
  const height = (data.height as number) ?? 100;
  const {
    fill, borderColor, color, fontSize, fontFamily, fontWeight,
    textAlign, verticalAlign, locked, link, emoji,
  } = useNodeStyle(data);
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  const points = `${width / 2},1 ${width - 1},${height - 1} 1,${height - 1}`;

  const alignItems = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
  const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';

  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer isVisible={!!selected && !locked} minWidth={50} minHeight={40} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polygon points={points} fill={fill} stroke={borderColor} strokeWidth={2} />
        {!isEditing && (
          <foreignObject x={width * 0.2} y={height * 0.4} width={width * 0.6} height={height * 0.5}>
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
        <div className="node-edit-overlay" style={{ top: '30%' }}>
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
}, areNodePropsEqual);

export default TriangleNode;
