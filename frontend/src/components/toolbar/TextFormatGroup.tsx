import React, { useState } from 'react';

interface TextFormatGroupProps {
  fontWeight: string;
  textAlign: string;
  verticalAlign: string;
  link: string | null;
  isAlignOpen: boolean;
  isLinkOpen: boolean;
  onToggleAlign: () => void;
  onToggleLink: () => void;
  onChangeFontWeight: (weight: string) => void;
  onChangeTextAlign: (align: string) => void;
  onChangeVerticalAlign: (align: string) => void;
  onChangeLink: (url: string | null) => void;
}

export default function TextFormatGroup({
  fontWeight, textAlign, verticalAlign, link,
  isAlignOpen, isLinkOpen, onToggleAlign, onToggleLink,
  onChangeFontWeight, onChangeTextAlign, onChangeVerticalAlign, onChangeLink,
}: TextFormatGroupProps) {
  const [linkInput, setLinkInput] = useState(link ?? '');

  return (
    <div className="nft-section nft-text-format">
      <button
        className={`nft-btn ${fontWeight === 'bold' ? 'nft-btn-active' : ''}`}
        onClick={() => onChangeFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
        title="Bold"
      >
        <strong>B</strong>
      </button>

      <button className={`nft-btn ${isAlignOpen ? 'nft-btn-active' : ''}`} onClick={onToggleAlign} title="Text alignment">
        <AlignIcon align={textAlign} />
      </button>
      {isAlignOpen && (
        <div className="nft-dropdown nft-align-dropdown">
          <div className="nft-align-row">
            <span className="nft-align-label">Horizontal</span>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button key={a} className={`nft-btn nft-btn-small ${textAlign === a ? 'nft-btn-active' : ''}`} onClick={() => onChangeTextAlign(a)} title={a}>
                <AlignIcon align={a} />
              </button>
            ))}
          </div>
          <div className="nft-align-row">
            <span className="nft-align-label">Vertical</span>
            {(['top', 'middle', 'bottom'] as const).map((a) => (
              <button key={a} className={`nft-btn nft-btn-small ${verticalAlign === a ? 'nft-btn-active' : ''}`} onClick={() => onChangeVerticalAlign(a)} title={a}>
                <VAlignIcon align={a} />
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        className={`nft-btn ${link ? 'nft-btn-active' : ''} ${isLinkOpen ? 'nft-btn-active' : ''}`}
        onClick={onToggleLink}
        title="Add link"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </button>
      {isLinkOpen && (
        <div className="nft-dropdown nft-link-dropdown">
          <input
            className="nft-link-input"
            type="url"
            placeholder="https://..."
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && linkInput.trim()) {
                onChangeLink(linkInput.trim());
              } else if (e.key === 'Enter' && !linkInput.trim()) {
                onChangeLink(null);
              }
            }}
            autoFocus
          />
          {link && (
            <button className="nft-link-remove" onClick={() => { onChangeLink(null); setLinkInput(''); }}>
              Remove link
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AlignIcon({ align }: { align: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {align === 'left' && <><line x1={3} y1={6} x2={15} y2={6}/><line x1={3} y1={12} x2={21} y2={12}/><line x1={3} y1={18} x2={15} y2={18}/></>}
      {align === 'center' && <><line x1={6} y1={6} x2={18} y2={6}/><line x1={3} y1={12} x2={21} y2={12}/><line x1={6} y1={18} x2={18} y2={18}/></>}
      {align === 'right' && <><line x1={9} y1={6} x2={21} y2={6}/><line x1={3} y1={12} x2={21} y2={12}/><line x1={9} y1={18} x2={21} y2={18}/></>}
    </svg>
  );
}

function VAlignIcon({ align }: { align: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {align === 'top' && <><line x1={3} y1={3} x2={21} y2={3}/><rect x={8} y={6} width={8} height={6} rx={1}/></>}
      {align === 'middle' && <><rect x={8} y={9} width={8} height={6} rx={1}/><line x1={3} y1={3} x2={21} y2={3}/><line x1={3} y1={21} x2={21} y2={21}/></>}
      {align === 'bottom' && <><line x1={3} y1={21} x2={21} y2={21}/><rect x={8} y={12} width={8} height={6} rx={1}/></>}
    </svg>
  );
}
