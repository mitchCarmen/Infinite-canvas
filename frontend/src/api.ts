const BASE = '/api';

export const api = {
  listBoards: () => fetch(`${BASE}/boards`).then(r => r.json()),
  createBoard: (name: string, description?: string) =>
    fetch(`${BASE}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    }).then(r => r.json()),
  readBoard: (id: string) => fetch(`${BASE}/boards/${id}`).then(r => r.json()),
  deleteBoard: (id: string) => fetch(`${BASE}/boards/${id}`, { method: 'DELETE' }),
  duplicateBoard: (id: string, newName?: string) =>
    fetch(`${BASE}/boards/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName }),
    }).then(r => r.json()),
  createNode: (boardId: string, data: any) =>
    fetch(`${BASE}/boards/${boardId}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  updateNode: (boardId: string, nodeId: string, data: any) =>
    fetch(`${BASE}/boards/${boardId}/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  bulkUpdateNodes: (boardId: string, updates: any[]) =>
    fetch(`${BASE}/boards/${boardId}/nodes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    }).then(r => r.json()),
  deleteNode: (boardId: string, nodeId: string) =>
    fetch(`${BASE}/boards/${boardId}/nodes/${nodeId}`, { method: 'DELETE' }).then(r => r.json()),
  reorderNode: (boardId: string, nodeId: string, action: string) =>
    fetch(`${BASE}/boards/${boardId}/nodes/${nodeId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).then(r => r.json()),
  createEdge: (boardId: string, source: string, target: string, label?: string) =>
    fetch(`${BASE}/boards/${boardId}/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target, label }),
    }).then(r => r.json()),
  updateEdge: (boardId: string, edgeId: string, data: any) =>
    fetch(`${BASE}/boards/${boardId}/edges/${edgeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  deleteEdge: (boardId: string, edgeId: string) =>
    fetch(`${BASE}/boards/${boardId}/edges/${edgeId}`, { method: 'DELETE' }).then(r => r.json()),
  createGroup: (boardId: string, label: string, nodeIds: string[]) =>
    fetch(`${BASE}/boards/${boardId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, nodeIds }),
    }).then(r => r.json()),
  importMermaid: (boardId: string, mermaidSyntax: string) =>
    fetch(`${BASE}/boards/${boardId}/import-mermaid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mermaidSyntax }),
    }).then(r => r.json()),
  autoLayout: (boardId: string, direction?: string) =>
    fetch(`${BASE}/boards/${boardId}/auto-layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    }).then(r => r.json()),
  exportBoard: (boardId: string, format: string) =>
    fetch(`${BASE}/boards/${boardId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    }).then(r => r.json()),
  updateBoardMetadata: (boardId: string, data: any) =>
    fetch(`${BASE}/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
};
