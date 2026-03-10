import React from 'react';

const SIZE_STEPS = [8, 10, 12, 14, 18, 24, 32, 48, 64, 72];

interface FontSizePickerProps {
  currentSize: string;
  onChangeSize: (size: string) => void;
}

export default function FontSizePicker({ currentSize, onChangeSize }: FontSizePickerProps) {
  const numericSize = parseInt(currentSize, 10) || 14;
  const currentIdx = SIZE_STEPS.indexOf(numericSize);

  const decrement = () => {
    const idx = currentIdx > 0 ? currentIdx - 1 : SIZE_STEPS.findIndex(s => s < numericSize);
    const newSize = idx >= 0 ? SIZE_STEPS[idx] : SIZE_STEPS[0];
    onChangeSize(`${newSize}px`);
  };

  const increment = () => {
    if (currentIdx >= 0 && currentIdx < SIZE_STEPS.length - 1) {
      onChangeSize(`${SIZE_STEPS[currentIdx + 1]}px`);
    } else {
      const next = SIZE_STEPS.find(s => s > numericSize);
      if (next) onChangeSize(`${next}px`);
    }
  };

  return (
    <div className="nft-section nft-size-picker">
      <button className="nft-btn nft-btn-small" onClick={decrement} title="Decrease font size">−</button>
      <span className="nft-size-display">{currentSize === '—' ? '—' : numericSize}</span>
      <button className="nft-btn nft-btn-small" onClick={increment} title="Increase font size">+</button>
    </div>
  );
}
