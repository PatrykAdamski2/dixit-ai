import { fetchApi } from './api';

export interface Theme {
  id: string;
  name: string;
  price: number;
  preview: string;
  accent: string;
}

interface ProfileResponse {
  username: string;
  coins: number;
  avatar?: string;
  activeThemeId?: string;
  active_theme_id?: string;
  ownedThemeIds?: string[];
  owned_theme_ids?: string[];
}

export interface UserProfileData {
  username: string;
  coins: number;
  avatar?: string;
  activeThemeId: string;
  ownedThemeIds: string[];
}

function mapProfile(data: ProfileResponse): UserProfileData {
  return {
    username: data.username,
    coins: data.coins,
    avatar: data.avatar,
    activeThemeId: data.activeThemeId ?? data.active_theme_id ?? 'classic',
    ownedThemeIds: data.ownedThemeIds ?? data.owned_theme_ids ?? ['classic'],
  };
}

export async function fetchThemes(): Promise<Theme[]> {
  const data = await fetchApi<{ themes: Theme[] } | Theme[]>('/api/personalization/themes');
  return Array.isArray(data) ? data : data.themes;
}

export async function fetchProfile(): Promise<UserProfileData> {
  const data = await fetchApi<ProfileResponse>('/api/user/profile');
  return mapProfile(data);
}

export async function buyTheme(themeId: string): Promise<{ newBalance: number }> {
  return fetchApi<{ newBalance: number }>('/api/personalization/buy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ themeId }),
  });
}

export async function selectTheme(themeId: string): Promise<void> {
  await fetchApi('/api/personalization/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ themeId }),
  });
}
