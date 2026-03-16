import React from 'react';

interface NodeBadgesProps {
  link: string | null;
  emoji: string | null;
  locked: boolean;
}

const NodeBadges = React.memo(function NodeBadges({ link, emoji, locked }: NodeBadgesProps) {
  return (
    <>
      {emoji && (
        <span className="node-badge node-badge-emoji" onClick={(e) => e.stopPropagation()}>
          {emoji}
        </span>
      )}
      {link && (
        <a
          className="node-badge node-badge-link"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={link}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1={10} y1={14} x2={21} y2={3}/>
          </svg>
        </a>
      )}
      {locked && (
        <div className="node-lock-overlay">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x={3} y={11} width={18} height={11} rx={2}/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
      )}
    </>
  );
});

export default NodeBadges;
