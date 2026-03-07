import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { NodeType } from '@shared/types';
import { api } from '../api';
import MermaidImportModal from './MermaidImportModal';

interface ToolbarProps {
  boardId: string;
  boardName: string;
  onRefetch: () => void;
  onToggleSnap: () => void;
  snapEnabled: boolean;
  onToggleActivityLog: () => void;
  onZoomToFit: () => void;
  reactFlowInstance: ReactFlowInstance | null;
  onExportPng?: () => void;
  onExportSvg?: () => void;
  canvasLight: boolean;
  onToggleCanvasLight: () => void;
}

const SHAPE_TYPES: { type: NodeType; label: string }[] = [
  { type: 'rectangle', label: 'Rectangle' },
  { type: 'circle', label: 'Circle' },
  { type: 'ellipse', label: 'Ellipse' },
  { type: 'diamond', label: 'Diamond' },
  { type: 'hexagon', label: 'Hexagon' },
  { type: 'parallelogram', label: 'Parallelogram' },
  { type: 'cylinder', label: 'Cylinder' },
  { type: 'triangle', label: 'Triangle' },
  { type: 'sticky', label: 'Sticky' },
  { type: 'text', label: 'Text' },
];

function ShapeIcon({ type }: { type: NodeType }) {
  const size = 28;
  const mid = size / 2;
  const stroke = '#c0c0c0';
  const fill = 'none';

  switch (type) {
    case 'rectangle':
      return (
        <svg width={size} height={size}>
          <rect x={3} y={6} width={22} height={16} stroke={stroke} fill={fill} strokeWidth={1.5} rx={2} />
        </svg>
      );
    case 'circle':
      return (
        <svg width={size} height={size}>
          <circle cx={mid} cy={mid} r={10} stroke={stroke} fill={fill} strokeWidth={1.5} />
        </svg>
      );
    case 'ellipse':
      return (
        <svg width={size} height={size}>
          <ellipse cx={mid} cy={mid} rx={12} ry={8} stroke={stroke} fill={fill} strokeWidth={1.5} />
        </svg>
      );
    case 'diamond':
      return (
        <svg width={size} height={size}>
          <polygon points={`${mid},3 ${size - 3},${mid} ${mid},${size - 3} 3,${mid}`} stroke={stroke} fill={fill} strokeWidth={1.5} />
        </svg>
      );
    case 'hexagon':
      return (
        <svg width={size} height={size}>
          <polygon points={`8,3 20,3 ${size - 2},${mid} 20,${size - 3} 8,${size - 3} 2,${mid}`} stroke={stroke} fill={fill} strokeWidth={1.5} />
        </svg>
      );
    case 'parallelogram':
      return (
        <svg width={size} height={size}>
          <polygon points={`8,6 ${size - 3},6 20,22 3,22`} stroke={stroke} fill={fill} strokeWidth={1.5} />
        </svg>
      );
    case 'cylinder':
      return (
        <svg width={size} height={size}>
          <ellipse cx={mid} cy={7} rx={9} ry={4} stroke={stroke} fill={fill} strokeWidth={1.5} />
          <line x1={5} y1={7} x2={5} y2={21} stroke={stroke} strokeWidth={1.5} />
          <line x1={23} y1={7} x2={23} y2={21} stroke={stroke} strokeWidth={1.5} />
          <ellipse cx={mid} cy={21} rx={9} ry={4} stroke={stroke} fill={fill} strokeWidth={1.5} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size}>
          <polygon points={`${mid},4 ${size - 3},${size - 4} 3,${size - 4}`} stroke={stroke} fill={fill} strokeWidth={1.5} />
        </svg>
      );
    case 'sticky':
      return (
        <svg width={size} height={size}>
          <rect x={4} y={4} width={20} height={20} stroke="#ffd93d" fill="rgba(255,217,61,0.2)" strokeWidth={1.5} rx={1} />
        </svg>
      );
    case 'text':
      return (
        <svg width={size} height={size}>
          <text x={mid} y={mid + 5} textAnchor="middle" fill={stroke} fontSize={16} fontWeight={600}>
            T
          </text>
        </svg>
      );
    default:
      return (
        <svg width={size} height={size}>
          <rect x={3} y={3} width={22} height={22} stroke={stroke} fill={fill} strokeWidth={1.5} />
        </svg>
      );
  }
}

