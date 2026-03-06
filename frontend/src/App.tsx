import React, { useEffect, useState } from 'react';
import BoardList from './components/BoardList';
import CanvasView from './components/CanvasView';
import { ToastProvider } from './components/Toast';

function parseHash(): { route: string; boardId?: string } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const boardMatch = hash.match(/^board\/(.+)$/);
  if (boardMatch) {
    return { route: 'board', boardId: boardMatch[1] };
  }
  return { route: 'home' };
}

export default function App() {
  const [routeState, setRouteState] = useState(parseHash);

  useEffect(() => {
    const onHashChange = () => setRouteState(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <ToastProvider>
      {routeState.route === 'board' && routeState.boardId ? (
        <CanvasView boardId={routeState.boardId} />
      ) : (
        <BoardList />
      )}
    </ToastProvider>
  );
}
