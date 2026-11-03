import type { Board, CanvasNode, CanvasEdge } from '@shared/types';

const BASE = '/api';

async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  listBoards: () => request(`/boards`),
  createBoard: (name: string, description?: string) =>
    request(`/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    }),
  readBoard: (id: string) => request(`/boards/${id}`),
  deleteBoard: (id: string) => request(`/boards/${id}`, { method: 'DELETE' }),
  duplicateBoard: (id: string, newName?: string) =>
    request(`/boards/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName }),
    }),
  createNode: (boardId: string, data: any) =>
    request(`/boards/${boardId}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateNode: (boardId: string, nodeId: string, data: any) =>
    request(`/boards/${boardId}/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  bulkUpdateNodes: (boardId: string, updates: any[]) =>
    request(`/boards/${boardId}/nodes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    }),
  deleteNode: (boardId: string, nodeId: string) =>
    request(`/boards/${boardId}/nodes/${nodeId}`, { method: 'DELETE' }),
  reorderNode: (boardId: string, nodeId: string, action: string) =>
    request(`/boards/${boardId}/nodes/${nodeId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }),
  createEdge: (boardId: string, source: string, target: string, label?: string, sourceHandle?: string, targetHandle?: string) =>
    request(`/boards/${boardId}/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target, label, sourceHandle, targetHandle }),
    }),
  updateEdge: (boardId: string, edgeId: string, data: any) =>
    request(`/boards/${boardId}/edges/${edgeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  replaceGraph: (boardId: string, nodes: CanvasNode[], edges: CanvasEdge[]) =>
    request<Board>(`/boards/${boardId}/graph`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    }),
  deleteEdge: (boardId: string, edgeId: string) =>
    request(`/boards/${boardId}/edges/${edgeId}`, { method: 'DELETE' }),
  createGroup: (boardId: string, label: string, nodeIds: string[]) =>
    request(`/boards/${boardId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, nodeIds }),
    }),
  importMermaid: (boardId: string, mermaidSyntax: string) =>
    request(`/boards/${boardId}/import-mermaid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mermaidSyntax }),
    }),
  autoLayout: (boardId: string, direction?: string) =>
    request(`/boards/${boardId}/auto-layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    }),
  exportBoard: (boardId: string, format: string) =>
    request(`/boards/${boardId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    }),
  updateBoardMetadata: (boardId: string, data: any) =>
    request(`/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  uploadImage: (boardId: string, imageData: string, filename: string) =>
    request(`/boards/${boardId}/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, filename }),
    }),
};
