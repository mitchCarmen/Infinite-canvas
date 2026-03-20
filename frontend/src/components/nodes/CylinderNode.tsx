import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { useNodeStyle } from '../../hooks/useNodeStyle';
import NodeBadges from './NodeBadges';
import { areNodePropsEqual } from './areNodePropsEqual';

const CylinderNode = React.memo(function CylinderNode({ data, selected, width: nodeWidth, height: nodeHeight }: NodeProps) {
  const width = nodeWidth ?? (data.width as number) ?? 100;
  const height = nodeHeight ?? (data.height as number) ?? 120;
  const {
    fill, borderColor, color, fontSize, fontFamily, fontWeight,
    textAlign, verticalAlign, locked, link, emoji,
  } = useNodeStyle(data);
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

  const alignItems = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
  const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <NodeResizer isVisible={!!selected && !locked} minWidth={50} minHeight={60} />
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <path d={d} fill={fill} stroke={borderColor} strokeWidth={2} />
        {!isEditing && (
          <foreignObject x={4} y={ry * 2} width={width - 8} height={height - ry * 3}>
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
}, areNodePropsEqual);

export default CylinderNode;
