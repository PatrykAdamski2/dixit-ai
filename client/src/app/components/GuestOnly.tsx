import React from 'react';
import { Navigate } from 'react-router';
import { useGameStore } from '../store/useGameStore';

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const user = useGameStore((s) => s.user);
  if (user) {
    return <Navigate to="/menu" replace />;
  }
  return <>{children}</>;
}
