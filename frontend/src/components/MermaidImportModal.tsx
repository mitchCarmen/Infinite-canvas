import React, { useState } from 'react';
import { api } from '../api';

interface MermaidImportModalProps {
  boardId: string;
  onClose: () => void;
  onRefetch: () => void;
}

export default function MermaidImportModal({ boardId, onClose, onRefetch }: MermaidImportModalProps) {
  const [syntax, setSyntax] = useState('');
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!syntax.trim()) return;
    setImporting(true);
    setError(null);
    setWarnings([]);
    try {
      const result = await api.importMermaid(boardId, syntax);
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }
      onRefetch();
      if (!result.warnings || result.warnings.length === 0) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 12 }}>Import Mermaid Diagram</h3>
        <textarea
          className="modal-textarea"
          value={syntax}
          onChange={(e) => setSyntax(e.target.value)}
          placeholder={'graph TD\n  A[Start] --> B[End]'}
          rows={12}
          autoFocus
        />
        {error && <div className="modal-error">{error}</div>}
        {warnings.length > 0 && (
          <div className="modal-warnings">
            <strong>Warnings:</strong>
            <ul>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={importing}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleImport} disabled={importing || !syntax.trim()}>
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
