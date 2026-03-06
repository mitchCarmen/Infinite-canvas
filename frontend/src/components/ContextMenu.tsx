import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { NodeType } from '@shared/types';

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface NodeContextMenuProps {
  type: 'node';
  position: ContextMenuPosition;
  nodeId: string;
  nodeType: string;
  boardId: string;
  selectedNodeIds: string[];
  onRefetch: () => void;
  onClose: () => void;
  onStartEdit: (nodeId: string) => void;
}

interface EdgeContextMenuProps {
  type: 'edge';
  position: ContextMenuPosition;
  edgeId: string;
  edgeSource: string;
  edgeTarget: string;
  boardId: string;
  onRefetch: () => void;
  onClose: () => void;
}

interface CanvasContextMenuProps {
  type: 'canvas';
  position: ContextMenuPosition;
  flowPosition: { x: number; y: number };
  boardId: string;
  snapEnabled: boolean;
  onRefetch: () => void;
  onClose: () => void;
  onToggleSnap: () => void;
  onZoomToFit: () => void;
}

export type ContextMenuProps =
  | NodeContextMenuProps
  | EdgeContextMenuProps
  | CanvasContextMenuProps;

const SHAPE_TYPES: { type: NodeType; label: string }[] = [
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
];

const REORDER_ACTIONS = [
  { action: 'bring_to_front', label: 'Bring to Front' },
  { action: 'send_to_back', label: 'Send to Back' },
  { action: 'bring_forward', label: 'Bring Forward' },
  { action: 'send_backward', label: 'Send Backward' },
];

export default function ContextMenu(props: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [shapeSubmenuOpen, setShapeSubmenuOpen] = useState(false);
  const [layerSubmenuOpen, setLayerSubmenuOpen] = useState(false);
  const [addNodeSubmenuOpen, setAddNodeSubmenuOpen] = useState(false);
  const [routingSubmenuOpen, setRoutingSubmenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        props.onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [props]);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: props.position.x,
    top: props.position.y,
    zIndex: 1000,
  };

  if (props.type === 'node') {
    const { nodeId, boardId, onRefetch, onClose, onStartEdit, selectedNodeIds } = props;

    const handleEditLabel = () => {
      onStartEdit(nodeId);
      onClose();
    };

    const handleChangeShape = async (newType: NodeType) => {
      await api.updateNode(boardId, nodeId, { type: newType });
      onRefetch();
      onClose();
    };

    const handleReorder = async (action: string) => {
      await api.reorderNode(boardId, nodeId, action);
      onRefetch();
      onClose();
    };

    const handleDuplicate = async () => {
      // Read the current board to get node data, then create a copy
      const board = await api.readBoard(boardId);
      const node = board.nodes.find((n: { id: string }) => n.id === nodeId);
      if (node) {
        await api.createNode(boardId, {
          type: node.type,
          label: node.label + ' (copy)',
          x: node.x + 20,
          y: node.y + 20,
          style: node.style,
        });
        onRefetch();
      }
      onClose();
    };

    const handleGroup = async () => {
      const ids = selectedNodeIds.length > 1 ? selectedNodeIds : [nodeId];
      await api.createGroup(boardId, 'Group', ids);
      onRefetch();
      onClose();
    };

    const handleDelete = async () => {
      await api.deleteNode(boardId, nodeId);
      onRefetch();
      onClose();
    };

    return (
      <div ref={menuRef} className="context-menu" style={menuStyle}>
        <button className="context-menu-item" onClick={handleEditLabel}>
          Edit Label
        </button>
        <div
          className="context-menu-item context-menu-submenu-trigger"
          onMouseEnter={() => { setShapeSubmenuOpen(true); setLayerSubmenuOpen(false); }}
          onMouseLeave={() => setShapeSubmenuOpen(false)}
        >
          Change Shape &#9656;
          {shapeSubmenuOpen && (
            <div className="context-menu context-submenu">
              {SHAPE_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  className="context-menu-item"
                  onClick={() => handleChangeShape(type)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div
          className="context-menu-item context-menu-submenu-trigger"
          onMouseEnter={() => { setLayerSubmenuOpen(true); setShapeSubmenuOpen(false); }}
          onMouseLeave={() => setLayerSubmenuOpen(false)}
        >
          Layer &#9656;
          {layerSubmenuOpen && (
            <div className="context-menu context-submenu">
              {REORDER_ACTIONS.map(({ action, label }) => (
                <button
                  key={action}
                  className="context-menu-item"
                  onClick={() => handleReorder(action)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="context-menu-item" onClick={handleDuplicate}>
          Duplicate
        </button>
        <button className="context-menu-item" onClick={handleGroup}>
          Group Selected
        </button>
        <div className="context-menu-separator" />
        <button className="context-menu-item context-menu-item-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
    );
  }

  if (props.type === 'edge') {
    const { edgeId, boardId, onRefetch, onClose } = props;

    const handleEditLabel = async () => {
      const newLabel = window.prompt('Edge label:');
      if (newLabel !== null) {
        await api.updateEdge(boardId, edgeId, { label: newLabel });
        onRefetch();
      }
      onClose();
    };

    const handleSetRouting = async (routing: string) => {
      await api.updateEdge(boardId, edgeId, { style: { routing } });
      onRefetch();
      onClose();
    };

    const handleDelete = async () => {
      await api.deleteEdge(boardId, edgeId);
      onRefetch();
      onClose();
    };

    const ROUTING_OPTIONS = [
      { value: 'bezier', label: 'Bezier' },
      { value: 'straight', label: 'Straight' },
      { value: 'step', label: 'Step' },
    ];

    return (
      <div ref={menuRef} className="context-menu" style={menuStyle}>
        <button className="context-menu-item" onClick={handleEditLabel}>
          Edit Label
        </button>
        <div
          className="context-menu-item context-menu-submenu-trigger"
          onMouseEnter={() => setRoutingSubmenuOpen(true)}
          onMouseLeave={() => setRoutingSubmenuOpen(false)}
        >
          Routing &#9656;
          {routingSubmenuOpen && (
            <div className="context-menu context-submenu">
              {ROUTING_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  className="context-menu-item"
                  onClick={() => handleSetRouting(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="context-menu-separator" />
        <button className="context-menu-item context-menu-item-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
    );
  }

  // Canvas context menu
  const { flowPosition, boardId, snapEnabled, onRefetch, onClose, onToggleSnap, onZoomToFit } = props;

  const handleAddNode = async (type: NodeType) => {
    await api.createNode(boardId, {
      type,
      label: type,
      x: flowPosition.x,
      y: flowPosition.y,
    });
    onRefetch();
    onClose();
  };

  return (
    <div ref={menuRef} className="context-menu" style={menuStyle}>
      <div
        className="context-menu-item context-menu-submenu-trigger"
        onMouseEnter={() => setAddNodeSubmenuOpen(true)}
        onMouseLeave={() => setAddNodeSubmenuOpen(false)}
      >
        Add Node &#9656;
        {addNodeSubmenuOpen && (
          <div className="context-menu context-submenu">
            {SHAPE_TYPES.map(({ type, label }) => (
              <button
                key={type}
                className="context-menu-item"
                onClick={() => handleAddNode(type)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="context-menu-item" onClick={() => { onZoomToFit(); onClose(); }}>
        Zoom to Fit
      </button>
      <button className="context-menu-item" onClick={() => { onToggleSnap(); onClose(); }}>
        Grid Snap: {snapEnabled ? 'On' : 'Off'}
      </button>
    </div>
  );
}
