import { useState, useCallback, useRef, useEffect } from 'react';

interface NodeEditData {
  label?: unknown;
  nodeId?: unknown;
  isEditing?: unknown;
  onStartEdit?: unknown;
  onFinishEdit?: unknown;
  onCancelEdit?: unknown;
}

export function useNodeEdit(data: NodeEditData) {
  const isEditing = data.isEditing === true;
  const label = (data.label as string) ?? '';
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(label);
      // Focus after render
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing, label]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const onFinishEdit = data.onFinishEdit as ((nodeId: string, label: string, oldLabel: string) => void) | undefined;
        onFinishEdit?.(data.nodeId as string, editValue.trim() || label, label);
      } else if (e.key === 'Escape') {
        const onCancelEdit = data.onCancelEdit as (() => void) | undefined;
        onCancelEdit?.();
      }
    },
    [data.onFinishEdit, data.onCancelEdit, data.nodeId, editValue, label],
  );

  const handleBlur = useCallback(() => {
    const onFinishEdit = data.onFinishEdit as ((nodeId: string, label: string, oldLabel: string) => void) | undefined;
    onFinishEdit?.(data.nodeId as string, editValue.trim() || label, label);
  }, [data.onFinishEdit, data.nodeId, editValue, label]);

  return {
    isEditing,
    label,
    editValue,
    setEditValue,
    inputRef,
    handleKeyDown,
    handleBlur,
  };
}
