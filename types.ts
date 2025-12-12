export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  audioUrl?: string;
  duration: number;
  addedAt: number;
  isFavorite: boolean;
  genre?: string;
  sourceType: 'upload' | 'youtube';
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  history: Song[];
  currentTime: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
}

export interface AISuggestion {
  mood: string;
  reasoning: string;
  suggestedSongIds: string[];
}
