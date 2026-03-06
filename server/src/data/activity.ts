import { v4 as uuid } from 'uuid';
import type { ActivityEntry } from '../../../shared/types.js';

export function createActivity(
  actor: 'user' | 'claude',
  action: string,
  summary: string,
  details?: Record<string, unknown>,
): ActivityEntry {
  return {
    id: uuid(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    summary,
    details,
  };
}
