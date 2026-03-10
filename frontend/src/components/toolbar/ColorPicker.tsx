import React, { useState } from 'react';

const COLOR_PALETTE = [
  '#ffffff', '#e88a8a', '#e4c55a', '#5bc4a0',
  '#5b8def', '#9b7de8', '#d97bac', '#2e2e38',
];

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  label: string;
}

export default function ColorPicker({ currentColor, onColorChange, label }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState('');

  return (
    <div className="nft-color-picker">
      <div className="nft-color-palette">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            className={`nft-color-swatch ${color === currentColor ? 'nft-color-swatch-active' : ''}`}
            style={{
              backgroundColor: color,
              border: color === '#ffffff' ? '1px solid #555' : '1px solid transparent',
            }}
            onClick={() => onColorChange(color)}
            title={color}
          />
        ))}
      </div>
      <div className="nft-hex-row">
        <input
          className="nft-hex-input"
          type="text"
          placeholder="#hex"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && /^#[0-9a-fA-F]{3,8}$/.test(hexInput)) {
              onColorChange(hexInput);
              setHexInput('');
            }
          }}
        />
      </div>
    </div>
  );
}
