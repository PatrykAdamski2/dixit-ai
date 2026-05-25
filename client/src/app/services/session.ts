import { useGameStore } from '../store/useGameStore';
import { socket } from './socket';

export interface AuthMeResponse {
  username: string;
  id: string;
}

/** Profil z /api/auth/me — bez monet (backend ich nie zwraca). */
export async function restoreSessionFromCookie(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (!response.ok) {
      return false;
    }
    const data = (await response.json()) as AuthMeResponse;
    const initials = (data.username || '?').slice(0, 2).toUpperCase();
    useGameStore.getState().setUser({
      username: data.username,
      coins: 0,
      avatar: initials,
    });
    if (!socket.connected) {
      socket.connect();
    }
    return true;
  } catch {
    return false;
  }
}

export function connectSocketAfterLogin(username: string) {
  const { user, setUser } = useGameStore.getState();
  const initials = username.slice(0, 2).toUpperCase();
  setUser({
    username,
    coins: user?.coins ?? 0,
    avatar: initials,
  });
  if (!socket.connected) {
    socket.connect();
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    // offline — i tak czyścimy stan lokalny
  }
  const { resetGame, setUser } = useGameStore.getState();
  resetGame();
  setUser(null);
  if (socket.connected) {
    socket.disconnect();
  }
}
