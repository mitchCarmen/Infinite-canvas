import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
  SelectionMode,
  useReactFlow,
  type ReactFlowInstance,
  type Connection,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes as baseNodeTypes } from './nodes';
import { useBoard } from '../hooks/useBoard';
import { useClipboard } from '../hooks/useClipboard';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useSnapToGrid } from '../hooks/useSnapToGrid';
import { useViewportPersistence } from '../hooks/useViewportPersistence';
import { useExport } from '../hooks/useExport';
import { api } from '../api';
import Toolbar from './Toolbar';
import ContextMenu, { type ContextMenuProps } from './ContextMenu';
import FloatingStyleBar from './FloatingStyleBar';
import SearchBar from './SearchBar';
import ActivityLogDrawer from './ActivityLogDrawer';
import AlignmentGuides from './AlignmentGuides';
import LoadingSpinner from './LoadingSpinner';

interface CanvasViewProps {
  boardId: string;
}

function CanvasInner({ boardId }: CanvasViewProps) {
  const {
    nodes,
    edges,
    board,
    onNodesChange,
    onEdgesChange,
    onConnect,
    loading,
    refetch,
    setNodes,
    snapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useBoard(boardId);

  const { snapToGrid, snapGrid, toggleSnap } = useSnapToGrid();
  const { exportPng, exportSvg } = useExport();
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuProps | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [imageDropActive, setImageDropActive] = useState(false);
  const { fitView, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow();

  useViewportPersistence(boardId, reactFlowInstance);

  const { copy, paste } = useClipboard(boardId, refetch);

  // Keyboard shortcut handlers
  const handleDelete = useCallback(async () => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    snapshot('delete selected');
    for (const node of selectedNodes) {
      await api.deleteNode(boardId, node.id);
    }
    for (const edge of selectedEdges) {
      await api.deleteEdge(boardId, edge.id);
    }
    await refetch();
  }, [nodes, edges, boardId, refetch, snapshot]);

  const handleSelectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
  }, [setNodes]);

  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    copy(selectedNodes, edges);
  }, [nodes, edges, copy]);

  const handlePaste = useCallback(async () => {
    snapshot('paste');
    await paste();
  }, [paste, snapshot]);

  const handleGroup = useCallback(async () => {
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length < 2) return;
    snapshot('group nodes');
    await api.createGroup(boardId, 'Group', selectedIds);
    await refetch();
  }, [nodes, boardId, refetch, snapshot]);

  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [dimmedNodeIds, setDimmedNodeIds] = useState<Set<string>>(new Set());
  const dimmedNodeIdsRef = useRef<Set<string>>(new Set());

  const handleFilterNodes = useCallback((dimmed: Set<string>) => {
    dimmedNodeIdsRef.current = dimmed;
    setDimmedNodeIds(dimmed);
  }, []);

  const shortcutHandlers = useMemo(
    () => ({
      onDelete: handleDelete,
      onUndo: undo,
      onRedo: redo,
      onSelectAll: handleSelectAll,
      onCopy: handleCopy,
      onPaste: handlePaste,
      onGroup: handleGroup,
      onToggleSearch: () => setSearchBarOpen((s) => !s),
      onToggleActivityLog: () => setActivityLogOpen((o) => !o),
      onZoomToFit: () => fitView(),
      onZoomIn: () => zoomIn(),
      onZoomOut: () => zoomOut(),
    }),
    [handleDelete, undo, redo, handleSelectAll, handleCopy, handlePaste, handleGroup, fitView, zoomIn, zoomOut],
  );

  useKeyboardShortcuts(shortcutHandlers);

  // Enhance nodes with editing state, callbacks, and search dimming
  const enhancedNodes = useMemo(() => {
    return nodes.map((node) => {
      const isDimmed = dimmedNodeIds.size > 0 && dimmedNodeIds.has(node.id);
      return {
        ...node,
        style: {
          ...node.style,
          ...(isDimmed ? { opacity: 0.2 } : {}),
        },
        data: {
          ...node.data,
          boardId,
          isEditing: node.id === editingNodeId,
          onStartEdit: () => setEditingNodeId(node.id),
          onFinishEdit: async (newLabel: string) => {
            setEditingNodeId(null);
            if (newLabel !== node.data.label) {
              await api.updateNode(boardId, node.id, { label: newLabel });
              refetch();
            }
          },
          onCancelEdit: () => setEditingNodeId(null),
        },
      };
    });
  }, [nodes, editingNodeId, boardId, refetch, dimmedNodeIds]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const hasImage = Array.from(event.dataTransfer.types).includes('Files');
    if (hasImage) {
      event.dataTransfer.dropEffect = 'copy';
      setImageDropActive(true);
    } else {
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setImageDropActive(false);
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setImageDropActive(false);

      // Check for image file drop first
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (imageFile) {
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const ext = imageFile.name.split('.').pop() || 'png';
            try {
              const result = await api.uploadImage(boardId, base64, imageFile.name);
              snapshot('add image via drag');
              await api.createNode(boardId, {
                type: 'image',
                label: imageFile.name,
                x: position.x,
                y: position.y,
                data: { imageUrl: result.url },
              });
              refetch();
            } catch (err) {
              console.error('Image upload failed:', err);
            }
          };
          reader.readAsDataURL(imageFile);
          return;
        }
      }

      const nodeType = event.dataTransfer.getData('application/reactflow-type');
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      snapshot('add node via drag');
      await api.createNode(boardId, {
        type: nodeType,
        label: nodeType,
        x: position.x,
        y: position.y,
      });
      refetch();
    },
    [boardId, refetch, screenToFlowPosition, snapshot],
  );

  // Context menu handlers
  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
      setContextMenu({
        type: 'node',
        position: { x: event.clientX, y: event.clientY },
        nodeId: node.id,
        nodeType: node.type ?? 'rectangle',
        boardId,
        selectedNodeIds: selectedIds.length > 0 ? selectedIds : [node.id],
        onRefetch: refetch,
        onClose: () => setContextMenu(null),
        onStartEdit: (id: string) => setEditingNodeId(id),
      });
    },
    [boardId, nodes, refetch],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        type: 'edge',
        position: { x: event.clientX, y: event.clientY },
        edgeId: edge.id,
        edgeSource: edge.source,
        edgeTarget: edge.target,
        boardId,
        onRefetch: refetch,
        onClose: () => setContextMenu(null),
      });
    },
    [boardId, refetch],
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const flowPos = screenToFlowPosition({
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY,
      });
      setContextMenu({
        type: 'canvas',
        position: { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY },
        flowPosition: flowPos,
        boardId,
        snapEnabled: snapToGrid,
        onRefetch: refetch,
        onClose: () => setContextMenu(null),
        onToggleSnap: toggleSnap,
        onZoomToFit: () => fitView(),
      });
    },
    [boardId, refetch, screenToFlowPosition, snapToGrid, fitView, toggleSnap],
  );

  // Double-click on canvas creates sticky note
  const onPaneDoubleClick = useCallback(
    async (event: React.MouseEvent) => {
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      snapshot('add sticky note');
      await api.createNode(boardId, {
        type: 'sticky',
        label: 'New Note',
        x: flowPos.x,
        y: flowPos.y,
      });
      refetch();
    },
    [boardId, refetch, screenToFlowPosition, snapshot],
  );

  // Double-click on node starts editing
  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setEditingNodeId(node.id);
    },
    [],
  );

  // Connection validation: reject self-loops and duplicate edges
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      // Reject self-loops
      if (connection.source === connection.target) return false;
      // Reject duplicate edges
      const isDuplicate = edges.some(
        (e) => e.source === connection.source && e.target === connection.target,
      );
      return !isDuplicate;
    },
    [edges],
  );

  const onNodeDragStart = useCallback(() => setIsDraggingNode(true), []);
  const onNodeDragStop = useCallback(() => setIsDraggingNode(false), []);

  const selectedNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes]);

  if (loading) {
    return (
      <div className="canvas-loading">
        <LoadingSpinner size={40} label="Loading board..." />
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      <Toolbar
        boardId={boardId}
        boardName={board?.name ?? ''}
        onRefetch={refetch}
        onToggleSnap={toggleSnap}
        snapEnabled={snapToGrid}
        onToggleActivityLog={() => setActivityLogOpen((o) => !o)}
        onZoomToFit={() => fitView()}
        reactFlowInstance={reactFlowInstance}
        onExportPng={() => exportPng(canvasWrapperRef.current)}
        onExportSvg={() => exportSvg(canvasWrapperRef.current)}
      />
      <div ref={canvasWrapperRef} style={{ flex: 1, position: 'relative' }} onDragLeave={onDragLeave}>
        <ReactFlow
          nodes={enhancedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={baseNodeTypes}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode="Shift"
          snapToGrid={snapToGrid}
          snapGrid={snapGrid}
          panActivationKeyCode="Space"
          zoomOnPinch
          onInit={(instance) => {
            setReactFlowInstance(instance);
            instance.fitView();
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onDoubleClick={onPaneDoubleClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          connectionMode={ConnectionMode.Loose}
          isValidConnection={isValidConnection}
          deleteKeyCode={null}
          onPaneClick={() => setContextMenu(null)}
          onNodeClick={() => setContextMenu(null)}
          onEdgeClick={() => setContextMenu(null)}
        >
          <MiniMap />
          <Controls />
          <Background variant={BackgroundVariant.Dots} />
        </ReactFlow>
        <AlignmentGuides enabled={isDraggingNode} />
        {imageDropActive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '3px dashed #2196F3',
              borderRadius: 8,
              backgroundColor: 'rgba(33, 150, 243, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 998,
            }}
          >
            <span style={{ color: '#2196F3', fontSize: 18, fontWeight: 500 }}>
              Drop image here
            </span>
          </div>
        )}
        {!loading && nodes.length === 0 && (
          <div className="canvas-empty-state">
            Drag shapes from the toolbar or let Claude build something
          </div>
        )}
        {contextMenu && <ContextMenu {...contextMenu} />}
        {selectedNodes.length > 0 && (
          <FloatingStyleBar
            selectedNodes={selectedNodes}
            boardId={boardId}
            onRefetch={refetch}
          />
        )}
        {searchBarOpen && (
          <SearchBar
            nodes={nodes}
            onFilterNodes={handleFilterNodes}
            onClose={() => setSearchBarOpen(false)}
            reactFlowInstance={reactFlowInstance}
          />
        )}
      </div>
      {activityLogOpen && (
        <ActivityLogDrawer
          open={activityLogOpen}
          activityLog={board?.activityLog ?? []}
          onClose={() => setActivityLogOpen(false)}
        />
      )}
    </div>
  );
}

export default function CanvasView({ boardId }: CanvasViewProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner boardId={boardId} />
    </ReactFlowProvider>
  );
}
