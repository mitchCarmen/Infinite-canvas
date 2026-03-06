import React, { useCallback, useState } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { useBoard } from '../hooks/useBoard';
import { api } from '../api';
import Toolbar from './Toolbar';

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
  const { fitView, screenToFlowPosition } = useReactFlow();

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
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode="Shift"
          snapToGrid={snapToGrid}
          snapGrid={[20, 20]}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
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
            Drag a shape from the toolbar to get started.
          </div>
        )}
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
