import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { getContrastColor } from '../../utils/color';

export default function TextNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 150;
  const height = (data.height as number) ?? 40;
  const CANVAS_BG = '#1e1e24';
  const explicitColor = (data.style as Record<string, string>)?.color;
  const color = explicitColor ?? getContrastColor(CANVAS_BG);
  const fontSize = (data.style as Record<string, string>)?.fontSize ?? '14px';
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontSize,
      }}
    >
      <NodeResizer isVisible={!!selected} minWidth={40} minHeight={20} />
      {isEditing ? (
        <input
          ref={inputRef}
          className="node-edit-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{ fontSize }}
        />
      ) : (
        label
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
