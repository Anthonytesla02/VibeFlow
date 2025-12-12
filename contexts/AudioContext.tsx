import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { fetchSongs, toggleFavorite as apiFavorite, deleteSong as apiDelete, SongData } from '../services/api';

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

interface PlayerState {
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

interface AudioContextType extends PlayerState {
  playSong: (song: Song) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  addToQueue: (songs: Song[]) => void;
  refreshLibrary: () => Promise<void>;
  library: Song[];
  toggleLike: (songId: string) => void;
  setQueue: (songs: Song[]) => void;
  removeSong: (songId: string) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const mapSongData = (data: SongData): Song => ({
  id: data.id,
  title: data.title,
  artist: data.artist,
  album: data.album,
  coverUrl: data.coverUrl,
  audioUrl: data.audioUrl,
  duration: data.duration,
  addedAt: new Date(data.addedAt).getTime(),
  isFavorite: data.isFavorite,
  genre: data.genre,
  sourceType: data.sourceType,
});

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [library, setLibrary] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueueState] = useState<Song[]>([]);
  const [history, setHistory] = useState<Song[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  const audioRef = useRef<HTMLAudioElement>(new Audio());

  const refreshLibrary = useCallback(async () => {
    try {
      const songs = await fetchSongs();
      const mappedSongs = songs.map(mapSongData);
      mappedSongs.sort((a, b) => b.addedAt - a.addedAt);
      setLibrary(mappedSongs);
    } catch (e) {
      console.error("Failed to load library", e);
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    const audio = audioRef.current;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => playNext();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [queue, currentSong, repeatMode]);

  const playSong = useCallback((song: Song) => {
    if (currentSong) {
      setHistory(prev => [...prev, currentSong]);
    }
    setCurrentSong(song);
    setIsPlaying(true);
    
    if (audioRef.current.src !== song.audioUrl) {
      audioRef.current.src = song.audioUrl || '';
      audioRef.current.play().catch(e => console.error("Play error", e));
    } else {
      audioRef.current.play();
    }
  }, [currentSong]);

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [currentSong, isPlaying]);

  const playNext = useCallback(() => {
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueueState(rest);
      playSong(next);
    } else if (repeatMode === 'all' && library.length > 0) {
      const nextIndex = (library.findIndex(s => s.id === currentSong?.id) + 1) % library.length;
      playSong(library[nextIndex]);
    } else {
      setIsPlaying(false);
      setCurrentSong(null);
    }
  }, [queue, library, currentSong, repeatMode, playSong]);

  const playPrevious = useCallback(() => {
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(prevHist => prevHist.slice(0, -1));
      playSong(prev);
    }
  }, [history, playSong]);

  const seek = useCallback((time: number) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const addToQueue = useCallback((songs: Song[]) => {
    setQueueState(prev => [...prev, ...songs]);
  }, []);

  const setQueue = useCallback((songs: Song[]) => {
    setQueueState(songs);
  }, []);

  const toggleLike = useCallback(async (songId: string) => {
    const song = library.find(s => s.id === songId);
    if (song) {
      const newVal = !song.isFavorite;
      try {
        await apiFavorite(songId, newVal);
        await refreshLibrary();
        if (currentSong?.id === songId) {
          setCurrentSong({...currentSong, isFavorite: newVal});
        }
      } catch (e) {
        console.error("Failed to toggle favorite", e);
      }
    }
  }, [library, refreshLibrary, currentSong]);

  const removeSong = useCallback(async (songId: string) => {
    try {
      await apiDelete(songId);
      await refreshLibrary();
      if (currentSong?.id === songId) {
        setCurrentSong(null);
        setIsPlaying(false);
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    } catch (e) {
      console.error("Failed to delete song", e);
    }
  }, [refreshLibrary, currentSong]);

  return (
    <AudioContext.Provider value={{
      library, currentSong, isPlaying, queue, history, currentTime, duration, volume, isShuffle, repeatMode,
      playSong, togglePlay, playNext, playPrevious, seek, addToQueue, refreshLibrary, toggleLike, setQueue, removeSong
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within AudioProvider");
  return context;
};
