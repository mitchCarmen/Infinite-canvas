import React, { useEffect, useState } from 'react';
import BoardList from './components/BoardList';

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

  if (routeState.route === 'board' && routeState.boardId) {
    return (
      <div className="canvas-placeholder">
        <a href="#/" className="back-link">Back to boards</a>
        <p>Canvas for board {routeState.boardId}</p>
      </div>
    );
  }

  return <BoardList />;
}
