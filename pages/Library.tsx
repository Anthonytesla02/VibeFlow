import React, { useState, useEffect } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { extractYoutubeAudio, SongData, checkYoutubeCookies, uploadYoutubeCookies, deleteYoutubeCookies } from '../services/api';
import { Plus, Youtube, Play, Trash2, Heart, Music2, Loader2, Download, Cookie, Upload, AlertCircle, CheckCircle } from 'lucide-react';

export const Library: React.FC = () => {
  const { library, playSong, refreshLibrary, toggleLike, currentSong, isPlaying, removeSong } = useAudio();
  const [activeTab, setActiveTab] = useState<'songs' | 'add'>('songs');
  const [ytUrl, setYtUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [hasCookies, setHasCookies] = useState(false);
  const [showCookieHelp, setShowCookieHelp] = useState(false);
  const [cookieContent, setCookieContent] = useState('');
  const [cookieStatus, setCookieStatus] = useState('');

  useEffect(() => {
    checkCookieStatus();
  }, []);

  const checkCookieStatus = async () => {
    try {
      const status = await checkYoutubeCookies();
      setHasCookies(status.hasCookies);
    } catch (error) {
      console.error('Failed to check cookie status:', error);
    }
  };

  const handleYoutubeExtract = async () => {
    if (!ytUrl) return;
    setIsProcessing(true);
    setUploadStatus('Connecting to extraction service...');

    try {
      setUploadStatus('Downloading and processing audio...');
      await extractYoutubeAudio(ytUrl);
      await refreshLibrary();
      
      setUploadStatus('Success! Audio saved to your library.');
      setYtUrl('');
      setTimeout(() => {
        setUploadStatus('');
        setActiveTab('songs');
      }, 1500);

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || 'Failed to extract';
      setUploadStatus(`Error: ${errorMessage}`);
      
      if (errorMessage.includes('authentication') || errorMessage.includes('cookies') || errorMessage.includes('bot')) {
        setShowCookieHelp(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCookieContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleSaveCookies = async () => {
    if (!cookieContent.trim()) {
      setCookieStatus('Please select or paste a cookies file');
      return;
    }
    
    try {
      await uploadYoutubeCookies(cookieContent);
      setCookieStatus('Cookies saved successfully!');
      setHasCookies(true);
      setCookieContent('');
      setShowCookieHelp(false);
      setTimeout(() => setCookieStatus(''), 3000);
    } catch (error: any) {
      setCookieStatus(`Error: ${error.message}`);
    }
  };

  const handleDeleteCookies = async () => {
    try {
      await deleteYoutubeCookies();
      setHasCookies(false);
      setCookieStatus('Cookies removed');
      setTimeout(() => setCookieStatus(''), 3000);
    } catch (error: any) {
      setCookieStatus(`Error: ${error.message}`);
    }
  };

  const handleDeleteSong = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this song from your library?')) {
      await removeSong(id);
    }
  };

  return (
    <div className="p-4 pt-6 min-h-full">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
          Library
        </h1>
        <div className="flex space-x-2 bg-gray-800/50 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('songs')}
            className={`px-3 py-1.5 text-sm rounded-md transition ${activeTab === 'songs' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
          >
            Tracks
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1.5 text-sm rounded-md transition ${activeTab === 'add' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
          >
            <Plus size={16} />
          </button>
        </div>
      </header>

      {activeTab === 'add' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-red-400">
                <Youtube size={24} />
                <h2 className="text-lg font-semibold text-white">YouTube Import</h2>
              </div>
              {hasCookies && (
                <span className="flex items-center space-x-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                  <CheckCircle size={12} />
                  <span>Authenticated</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Paste a YouTube link to download and save the audio to your library.
            </p>
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition"
              />
              <button 
                disabled={isProcessing || !ytUrl}
                onClick={handleYoutubeExtract}
                className="bg-red-500 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-50 hover:bg-red-600 transition flex items-center active:scale-95"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              </button>
            </div>

            <button
              onClick={() => setShowCookieHelp(!showCookieHelp)}
              className="mt-3 text-xs text-gray-500 hover:text-gray-300 flex items-center space-x-1"
            >
              <Cookie size={12} />
              <span>{hasCookies ? 'Manage YouTube authentication' : 'Having trouble? Set up authentication'}</span>
            </button>
          </div>
           
          {uploadStatus && (
            <div className="p-4 bg-gray-800/50 rounded-xl text-center border border-white/5">
              <p className={`${uploadStatus.includes('Error') ? 'text-red-400' : 'text-green-400'} text-sm font-medium ${isProcessing ? 'animate-pulse' : ''}`}>
                {uploadStatus}
              </p>
              {isProcessing && <p className="text-xs text-gray-500 mt-1">This may take a minute...</p>}
            </div>
          )}

          {showCookieHelp && (
            <div className="glass-panel p-5 rounded-2xl border border-yellow-500/20 animate-fade-in">
              <div className="flex items-start space-x-3 mb-4">
                <AlertCircle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-white mb-1">YouTube Authentication Required</h3>
                  <p className="text-xs text-gray-400">
                    YouTube blocks automated downloads. To enable downloads, export your browser cookies and upload them here.
                  </p>
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-white mb-2">How to export cookies:</h4>
                <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                  <li>Install a cookie export extension in your browser</li>
                  <li>Go to youtube.com and log in</li>
                  <li>Export cookies in Netscape format (cookies.txt)</li>
                  <li>Upload the file below</li>
                </ol>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-center w-full py-3 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload size={18} className="mr-2 text-gray-400" />
                  <span className="text-sm text-gray-400">
                    {cookieContent ? 'File loaded - ready to save' : 'Choose cookies.txt file'}
                  </span>
                </label>

                <textarea
                  value={cookieContent}
                  onChange={(e) => setCookieContent(e.target.value)}
                  placeholder="Or paste your cookies content here..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono h-24 focus:outline-none focus:border-yellow-500 transition resize-none"
                />

                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveCookies}
                    disabled={!cookieContent.trim()}
                    className="flex-1 bg-yellow-500 text-black py-2 rounded-xl font-medium disabled:opacity-50 hover:bg-yellow-400 transition"
                  >
                    Save Cookies
                  </button>
                  {hasCookies && (
                    <button
                      onClick={handleDeleteCookies}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {cookieStatus && (
                <p className={`mt-3 text-xs text-center ${cookieStatus.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {cookieStatus}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'songs' && (
        <div className="space-y-2 pb-20">
          {library.length === 0 ? (
            <div className="text-center text-gray-500 mt-20 flex flex-col items-center">
              <Music2 size={48} className="opacity-20 mb-4" />
              <p>Your library is empty.</p>
              <button onClick={() => setActiveTab('add')} className="text-green-400 mt-2 underline">Add songs</button>
            </div>
          ) : (
            library.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              const isPlayingCurrent = isCurrent && isPlaying;
              
              return (
                <div 
                  key={song.id}
                  onClick={() => playSong(song)}
                  className={`flex items-center p-3 rounded-xl cursor-pointer transition active:scale-[0.98] group ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5 active:bg-white/10'}`}
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden mr-3 bg-gray-800 flex-shrink-0">
                    <img 
                      src={song.coverUrl || 'https://picsum.photos/48/48'} 
                      className={`w-full h-full object-cover transition duration-500 ${isPlayingCurrent ? 'scale-110' : 'scale-100'}`} 
                      alt="art" 
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex space-x-1 items-end h-3">
                          <div className="w-1 bg-white animate-[bounce_1s_infinite] h-full"></div>
                          <div className="w-1 bg-white animate-[bounce_1.2s_infinite] h-2/3"></div>
                          <div className="w-1 bg-white animate-[bounce_0.8s_infinite] h-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className={`font-medium truncate ${isCurrent ? 'text-green-400' : 'text-white'}`}>
                      {song.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleLike(song.id); }}
                      className={`${song.isFavorite ? 'text-green-500' : 'text-gray-600 hover:text-white'} transition active:scale-90`}
                    >
                      <Heart size={18} fill={song.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteSong(e, song.id)}
                      className="text-gray-600 hover:text-red-400 transition active:scale-90"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
