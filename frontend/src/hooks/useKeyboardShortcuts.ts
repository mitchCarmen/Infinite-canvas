import { useEffect } from 'react';

interface ShortcutHandlers {
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onGroup: () => void;
  onToggleSearch: () => void;
  onToggleActivityLog: () => void;
  onZoomToFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onEscape?: () => void;  // optional — not all consumers need it
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return true;
  if ((el as HTMLElement).contentEditable === 'true') return true;
  return false;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape always fires regardless of focus (meta-dismissal key)
      if (event.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      // Skip when typing in form fields
      if (isInputFocused()) return;

      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      // Delete / Backspace
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        handlers.onDelete();
        return;
      }

      if (!ctrlOrMeta) {
        // Non-modifier shortcuts
        if (event.key === '=' || event.key === '+') {
          event.preventDefault();
          handlers.onZoomIn();
          return;
        }
        if (event.key === '-') {
          event.preventDefault();
          handlers.onZoomOut();
          return;
        }
        return;
      }

      // Ctrl/Cmd shortcuts
      switch (event.key.toLowerCase()) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            handlers.onRedo();
          } else {
            handlers.onUndo();
          }
          break;
        case 'a':
          event.preventDefault();
          handlers.onSelectAll();
          break;
        case 'c':
          event.preventDefault();
          handlers.onCopy();
          break;
        case 'v':
          event.preventDefault();
          handlers.onPaste();
          break;
        case 'g':
          event.preventDefault();
          handlers.onGroup();
          break;
        case 'f':
          event.preventDefault();
          handlers.onToggleSearch();
          break;
        case 'l':
          event.preventDefault();
          handlers.onToggleActivityLog();
          break;
        case '0':
          event.preventDefault();
          handlers.onZoomToFit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
