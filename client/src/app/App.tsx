import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { initSocketListeners, socket } from './services/socket';

export default function App() {
  useEffect(() => {
    // Initialize listeners once
    initSocketListeners();

    // Check if we should connect (e.g., if there's a session)
    // For now, we attempt to connect; the server-side io.use middleware
    // will handle authentication via cookies.
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return <RouterProvider router={router} />;
}