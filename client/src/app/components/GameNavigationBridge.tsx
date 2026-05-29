import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { registerGameNavigator } from '../services/gameNavigation';

/** Rejestruje navigate() dla handlerów socket (poza drzewem React Router). */
export function GameNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    registerGameNavigator((path) => navigate(path));
    return () => registerGameNavigator(null);
  }, [navigate]);

  return null;
}
