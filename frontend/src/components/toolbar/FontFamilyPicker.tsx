import React from 'react';
import { SYSTEM_FONTS, GOOGLE_FONTS, loadGoogleFont } from '../../utils/googleFonts';

interface FontFamilyPickerProps {
  currentFont: string;
  isOpen: boolean;
  onToggle: () => void;
  onChangeFont: (font: string) => void;
}

export default function FontFamilyPicker({ currentFont, isOpen, onToggle, onChangeFont }: FontFamilyPickerProps) {
  const handleSelect = (font: string) => {
    if (GOOGLE_FONTS.includes(font)) loadGoogleFont(font);
    onChangeFont(font);
  };

  return (
    <div className="nft-section">
      <button className={`nft-btn nft-font-btn ${isOpen ? 'nft-btn-active' : ''}`} onClick={onToggle} title="Font family">
        <span className="nft-font-label">{currentFont === '—' ? '—' : currentFont}</span>
      </button>
      {isOpen && (
        <div className="nft-dropdown nft-font-dropdown">
          <div className="nft-font-group-label">System</div>
          {SYSTEM_FONTS.map((font) => (
            <button key={font} className={`nft-font-option ${font === currentFont ? 'nft-font-option-active' : ''}`} style={{ fontFamily: font }} onClick={() => handleSelect(font)}>
              {font}
            </button>
          ))}
          <div className="nft-font-group-label">Google Fonts</div>
          {GOOGLE_FONTS.map((font) => (
            <button key={font} className={`nft-font-option ${font === currentFont ? 'nft-font-option-active' : ''}`} style={{ fontFamily: font }} onClick={() => handleSelect(font)} onMouseEnter={() => loadGoogleFont(font)}>
              {font}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