export default function Toolbar({
  boardId,
  boardName,
  onRefetch,
  onToggleSnap,
  snapEnabled,
  onToggleActivityLog,
  onZoomToFit,
  reactFlowInstance,
  onExportPng,
  onExportSvg,
  canvasLight,
  onToggleCanvasLight,
}: ToolbarProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(boardName);
  const [showMermaidModal, setShowMermaidModal] = useState(false);
  const [layoutDropdownOpen, setLayoutDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameValue(boardName);
  }, [boardName]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const saveName = useCallback(async () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== boardName) {
      await api.updateBoardMetadata(boardId, { name: trimmed });
      onRefetch();
    } else {
      setNameValue(boardName);
    }
  }, [nameValue, boardName, boardId, onRefetch]);

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') {
      setNameValue(boardName);
      setEditingName(false);
    }
  };

  const onDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('application/reactflow-type', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const addNodeAtCenter = async (type: NodeType) => {
    let x = 200;
    let y = 200;
    if (reactFlowInstance) {
      const viewport = reactFlowInstance.getViewport();
      const bounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (bounds) {
        const center = reactFlowInstance.screenToFlowPosition({
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        });
        x = center.x;
        y = center.y;
      } else {
        x = -viewport.x / viewport.zoom + 400;
        y = -viewport.y / viewport.zoom + 300;
      }
    }
    await api.createNode(boardId, { type, label: type, x, y });
    onRefetch();
  };

  const handleAutoLayout = async (direction: string) => {
    setLayoutDropdownOpen(false);
    await api.autoLayout(boardId, direction);
    onRefetch();
  };

  const handleExport = (format: string) => {
    setExportDropdownOpen(false);
    if (format === 'PNG' && onExportPng) {
      onExportPng();
    } else if (format === 'SVG' && onExportSvg) {
      onExportSvg();
    }
  };

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-section">
          <a href="#/" className="toolbar-back" title="Back to boards">
            &#8592;
          </a>
          {editingName ? (
            <input
              ref={nameInputRef}
              className="toolbar-name-input"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={handleNameKeyDown}
            />
          ) : (
            <span
              className="toolbar-name"
              onClick={() => setEditingName(true)}
              title="Click to edit board name"
            >
              {boardName}
            </span>
          )}
        </div>

        <div className="toolbar-section">
          <div className="toolbar-label">Shapes</div>
          <div className="toolbar-shapes">
            {SHAPE_TYPES.map(({ type, label }) => (
              <button
                key={type}
                className="toolbar-shape-btn"
                title={label}
                draggable
                onDragStart={(e) => onDragStart(e, type)}
                onClick={() => addNodeAtCenter(type)}
              >
                <ShapeIcon type={type} />
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-section toolbar-actions">
          <div className="toolbar-dropdown-wrapper">
            <button
              className="btn btn-small"
              onClick={() => { setLayoutDropdownOpen(!layoutDropdownOpen); setExportDropdownOpen(false); }}
            >
              Auto Layout
            </button>
            {layoutDropdownOpen && (
              <div className="toolbar-dropdown">
                {['TB', 'LR', 'BT', 'RL'].map((dir) => (
                  <button key={dir} className="toolbar-dropdown-item" onClick={() => handleAutoLayout(dir)}>
                    {dir}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-small" onClick={() => setShowMermaidModal(true)}>
            Import Mermaid
          </button>

          <div className="toolbar-dropdown-wrapper">
            <button
              className="btn btn-small"
              onClick={() => { setExportDropdownOpen(!exportDropdownOpen); setLayoutDropdownOpen(false); }}
            >
              Export
            </button>
            {exportDropdownOpen && (
              <div className="toolbar-dropdown">
                {['PNG', 'SVG'].map((fmt) => (
                  <button key={fmt} className="toolbar-dropdown-item" onClick={() => handleExport(fmt)}>
                    {fmt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className={`btn btn-small ${snapEnabled ? 'btn-active' : ''}`}
            onClick={onToggleSnap}
            title="Toggle grid snap"
          >
            Snap {snapEnabled ? 'On' : 'Off'}
          </button>

          <button className="btn btn-small" onClick={onToggleActivityLog}>
            Activity Log
          </button>

          <button className="btn btn-small" onClick={onZoomToFit}>
            Zoom to Fit
          </button>
        </div>

        <div className="toolbar-section toolbar-bottom">
          <button
            className={`btn btn-small btn-canvas-mode ${canvasLight ? 'btn-active' : ''}`}
            onClick={onToggleCanvasLight}
            title="Toggle canvas light/dark mode"
          >
            {canvasLight ? '☀️ Light Canvas' : '🌙 Dark Canvas'}
          </button>
        </div>
      </div>

      {showMermaidModal && (
        <MermaidImportModal
          boardId={boardId}
          onClose={() => setShowMermaidModal(false)}
          onRefetch={onRefetch}
        />
      )}
    </>
  );
}
