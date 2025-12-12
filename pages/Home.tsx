import React, { useState } from 'react';
import { useAudio, Song } from '../contexts/AudioContext';
import { analyzeVibeAndSuggest } from '../services/geminiService';
import { AISuggestion } from '../types';
import { Sparkles, PlayCircle, RefreshCw, Music2 } from 'lucide-react';

export const Home: React.FC = () => {
  const { history, library, playSong, setQueue, currentSong } = useAudio();
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const mappedHistory = history.map(s => ({
        ...s,
        addedAt: s.addedAt,
      }));
      const mappedLibrary = library.map(s => ({
        ...s,
        addedAt: s.addedAt,
      }));
      const result = await analyzeVibeAndSuggest(mappedHistory as any, mappedLibrary as any);
      setSuggestion(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const playVibe = () => {
    if (!suggestion || suggestion.suggestedSongIds.length === 0) return;
    
    const songsToPlay = suggestion.suggestedSongIds
      .map(id => library.find(s => s.id === id))
      .filter((s): s is Song => !!s);

    if (songsToPlay.length > 0) {
      playSong(songsToPlay[0]);
      setQueue(songsToPlay.slice(1));
    }
  };

  return (
    <div className="p-4 pt-6 min-h-full flex flex-col">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          Good vibes await
        </h1>
        <p className="text-gray-400 text-sm">Let AI match your energy today.</p>
      </header>

      <div className="glass-panel rounded-2xl p-5 relative overflow-hidden mb-6 border border-white/10 shadow-xl">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-purple-300">
              <Sparkles size={18} />
              <span className="font-semibold tracking-wide text-xs uppercase">AI Vibe Check</span>
            </div>
            {history.length < 1 && (
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Play songs first</span>
            )}
          </div>

          {!suggestion ? (
            <div className="text-center py-4">
              <p className="text-gray-300 text-sm mb-5">
                {history.length > 0 
                  ? "Ready to analyze your recent listening." 
                  : "Listen to a few songs so I can detect your mood."}
              </p>
              <button 
                onClick={handleAnalyze}
                disabled={isLoading || history.length === 0}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition active:scale-[0.98] ${
                  history.length === 0 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/20'
                }`}
              >
                {isLoading ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <span>Analyze Mood</span>
                )}
              </button>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white mb-1">{suggestion.mood}</h2>
                <p className="text-sm text-gray-300 leading-relaxed">{suggestion.reasoning}</p>
              </div>
              
              <button 
                onClick={playVibe}
                className="w-full bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-100 transition active:scale-[0.98]"
              >
                <PlayCircle size={20} />
                <span>Play Vibe Mix</span>
              </button>
              
              <button 
                onClick={handleAnalyze} 
                className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-white flex items-center justify-center space-x-1"
              >
                <RefreshCw size={12} /> <span>Refresh Analysis</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-base font-semibold text-white mb-4">Your Library</h3>
        {library.length === 0 ? (
          <div className="text-center text-gray-500 mt-8 flex flex-col items-center">
            <Music2 size={40} className="opacity-20 mb-3" />
            <p className="text-sm">No songs yet. Add some from Library!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {library.slice(0, 4).map(song => (
              <div 
                key={song.id} 
                onClick={() => playSong(song)}
                className="bg-[#18181b] p-3 rounded-xl cursor-pointer hover:bg-[#27272a] transition active:scale-[0.97] group"
              >
                <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 relative">
                  <img src={song.coverUrl || 'https://picsum.photos/200/200'} className="w-full h-full object-cover" alt={song.title} />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <PlayCircle size={28} className="text-white" fill="black" />
                  </div>
                </div>
                <p className="font-medium text-sm truncate text-white">{song.title}</p>
                <p className="text-xs text-gray-500 truncate">{song.artist}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
