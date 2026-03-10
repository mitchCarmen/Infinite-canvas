import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, useViewport, type Node } from '@xyflow/react';
import type { NodeType } from '@shared/types';
import { DEFAULT_NODE_DIMENSIONS } from '@shared/types';
import { api } from '../../api';
import ShapeSelector from './ShapeSelector';
import FontFamilyPicker from './FontFamilyPicker';
import FontSizePicker from './FontSizePicker';
import TextFormatGroup from './TextFormatGroup';
import ColorPicker from './ColorPicker';
import ClearFormatting from './ClearFormatting';
import EmojiPicker from './EmojiPicker';
import LockToggle from './LockToggle';
import '../../styles/toolbar.css';

type DropdownId = 'shape' | 'fontFamily' | 'fillColor' | 'borderColor' | 'textColor' | 'emoji' | 'alignment' | 'link' | null;

interface NodeFormattingToolbarProps {
  selectedNodes: Node[];
  boardId: string;
  onRefetch: () => void;
}

function getSelectionBounds(nodes: Node[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const w = node.measured?.width ?? node.width ?? 150;
    const h = node.measured?.height ?? node.height ?? 80;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Get a style value shared across all nodes, or "—" if mixed */
function getSharedStyle(nodes: Node[], prop: string): string {
  const values = nodes.map(n => ((n.data?.style as Record<string, string>) ?? {})[prop] ?? '');
  const unique = new Set(values);
  return unique.size === 1 ? values[0] : '—';
}

function getSharedData<T>(nodes: Node[], key: string): T | '—' {
  const values = nodes.map(n => (n.data as Record<string, unknown>)?.[key]);
  const unique = new Set(values.map(v => JSON.stringify(v)));
  return unique.size === 1 ? (values[0] as T) : '—';
}

export default function NodeFormattingToolbar({ selectedNodes, boardId, onRefetch }: NodeFormattingToolbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<DropdownId>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { flowToScreenPosition } = useReactFlow();
  const viewport = useViewport();

  if (selectedNodes.length === 0) return null;

  const bounds = getSelectionBounds(selectedNodes);
  const screenPos = flowToScreenPosition({ x: bounds.x + bounds.width / 2, y: bounds.y });

  // Shared values for multi-select
  const currentType = (() => { const types = selectedNodes.map(n => n.type ?? 'rectangle'); return new Set(types).size === 1 ? types[0] : '—'; })();
  const currentFontFamily = getSharedStyle(selectedNodes, 'fontFamily') || 'Arial';
  const currentFontSize = getSharedStyle(selectedNodes, 'fontSize') || '14px';
  const currentFontWeight = getSharedStyle(selectedNodes, 'fontWeight') || 'normal';
  const currentTextAlign = getSharedStyle(selectedNodes, 'textAlign') || 'center';
  const currentVerticalAlign = getSharedStyle(selectedNodes, 'verticalAlign') || 'middle';
  const currentFillColor = getSharedStyle(selectedNodes, 'backgroundColor') || '#ffffff';
  const currentBorderColor = getSharedStyle(selectedNodes, 'borderColor') || '#333333';
  const currentTextColor = getSharedStyle(selectedNodes, 'color') || '';
  const currentLink = getSharedData<string>(selectedNodes, 'link');
  const currentEmoji = getSharedData<string>(selectedNodes, 'emoji');
  const isLocked = selectedNodes.every(n => (n.data as Record<string, unknown>)?.locked === true);

  const toggleDropdown = (id: DropdownId) => {
    setActiveDropdown(prev => prev === id ? null : id);
  };

  const applyStyle = async (prop: string, value: string) => {
    const updates = selectedNodes.map(node => {
      const currentStyle = (node.data?.style as Record<string, string>) ?? {};
      return { id: node.id, style: { ...currentStyle, [prop]: value } };
    });
    await api.bulkUpdateNodes(boardId, updates);
    onRefetch();
  };

  const applyData = async (key: string, value: unknown) => {
    const INTERNAL_KEYS = new Set(['label', 'style', 'width', 'height', 'nodeType', 'boardId', 'canvasLight', 'isEditing', 'onStartEdit', 'onFinishEdit', 'onCancelEdit']);
    for (const node of selectedNodes) {
      const rawData = (node.data as Record<string, unknown>) ?? {};
      const cleanData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawData)) {
        if (!INTERNAL_KEYS.has(k)) cleanData[k] = v;
      }
      cleanData[key] = value;
      await api.updateNode(boardId, node.id, { data: cleanData });
    }
    onRefetch();
  };

  const handleChangeType = async (type: NodeType) => {
    const dims = DEFAULT_NODE_DIMENSIONS[type];
    for (const node of selectedNodes) {
      await api.updateNode(boardId, node.id, {
        type,
        width: dims.width,
        height: dims.height,
      });
    }
    onRefetch();
    setActiveDropdown(null);
  };

  const handleClearFormatting = async () => {
    for (const node of selectedNodes) {
      await api.updateNode(boardId, node.id, { style: {} });
    }
    onRefetch();
  };

  const handleToggleLock = async () => {
    const newLocked = !isLocked;
    await applyData('locked', newLocked);
  };

  const disabled = isLocked;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as HTMLElement)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={toolbarRef}
      className={`nft-toolbar ${disabled ? 'nft-locked' : ''}`}
      style={{
        position: 'fixed',
        left: screenPos.x,
        top: screenPos.y - 8,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <ShapeSelector
        currentType={currentType}
        isOpen={activeDropdown === 'shape'}
        onToggle={() => toggleDropdown('shape')}
        onChangeType={handleChangeType}
      />

      <div className="nft-separator" />

      <FontFamilyPicker
        currentFont={disabled ? '—' : currentFontFamily}
        isOpen={activeDropdown === 'fontFamily'}
        onToggle={() => !disabled && toggleDropdown('fontFamily')}
        onChangeFont={(f) => applyStyle('fontFamily', f)}
      />

      <FontSizePicker
        currentSize={disabled ? '—' : currentFontSize}
        onChangeSize={(s) => !disabled && applyStyle('fontSize', s)}
      />

      <div className="nft-separator" />

      <TextFormatGroup
        fontWeight={currentFontWeight}
        textAlign={currentTextAlign}
        verticalAlign={currentVerticalAlign}
        link={typeof currentLink === 'string' ? currentLink : null}
        isAlignOpen={activeDropdown === 'alignment'}
        isLinkOpen={activeDropdown === 'link'}
        onToggleAlign={() => !disabled && toggleDropdown('alignment')}
        onToggleLink={() => !disabled && toggleDropdown('link')}
        onChangeFontWeight={(w) => !disabled && applyStyle('fontWeight', w)}
        onChangeTextAlign={(a) => !disabled && applyStyle('textAlign', a)}
        onChangeVerticalAlign={(a) => !disabled && applyStyle('verticalAlign', a)}
        onChangeLink={(url) => !disabled && applyData('link', url)}
      />

      <div className="nft-separator" />

      {/* Text color */}
      <div className="nft-section">
        <button
          className={`nft-btn ${activeDropdown === 'textColor' ? 'nft-btn-active' : ''}`}
          onClick={() => !disabled && toggleDropdown('textColor')}
          disabled={disabled}
          title="Text color"
        >
          <span style={{ fontWeight: 'bold' }}>A</span>
          <div className="nft-color-indicator" style={{ backgroundColor: currentTextColor || '#e0e0e0' }} />
        </button>
        {activeDropdown === 'textColor' && (
          <div className="nft-dropdown">
            <ColorPicker currentColor={currentTextColor} onColorChange={(c) => applyStyle('color', c)} label="Text color" />
          </div>
        )}
      </div>

      {/* Fill color */}
      <div className="nft-section">
        <button
          className={`nft-btn ${activeDropdown === 'fillColor' ? 'nft-btn-active' : ''}`}
          onClick={() => !disabled && toggleDropdown('fillColor')}
          disabled={disabled}
          title="Fill color"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill={currentFillColor} stroke="currentColor" strokeWidth={2}>
            <rect x={3} y={3} width={18} height={18} rx={2}/>
          </svg>
        </button>
        {activeDropdown === 'fillColor' && (
          <div className="nft-dropdown">
            <ColorPicker currentColor={currentFillColor} onColorChange={(c) => applyStyle('backgroundColor', c)} label="Fill color" />
          </div>
        )}
      </div>

      {/* Border color */}
      <div className="nft-section">
        <button
          className={`nft-btn ${activeDropdown === 'borderColor' ? 'nft-btn-active' : ''}`}
          onClick={() => !disabled && toggleDropdown('borderColor')}
          disabled={disabled}
          title="Border color"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={currentBorderColor} strokeWidth={2.5}>
            <circle cx={12} cy={12} r={9}/>
          </svg>
        </button>
        {activeDropdown === 'borderColor' && (
          <div className="nft-dropdown">
            <ColorPicker currentColor={currentBorderColor} onColorChange={(c) => applyStyle('borderColor', c)} label="Border color" />
          </div>
        )}
      </div>

      <div className="nft-separator" />

      <ClearFormatting onClear={disabled ? () => {} : handleClearFormatting} />

      <EmojiPicker
        currentEmoji={typeof currentEmoji === 'string' ? currentEmoji : null}
        isOpen={activeDropdown === 'emoji'}
        onToggle={() => !disabled && toggleDropdown('emoji')}
        onSelectEmoji={(e) => !disabled && applyData('emoji', e)}
      />

      <div className="nft-separator" />

      <LockToggle isLocked={isLocked} onToggle={handleToggleLock} />
    </div>
  );
}
