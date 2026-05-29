/**
 * Wspólne wywołania HTTP — credentials dla cookie JWT.
 * fetchOptional: brak endpointu (404) nie jest traktowany jako błąd aplikacji.
 */

export const DEFAULT_LOBBY_SETTINGS = {
  maxPlayers: 4,
  endCondition: 'points' as const,
  endLimit: 30,
};

type FetchOptions = RequestInit & { silent?: boolean };

export async function fetchOptional<T>(url: string, options?: FetchOptions): Promise<T | null> {
  const { silent: _silent, ...init } = options ?? {};
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...init,
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  return fetchOptional<T>(url, options);
}
