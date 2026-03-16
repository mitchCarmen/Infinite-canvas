import type { NodeProps } from '@xyflow/react';

/**
 * Custom comparator for React.memo on node components.
 * IGNORE-list approach: callbacks and transient internal props are skipped,
 * all other data keys are compared by reference (===).
 *
 * Maintenance contract:
 * - New VISUAL data fields are compared automatically (safe by default).
 * - New INTERNAL/CALLBACK fields must be added to IGNORED_DATA_KEYS,
 *   otherwise they cause unnecessary re-renders (not stale UI).
 */
const IGNORED_DATA_KEYS = new Set([
  'onStartEdit', 'onFinishEdit', 'onCancelEdit',  // callbacks
  'boardId', 'nodeId',                              // transient/internal
]);

export function areNodePropsEqual(prev: NodeProps, next: NodeProps): boolean {
  if (prev.selected !== next.selected) return false;

  const p = prev.data as Record<string, unknown>;
  const n = next.data as Record<string, unknown>;

  const allKeys = new Set([...Object.keys(p), ...Object.keys(n)]);
  for (const key of allKeys) {
    if (IGNORED_DATA_KEYS.has(key)) continue;
    if (p[key] !== n[key]) return false;
  }
  return true;
}
