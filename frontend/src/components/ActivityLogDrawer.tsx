import React, { useEffect, useRef } from 'react';
import type { ActivityEntry } from '@shared/types';

interface ActivityLogDrawerProps {
  open: boolean;
  activityLog: ActivityEntry[];
  onClose: () => void;
}

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function ActivityLogDrawer({ open, activityLog, onClose }: ActivityLogDrawerProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top on new entries
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [open, activityLog.length]);

  if (!open) return null;

  const sorted = [...activityLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="activity-log-drawer">
      <div className="activity-log-header">
        <span className="activity-log-title">Activity Log</span>
        <button className="activity-log-close" onClick={onClose}>
          X
        </button>
      </div>
      <div className="activity-log-list" ref={listRef}>
        {sorted.length === 0 && (
          <div className="activity-log-empty">No activity yet.</div>
        )}
        {sorted.map((entry) => (
          <div key={entry.id} className="activity-log-entry">
            <div className="activity-log-entry-top">
              <span
                className={`activity-log-actor-badge ${
                  entry.actor === 'claude' ? 'actor-claude' : 'actor-user'
                }`}
              >
                {entry.actor}
              </span>
              <span className="activity-log-timestamp">{relativeTime(entry.timestamp)}</span>
            </div>
            <div className="activity-log-summary">{entry.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
