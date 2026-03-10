import React from 'react';

interface ClearFormattingProps {
  onClear: () => void;
}

export default function ClearFormatting({ onClear }: ClearFormattingProps) {
  return (
    <button className="nft-btn" onClick={onClear} title="Clear formatting">
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <line x1={4} y1={4} x2={20} y2={20}/>
        <path d="M8 20h8"/>
        <path d="M12 20l4-16"/>
      </svg>
    </button>
  );
}
