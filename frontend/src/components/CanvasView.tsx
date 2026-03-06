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
  } = useBoard(boardId);

  const [snapToGrid, setSnapToGrid] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuProps | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const { fitView, screenToFlowPosition } = useReactFlow();

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

      await api.createNode(boardId, {
        type: nodeType,
        label: nodeType,
        x: position.x,
        y: position.y,
      });
      refetch();
    },
    [boardId, refetch, screenToFlowPosition],
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
      await api.createNode(boardId, {
        type: 'sticky',
        label: 'New Note',
        x: flowPos.x,
        y: flowPos.y,
      });
      refetch();
    },
    [boardId, refetch, screenToFlowPosition],
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
