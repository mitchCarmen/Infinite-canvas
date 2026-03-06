import React, { useState } from 'react';
import type { Node } from '@xyflow/react';
import { api } from '../api';

const COLOR_PALETTE = [
  '#ffffff',
  '#ff6b6b',
  '#ffd93d',
  '#4ecca3',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#1a1a2e',
];

const BORDER_WIDTHS = [1, 2, 3, 4];

const FONT_SIZES: { label: string; value: number }[] = [
  { label: 'S', value: 12 },
  { label: 'M', value: 14 },
  { label: 'L', value: 18 },
  { label: 'XL', value: 24 },
];

interface FloatingStyleBarProps {
  selectedNodes: Node[];
  boardId: string;
  onRefetch: () => void;
}

function getSelectionBounds(nodes: Node[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const w = (node.measured?.width ?? node.width ?? 150);
    const h = (node.measured?.height ?? node.height ?? 80);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export default function FloatingStyleBar({ selectedNodes, boardId, onRefetch }: FloatingStyleBarProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [hexInput, setHexInput] = useState('');

  if (selectedNodes.length === 0) return null;

  const bounds = getSelectionBounds(selectedNodes);

  const applyStyle = async (styleProp: string, value: string) => {
    for (const node of selectedNodes) {
      const currentStyle = (node.data?.style as Record<string, string>) ?? {};
      await api.updateNode(boardId, node.id, {
        style: { ...currentStyle, [styleProp]: value },
      });
    }
    onRefetch();
  };

  const toggleSection = (section: string) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const renderColorPalette = (styleProp: string) => (
    <div className="style-bar-palette">
      {COLOR_PALETTE.map((color) => (
        <button
          key={color}
          className="style-bar-color-swatch"
          style={{
            backgroundColor: color,
            border: color === '#ffffff' ? '1px solid #555' : '1px solid transparent',
          }}
          onClick={() => applyStyle(styleProp, color)}
          title={color}
        />
      ))}
      <div className="style-bar-hex-row">
        <input
          className="style-bar-hex-input"
          type="text"
          placeholder="#hex"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && /^#[0-9a-fA-F]{3,8}$/.test(hexInput)) {
              applyStyle(styleProp, hexInput);
              setHexInput('');
            }
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      className="floating-style-bar"
      style={{
        position: 'absolute',
        left: bounds.x + bounds.width / 2,
        top: bounds.y - 8,
        transform: 'translate(-50%, -100%)',
        zIndex: 1000,
        pointerEvents: 'all',
      }}
    >
      <div className="style-bar-row">
        <button
          className={`style-bar-btn ${activeSection === 'fill' ? 'style-bar-btn-active' : ''}`}
          onClick={() => toggleSection('fill')}
          title="Fill color"
        >
          Fill
        </button>
        <button
          className={`style-bar-btn ${activeSection === 'borderColor' ? 'style-bar-btn-active' : ''}`}
          onClick={() => toggleSection('borderColor')}
          title="Border color"
        >
          Border
        </button>
        <div className="style-bar-separator" />
        <div className="style-bar-group">
          {BORDER_WIDTHS.map((w) => (
            <button
              key={w}
              className="style-bar-btn style-bar-btn-small"
              onClick={() => applyStyle('borderWidth', `${w}px`)}
              title={`${w}px border`}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="style-bar-separator" />
        <div className="style-bar-group">
          {FONT_SIZES.map((fs) => (
            <button
              key={fs.label}
              className="style-bar-btn style-bar-btn-small"
              onClick={() => applyStyle('fontSize', `${fs.value}px`)}
              title={`Font size ${fs.value}px`}
            >
              {fs.label}
            </button>
          ))}
        </div>
        <div className="style-bar-separator" />
        <button
          className={`style-bar-btn ${activeSection === 'textColor' ? 'style-bar-btn-active' : ''}`}
          onClick={() => toggleSection('textColor')}
          title="Text color"
        >
          Aa
        </button>
      </div>
      {activeSection === 'fill' && renderColorPalette('backgroundColor')}
      {activeSection === 'borderColor' && renderColorPalette('borderColor')}
      {activeSection === 'textColor' && renderColorPalette('color')}
    </div>
  );
}
