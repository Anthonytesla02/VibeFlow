import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Song, PlayerState } from '../types';
import { musicDB } from '../services/db';

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
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

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
      const songs = await musicDB.getAllSongs();
      setLibrary(songs);
    } catch (e) {
      console.error("Failed to load library", e);
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  // Audio Event Listeners
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
  }, [queue, currentSong, repeatMode]); // Re-bind if dependencies change logic

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
       // Simple loop of library if queue empty
       // In a real app we might cycle library or history
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
      // Put current back in queue front? No, just play prev
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
        await musicDB.toggleFavorite(songId, newVal);
        refreshLibrary();
        if (currentSong?.id === songId) {
            setCurrentSong({...currentSong, isFavorite: newVal});
        }
    }
  }, [library, refreshLibrary, currentSong]);

  return (
    <AudioContext.Provider value={{
      library, currentSong, isPlaying, queue, history, currentTime, duration, volume, isShuffle, repeatMode,
      playSong, togglePlay, playNext, playPrevious, seek, addToQueue, refreshLibrary, toggleLike, setQueue
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
