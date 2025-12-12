import React from 'react';
import { useAudio } from '../contexts/AudioContext';
import { Play, Pause, SkipBack, SkipForward, Heart, Repeat, Shuffle, Disc } from 'lucide-react';

export const Player: React.FC = () => {
  const { 
    currentSong, isPlaying, togglePlay, playNext, playPrevious, 
    currentTime, duration, seek, toggleLike 
  } = useAudio();

  if (!currentSong) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 p-8 text-center">
        <div>
          <DiscIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>No song playing. Go to Library to start.</p>
        </div>
      </div>
    );
  }

  const formatTime = (t: number) => {
    if (isNaN(t)) return "0:00";
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  return (
    <div className="h-full flex flex-col p-6 pt-12 relative overflow-hidden bg-gradient-to-b from-gray-900 to-black">
      {/* Background Blur */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none z-0"
        style={{
            backgroundImage: `url(${currentSong.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px)',
            transform: 'scale(1.2)'
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        {/* Album Art */}
        <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden album-art-shadow mb-10 border border-white/10">
            <img 
                src={currentSong.coverUrl || 'https://picsum.photos/300/300'} 
                alt="Album Art" 
                className="w-full h-full object-cover"
            />
        </div>

        {/* Info */}
        <div className="w-full max-w-sm mb-8 flex items-center justify-between">
            <div className="overflow-hidden">
                <h1 className="text-2xl font-bold text-white truncate leading-tight mb-1">{currentSong.title}</h1>
                <p className="text-gray-400 text-lg truncate">{currentSong.artist}</p>
            </div>
            <button 
                onClick={() => toggleLike(currentSong.id)}
                className={`${currentSong.isFavorite ? 'text-green-500' : 'text-gray-500'} transition-colors p-2`}
            >
                <Heart fill={currentSong.isFavorite ? "currentColor" : "none"} />
            </button>
        </div>

        {/* Progress */}
        <div className="w-full max-w-sm mb-6">
            <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                value={currentTime} 
                onChange={handleSeek}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500 hover:accent-green-400"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-sm flex items-center justify-between">
            <button className="text-gray-500 hover:text-white transition p-2">
                <Shuffle size={20} />
            </button>
            <button onClick={playPrevious} className="text-white hover:text-green-400 transition p-2">
                <SkipBack size={32} fill="currentColor" />
            </button>
            <button 
                onClick={togglePlay} 
                className="bg-green-500 text-black rounded-full p-4 hover:scale-105 transition active:scale-95 shadow-lg shadow-green-500/20"
            >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1"/>}
            </button>
            <button onClick={playNext} className="text-white hover:text-green-400 transition p-2">
                <SkipForward size={32} fill="currentColor" />
            </button>
             <button className="text-gray-500 hover:text-white transition p-2">
                <Repeat size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

const DiscIcon = (props: any) => <Disc {...props} />
