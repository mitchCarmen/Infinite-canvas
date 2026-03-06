import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
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
import { api } from '../api';
import Toolbar from './Toolbar';
import ContextMenu, { type ContextMenuProps } from './ContextMenu';

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

  const [snapToGrid, setSnapToGrid] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuProps | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const { fitView, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow();

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

  // Enhance nodes with editing state and callbacks via data
  const enhancedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
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
    }));
  }, [nodes, editingNodeId, boardId, refetch]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
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
        onToggleSnap: () => setSnapToGrid((s) => !s),
        onZoomToFit: () => fitView(),
      });
    },
    [boardId, refetch, screenToFlowPosition, snapToGrid, fitView],
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="loading-spinner" />
        <span style={{ marginLeft: 12 }}>Loading board...</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      <Toolbar
        boardId={boardId}
        boardName={board?.name ?? ''}
        onRefetch={refetch}
        onToggleSnap={() => setSnapToGrid((s) => !s)}
        snapEnabled={snapToGrid}
        onToggleActivityLog={() => setActivityLogOpen((o) => !o)}
        onZoomToFit={() => fitView()}
        reactFlowInstance={reactFlowInstance}
      />
      <div style={{ flex: 1, position: 'relative' }}>
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
          snapGrid={[20, 20]}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onDoubleClick={onPaneDoubleClick}
          onNodeDoubleClick={onNodeDoubleClick}
          isValidConnection={isValidConnection}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background variant={BackgroundVariant.Dots} />
        </ReactFlow>
        {!loading && nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#999',
              fontSize: 18,
              pointerEvents: 'none',
            }}
          >
            Drag a shape from the toolbar or double-click to add a sticky note.
          </div>
        )}
        {contextMenu && <ContextMenu {...contextMenu} />}
      </div>
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
