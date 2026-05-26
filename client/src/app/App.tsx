import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { initSocketListeners, socket } from './services/socket';

export default function App() {
  useEffect(() => {
    // Inicjalizujemy listenery tylko raz
    initSocketListeners();

    // Sprawdzamy, czy powinniśmy się połączyć (np. jeśli sesja jest aktywna).
    // Na razie próbujemy połączyć się od razu; middleware po stronie serwera
    // zajmie się autoryzacją na podstawie ciasteczek.
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return <RouterProvider router={router} />;
}