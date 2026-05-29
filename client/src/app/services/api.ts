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

export async function fetchApi<T = unknown>(url: string, options?: FetchOptions): Promise<T> {
  const { silent, ...init } = options ?? {};
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
  });
  if (!response.ok) {
    if (!silent) {
      throw new Error(`HTTP ${response.status}`);
    }
    throw new Error('silent');
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function fetchOptional<T>(url: string, options?: FetchOptions): Promise<T | null> {
  const { silent: _silent, ...init } = options ?? {};
  try {
    return await fetchApi<T>(url, init);
  } catch {
    return null;
  }
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  return fetchOptional<T>(url, options);
}

/** Własne karty użytkownika (GET/POST /api/cards/*) */
export interface UserCard {
  id: string;
  image_url: string;
  tags?: string[] | null;
  created_at?: string;
}

export async function fetchMyCards(): Promise<UserCard[]> {
  return fetchApi<UserCard[]>('/api/cards/mine');
}

export async function uploadCard(image: File, tags: string[]): Promise<UserCard> {
  const form = new FormData();
  form.append('image', image);
  if (tags.length) {
    form.append('tags', JSON.stringify(tags));
  }
  return fetchApi<UserCard>('/api/cards/upload', {
    method: 'POST',
    body: form,
  });
}

export async function saveCanvasCard(imageBase64: string, tags: string[]): Promise<UserCard> {
  return fetchApi<UserCard>('/api/cards/canvas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64, tags }),
  });
}
