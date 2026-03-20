import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { getContrastColor, ensureContrast } from '../../utils/color';
import NodeBadges from './NodeBadges';
import { areNodePropsEqual } from './areNodePropsEqual';

const GroupNode = React.memo(function GroupNode({ data, selected, width: nodeWidth, height: nodeHeight }: NodeProps) {
  const width = nodeWidth ?? (data.width as number) ?? 400;
  const height = nodeHeight ?? (data.height as number) ?? 300;
  const fill = (data.style as Record<string, string>)?.backgroundColor ?? 'rgba(200, 200, 200, 0.1)';
  const borderColor = (data.style as Record<string, string>)?.borderColor ?? '#888888';
  const canvasBg = data.canvasLight ? '#ffffff' : '#1e1e24';
  const explicitColor = (data.style as Record<string, string>)?.color;
  const color = explicitColor ? ensureContrast(explicitColor, canvasBg) : getContrastColor(canvasBg);
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '13px';
  const locked = data.locked === true;
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <NodeResizer isVisible={!!selected && !locked} minWidth={100} minHeight={80} />
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          rx={4}
          ry={4}
          fill={fill}
          stroke={borderColor}
          strokeWidth={2}
          strokeDasharray="8 4"
        />
        {!isEditing && (
          <text
            x={10}
            y={18}
            fill={color}
            fontSize={fontSize}
            fontWeight="600"
          >
            {label}
          </text>
        )}
      </svg>
      {isEditing && (
        <div style={{ position: 'absolute', top: 4, left: 6, zIndex: 10 }}>
          <input
            ref={inputRef}
            className="node-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{ fontSize, fontWeight: 600, textAlign: 'left', width: 'auto', minWidth: 80 }}
          />
        </div>
      )}
      <NodeBadges link={null} emoji={null} locked={locked} />
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

export default GroupNode;
