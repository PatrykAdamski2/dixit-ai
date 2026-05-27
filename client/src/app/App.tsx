import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { initSocketListeners, socket } from './services/socket';
import { restoreSessionFromCookie } from './services/session';

export default function App() {
  useEffect(() => {
    initSocketListeners();
    restoreSessionFromCookie();

    return () => {
      socket.disconnect();
    };
  }, []);

  return <RouterProvider router={router} />;
}
