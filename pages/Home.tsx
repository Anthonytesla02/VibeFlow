import React, { useState } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { analyzeVibeAndSuggest } from '../services/geminiService';
import { AISuggestion, Song } from '../types';
import { Sparkles, PlayCircle, RefreshCw, AudioWaveform, Music2 } from 'lucide-react';

export const Home: React.FC = () => {
  const { history, library, playSong, setQueue, currentSong } = useAudio();
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      // Analyze
      const result = await analyzeVibeAndSuggest(history, library);
      setSuggestion(result);
      
      // If songs suggested, automatically queue them up if user wants
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const playVibe = () => {
    if (!suggestion || suggestion.suggestedSongIds.length === 0) return;
    
    // Find song objects
    const songsToPlay = suggestion.suggestedSongIds
      .map(id => library.find(s => s.id === id))
      .filter((s): s is Song => !!s);

    if (songsToPlay.length > 0) {
      playSong(songsToPlay[0]);
      setQueue(songsToPlay.slice(1));
    }
  };

  return (
    <div className="p-4 pt-10 min-h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
            Hello, User
        </h1>
        <p className="text-gray-400 text-sm">Let AI match your energy today.</p>
      </header>

      {/* Vibe Card */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden mb-8 border border-white/10 shadow-2xl">
         {/* Decoration */}
         <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
         <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-green-500/20 rounded-full blur-3xl"></div>

         <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-purple-300">
                    <Sparkles size={20} />
                    <span className="font-semibold tracking-wide text-sm uppercase">AI Vibe Check</span>
                </div>
                {history.length < 1 && (
                     <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Play songs first</span>
                )}
            </div>

            {!suggestion ? (
                <div className="text-center py-6">
                    <p className="text-gray-300 mb-6">
                        {history.length > 0 
                            ? "Ready to analyze your recent listening history." 
                            : "Listen to a few songs so I can detect your mood."}
                    </p>
                    <button 
                        onClick={handleAnalyze}
                        disabled={isLoading || history.length === 0}
                        className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition ${
                            history.length === 0 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/20'
                        }`}
                    >
                       {isLoading ? (
                           <RefreshCw className="animate-spin" />
                       ) : (
                           <>
                             <span>Analyze Mood</span>
                           </>
                       )}
                    </button>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <div className="mb-4">
                        <h2 className="text-2xl font-bold text-white mb-1">{suggestion.mood}</h2>
                        <p className="text-sm text-gray-300 leading-relaxed">{suggestion.reasoning}</p>
                    </div>
                    
                    <button 
                        onClick={playVibe}
                        className="w-full bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-100 transition"
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

      {/* Suggested / Recently Added */}
      <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-4">Your Library</h3>
          <div className="grid grid-cols-2 gap-4">
              {library.slice(0, 4).map(song => (
                  <div 
                    key={song.id} 
                    onClick={() => playSong(song)}
                    className="bg-[#18181b] p-3 rounded-xl cursor-pointer hover:bg-[#27272a] transition group"
                  >
                      <div className="w-full aspect-square rounded-lg overflow-hidden mb-3 relative">
                          <img src={song.coverUrl} className="w-full h-full object-cover" alt={song.title} />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <PlayCircle size={32} className="text-white" fill="black" />
                          </div>
                      </div>
                      <p className="font-medium text-sm truncate text-white">{song.title}</p>
                      <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                  </div>
              ))}
               <div 
                 onClick={() => (document.querySelector('button[aria-label="Library"]') as HTMLElement)?.click()}
                 className="bg-[#18181b] p-3 rounded-xl cursor-pointer hover:bg-[#27272a] transition flex flex-col items-center justify-center text-gray-500 min-h-[140px]"
                >
                   <Music2 size={24} className="mb-2" />
                   <span className="text-xs">View All</span>
               </div>
          </div>
      </div>
    </div>
  );
};