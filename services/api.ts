const API_BASE = '/api';

export interface SongData {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  audioUrl?: string;
  audioPath?: string;
  duration: number;
  addedAt: string;
  isFavorite: boolean;
  genre?: string;
  sourceType: 'upload' | 'youtube';
}

export const fetchSongs = async (): Promise<SongData[]> => {
  const res = await fetch(`${API_BASE}/songs`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch songs');
  return res.json();
};

export const createSong = async (song: Partial<SongData>): Promise<SongData> => {
  const res = await fetch(`${API_BASE}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(song),
  });
  if (!res.ok) throw new Error('Failed to create song');
  return res.json();
};

export const toggleFavorite = async (id: string, isFavorite: boolean): Promise<SongData> => {
  const res = await fetch(`${API_BASE}/songs/${id}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ isFavorite }),
  });
  if (!res.ok) throw new Error('Failed to update favorite');
  return res.json();
};

export const deleteSong = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/songs/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete song');
};

export const extractYoutubeAudio = async (url: string): Promise<SongData> => {
  const res = await fetch(`${API_BASE}/youtube/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to extract audio');
  return data;
};

export const checkYoutubeCookies = async (): Promise<{ hasCookies: boolean }> => {
  const res = await fetch(`${API_BASE}/youtube/cookies`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to check cookies');
  return res.json();
};

export const uploadYoutubeCookies = async (cookies: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/youtube/cookies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ cookies }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload cookies');
};

export const deleteYoutubeCookies = async (): Promise<void> => {
  const res = await fetch(`${API_BASE}/youtube/cookies`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete cookies');
};
