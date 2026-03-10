import React from 'react';
import type { NodeType } from '@shared/types';

const NODE_TYPES: { type: NodeType; label: string }[] = [
  { type: 'rectangle', label: 'Rectangle' },
  { type: 'circle', label: 'Circle' },
  { type: 'ellipse', label: 'Ellipse' },
  { type: 'diamond', label: 'Diamond' },
  { type: 'hexagon', label: 'Hexagon' },
  { type: 'parallelogram', label: 'Parallelogram' },
  { type: 'cylinder', label: 'Cylinder' },
  { type: 'triangle', label: 'Triangle' },
  { type: 'sticky', label: 'Sticky Note' },
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'group', label: 'Group' },
];

interface ShapeSelectorProps {
  currentType: string;
  isOpen: boolean;
  onToggle: () => void;
  onChangeType: (type: NodeType) => void;
}

export default function ShapeSelector({ currentType, isOpen, onToggle, onChangeType }: ShapeSelectorProps) {
  return (
    <div className="nft-section">
      <button className={`nft-btn ${isOpen ? 'nft-btn-active' : ''}`} onClick={onToggle} title="Change shape">
        <ShapeIcon type={currentType} />
      </button>
      {isOpen && (
        <div className="nft-dropdown nft-shape-dropdown">
          {NODE_TYPES.map(({ type, label }) => (
            <button
              key={type}
              className={`nft-shape-option ${type === currentType ? 'nft-shape-option-active' : ''}`}
              onClick={() => onChangeType(type)}
              title={label}
            >
              <ShapeIcon type={type} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShapeIcon({ type }: { type: string }) {
  const size = 16;
  switch (type) {
    case 'circle':
      return <svg width={size} height={size}><circle cx={8} cy={8} r={7} fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'diamond':
      return <svg width={size} height={size}><polygon points="8,1 15,8 8,15 1,8" fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'triangle':
      return <svg width={size} height={size}><polygon points="8,1 15,15 1,15" fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'hexagon':
      return <svg width={size} height={size}><polygon points="4,1 12,1 15,8 12,15 4,15 1,8" fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'ellipse':
      return <svg width={size} height={size}><ellipse cx={8} cy={8} rx={7} ry={5} fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'cylinder':
      return <svg width={size} height={size}><ellipse cx={8} cy={4} rx={6} ry={3} fill="none" stroke="currentColor" strokeWidth={1.5}/><line x1={2} y1={4} x2={2} y2={12} stroke="currentColor" strokeWidth={1.5}/><line x1={14} y1={4} x2={14} y2={12} stroke="currentColor" strokeWidth={1.5}/><ellipse cx={8} cy={12} rx={6} ry={3} fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'parallelogram':
      return <svg width={size} height={size}><polygon points="4,1 15,1 12,15 1,15" fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
    case 'sticky':
      return <svg width={size} height={size}><rect x={1} y={1} width={14} height={14} fill="#fff9c4" stroke="#e6db00" strokeWidth={1.5}/></svg>;
    case 'text':
      return <svg width={size} height={size}><text x={3} y={13} fontSize={13} fill="currentColor" fontWeight="bold">T</text></svg>;
    case 'image':
      return <svg width={size} height={size}><rect x={1} y={1} width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} rx={1}/><circle cx={5} cy={5} r={2} fill="currentColor"/><polyline points="1,13 6,8 10,12 12,10 15,13" fill="none" stroke="currentColor" strokeWidth={1}/></svg>;
    case 'group':
      return <svg width={size} height={size}><rect x={1} y={1} width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="2,2" rx={2}/></svg>;
    default: // rectangle
      return <svg width={size} height={size}><rect x={1} y={1} width={14} height={14} rx={2} fill="none" stroke="currentColor" strokeWidth={1.5}/></svg>;
  }
}
