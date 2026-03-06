import React from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { useBoard } from '../hooks/useBoard';

interface CanvasViewProps {
  boardId: string;
}

export default function CanvasView({ boardId }: CanvasViewProps) {
  const {
    nodes,
    edges,
    board,
    onNodesChange,
    onEdgesChange,
    onConnect,
    loading,
  } = useBoard(boardId);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="loading-spinner" />
        <span style={{ marginLeft: 12 }}>Loading board...</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="#/" style={{ textDecoration: 'none', color: '#555' }}>
          &larr; Back to boards
        </a>
        {board && <span style={{ fontWeight: 600 }}>{board.name}</span>}
      </div>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode="Shift"
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
            Empty board. Add nodes to get started.
          </div>
        )}
      </div>
    </div>
  );
}
