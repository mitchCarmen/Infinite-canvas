import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useNodeEdit } from './useNodeEdit';
import { useNodeStyle } from '../../hooks/useNodeStyle';
import { ensureContrast } from '../../utils/color';
import NodeBadges from './NodeBadges';
import { areNodePropsEqual } from './areNodePropsEqual';

const TextNode = React.memo(function TextNode({ data, selected }: NodeProps) {
  const width = (data.width as number) ?? 150;
  const height = (data.height as number) ?? 40;
  const canvasBg = data.canvasLight ? '#ffffff' : '#1e1e24';
  const {
    color: styleColor, fontSize, fontFamily, fontWeight,
    textAlign, verticalAlign, locked, link, emoji,
  } = useNodeStyle(data);
  const color = ensureContrast(styleColor, canvasBg);
  const { isEditing, label, editValue, setEditValue, inputRef, handleKeyDown, handleBlur } = useNodeEdit(data);

  const alignItems = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
  const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        alignItems,
        justifyContent,
        color,
        fontSize,
        fontFamily,
        fontWeight,
      }}
    >
      <NodeResizer isVisible={!!selected && !locked} minWidth={40} minHeight={20} />
      {isEditing ? (
        <input
          ref={inputRef}
          className="node-edit-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{ fontSize, fontFamily }}
        />
      ) : (
        <span style={{ textAlign, wordBreak: 'break-word', overflow: 'hidden' }}>{label}</span>
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

export default TextNode;
