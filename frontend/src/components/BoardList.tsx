import React, { useEffect, useState } from 'react';
import { api } from '../api';
import ConfirmDialog from './ConfirmDialog';

interface Board {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
  nodeCount?: number;
  thumbnail?: string;
}

export default function BoardList() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listBoards();
      setBoards(Array.isArray(data) ? data : data.boards ?? []);
    } catch (err) {
      setError('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await api.createBoard(newName.trim(), newDescription.trim() || undefined);
      setNewName('');
      setNewDescription('');
      setShowCreate(false);
      fetchBoards();
    } catch {
      setError('Failed to create board');
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const confirmDeleteBoard = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteBoard(confirmDelete.id);
      fetchBoards();
    } catch {
      setError('Failed to delete board');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.duplicateBoard(id);
      fetchBoards();
    } catch {
      setError('Failed to duplicate board');
    }
  };

  const navigateToBoard = (id: string) => {
    window.location.hash = `/board/${id}`;
  };

  if (loading) {
    return <div className="board-list-loading">Loading boards...</div>;
  }

  return (
    <div className="board-list-container">
      <header className="board-list-header">
        <h1>InfiniteCanvas</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Create Board
        </button>
      </header>

      {error && <div className="board-list-error">{error}</div>}

      {showCreate && (
        <div className="create-board-form">
          <input
            type="text"
            placeholder="Board name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <div className="create-board-actions">
            <button className="btn btn-primary" onClick={handleCreate}>
              Create
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowCreate(false);
                setNewName('');
                setNewDescription('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {boards.length === 0 && !showCreate ? (
        <div className="board-list-empty">
          <p>No boards yet.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            Create your first board
          </button>
        </div>
      ) : (
        <div className="board-grid">
          {boards.map(board => (
            <div
              key={board.id}
              className="board-card"
              onClick={() => navigateToBoard(board.id)}
            >
              <div className="board-card-thumbnail">
                {board.thumbnail ? (
                  <img
                    src={board.thumbnail}
                    alt={board.name}
                    className="board-card-thumbnail-img"
                  />
                ) : (
                  <span className="board-card-thumbnail-placeholder">{board.name}</span>
                )}
              </div>
              <div className="board-card-info">
                <h3>{board.name}</h3>
                {board.description && (
                  <p className="board-card-desc">{board.description}</p>
                )}
                <span className="board-card-meta">
                  Updated {new Date(board.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="board-card-actions">
                <button
                  className="btn btn-small"
                  onClick={e => {
                    e.stopPropagation();
                    handleDuplicate(board.id);
                  }}
                  title="Duplicate"
                >
                  Duplicate
                </button>
                <button
                  className="btn btn-small btn-danger"
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(board.id, board.name);
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        message={confirmDelete ? `Delete board "${confirmDelete.name}"? This cannot be undone.` : ''}
        onConfirm={confirmDeleteBoard}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
