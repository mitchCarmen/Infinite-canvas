import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Node, ReactFlowInstance } from '@xyflow/react';

interface SearchBarProps {
  nodes: Node[];
  onFilterNodes: (dimmedIds: Set<string>) => void;
  onClose: () => void;
  reactFlowInstance: ReactFlowInstance | null;
}

export default function SearchBar({ nodes, onFilterNodes, onClose, reactFlowInstance }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getMatches = useCallback(
    (q: string): Node[] => {
      if (!q.trim()) return [];
      const lower = q.toLowerCase();
      return nodes.filter((n) => {
        const label = String(n.data?.label ?? '').toLowerCase();
        return label.includes(lower);
      });
    },
    [nodes],
  );

  const [matches, setMatches] = useState<Node[]>([]);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced filtering
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const m = getMatches(query);
      setMatches(m);
      setMatchIndex(0);

      if (!query.trim()) {
        onFilterNodes(new Set());
      } else {
        const matchIds = new Set(m.map((n) => n.id));
        const dimmed = new Set(nodes.filter((n) => !matchIds.has(n.id)).map((n) => n.id));
        onFilterNodes(dimmed);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, nodes, getMatches, onFilterNodes]);

  const cycleMatch = useCallback(() => {
    if (matches.length === 0) return;
    const current = matches[matchIndex % matches.length];
    if (current && reactFlowInstance) {
      reactFlowInstance.fitView({ nodes: [current], padding: 0.5, duration: 300 });
    }
    setMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches, matchIndex, reactFlowInstance]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onFilterNodes(new Set());
      onClose();
    } else if (e.key === 'Enter') {
      cycleMatch();
    }
  };

  const displayIndex = matches.length > 0 ? (matchIndex % matches.length) + 1 : 0;

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        className="search-bar-input"
        type="text"
        placeholder="Search nodes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className="search-bar-count">
        {query.trim() ? `${displayIndex}/${matches.length} matches` : ''}
      </span>
      <button className="search-bar-close" onClick={() => { onFilterNodes(new Set()); onClose(); }}>
        Esc
      </button>
    </div>
  );
}
