import React from 'react';

interface LockToggleProps {
  isLocked: boolean;
  onToggle: () => void;
}

export default function LockToggle({ isLocked, onToggle }: LockToggleProps) {
  return (
    <button
      className={`nft-btn ${isLocked ? 'nft-btn-active' : ''}`}
      onClick={onToggle}
      title={isLocked ? 'Unlock' : 'Lock'}
    >
      {isLocked ? (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x={3} y={11} width={18} height={11} rx={2}/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ) : (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x={3} y={11} width={18} height={11} rx={2}/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      )}
    </button>
  );
}
