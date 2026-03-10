import React, { lazy, Suspense } from 'react';

const Picker = lazy(() => import('@emoji-mart/react'));

interface EmojiPickerProps {
  currentEmoji: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectEmoji: (emoji: string | null) => void;
}

export default function EmojiPicker({ currentEmoji, isOpen, onToggle, onSelectEmoji }: EmojiPickerProps) {
  const handleSelect = (emojiData: any) => {
    const native = emojiData.native as string;
    if (native === currentEmoji) {
      onSelectEmoji(null);
    } else {
      onSelectEmoji(native);
    }
  };

  return (
    <div className="nft-section">
      <button className={`nft-btn ${isOpen ? 'nft-btn-active' : ''}`} onClick={onToggle} title="Add emoji">
        {currentEmoji ?? '😀'}
      </button>
      {isOpen && (
        <div className="nft-dropdown nft-emoji-dropdown">
          <Suspense fallback={<div className="nft-emoji-loading">Loading...</div>}>
            <Picker
              data={undefined}
              onEmojiSelect={handleSelect}
              theme="dark"
              previewPosition="none"
              skinTonePosition="none"
              set="native"
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
