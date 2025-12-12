import React, { useState } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { musicDB } from '../services/db';
import { extractYoutubeAudio } from '../services/api';
import { Song } from '../types';
import { Plus, Youtube, Upload, Play, Trash2, Heart, Music2, Pause, Download, Loader2 } from 'lucide-react';

export const Library: React.FC = () => {
  const { library, playSong, refreshLibrary, toggleLike, currentSong, isPlaying } = useAudio();
  const [activeTab, setActiveTab] = useState<'songs' | 'add'>('songs');
  const [ytUrl, setYtUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Local File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadStatus('Saving to Database...');
      const file = e.target.files[0];
      
      const nameParts = file.name.replace(/\.[^/.]+$/, "").split('-');
      const artist = nameParts.length > 1 ? nameParts[0].trim() : 'Unknown Artist';
      const title = nameParts.length > 1 ? nameParts[1].trim() : nameParts[0].trim();

      const newSong: Song = {
        id: crypto.randomUUID(),
        title: title,
        artist: artist,
        audioBlob: file, 
        duration: 0, 
        addedAt: Date.now(),
        isFavorite: false,
        sourceType: 'upload',
        coverUrl: `https://picsum.photos/seed/${title}/200/200`
      };

      await musicDB.saveSong(newSong);
      await refreshLibrary();
      setUploadStatus('Saved to library!');
      setTimeout(() => setUploadStatus(''), 2000);
      setActiveTab('songs');
    }
  };

  // Real YouTube Extraction
  const handleYoutubeExtract = async () => {
    if (!ytUrl) return;
    setIsProcessing(true);
    setUploadStatus('Connecting to extraction service...');

    try {
      // 1. Get Download URL from API
      const { url, filename } = await extractYoutubeAudio(ytUrl);
      
      if (!url) throw new Error("Could not retrieve download link.");

      setUploadStatus('Downloading audio file (this may take a moment)...');

      // 2. Fetch the actual binary data
      // We use corsproxy.io for the file download (GET) as it's reliable for streams/blobs
      const proxyDownloadUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
      
      const response = await fetch(proxyDownloadUrl);
      if (!response.ok) throw new Error(`Failed to download audio file (${response.status}).`);
      
      const blob = await response.blob();
      
      // Basic check to ensure we got a valid blob (sometimes proxies return html error pages)
      if (blob.type && blob.type.includes('text/html')) {
          throw new Error("Download failed: Received HTML instead of Audio.");
      }

      setUploadStatus('Processing metadata...');

      // 3. Metadata setup
      const cleanFilename = filename ? filename.replace(/\.(mp3|wav|m4a|webm|ogg)$/i, '') : "Extracted Song";
      // Try to split artist/title if present in filename (e.g. "Artist - Title")
      let title = cleanFilename;
      let artist = "YouTube Import";
      
      if (cleanFilename.includes(' - ')) {
          const parts = cleanFilename.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
      }

      const newSong: Song = {
        id: crypto.randomUUID(),
        title: title, 
        artist: artist,
        audioBlob: blob, // ACTUAL FILE
        duration: 0,
        addedAt: Date.now(),
        isFavorite: false,
        sourceType: 'youtube',
        coverUrl: `https://picsum.photos/seed/${Date.now()}/200/200`,
        genre: 'Pop'
      };

      // 4. Save to IndexedDB
      await musicDB.saveSong(newSong);
      await refreshLibrary();
      
      setUploadStatus('Success! Audio saved offline.');
      setYtUrl('');
      setTimeout(() => {
          setUploadStatus('');
          setActiveTab('songs');
      }, 1500);

    } catch (error: any) {
        console.error(error);
        setUploadStatus(`Error: ${error.message || 'Failed to extract'}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const deleteSong = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm('Delete this song from your offline library?')) {
        await musicDB.deleteSong(id);
        refreshLibrary();
    }
  };

  return (
    <div className="p-4 pt-10 min-h-full">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
          Library
        </h1>
        <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('songs')}
                className={`px-3 py-1 text-sm rounded-md transition ${activeTab === 'songs' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            >
                Tracks
            </button>
             <button 
                onClick={() => setActiveTab('add')}
                className={`px-3 py-1 text-sm rounded-md transition ${activeTab === 'add' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            >
                <Plus size={16} />
            </button>
        </div>
      </header>

      {activeTab === 'add' && (
        <div className="space-y-6 animate-fade-in">
           {/* YouTube Section */}
           <div className="glass-panel p-6 rounded-xl border border-white/5">
                <div className="flex items-center space-x-2 mb-4 text-red-400">
                    <Youtube size={24} />
                    <h2 className="text-lg font-semibold text-white">YouTube Import</h2>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                    Enter a YouTube URL. We will download the audio and save it to your internal database for offline play.
                </p>
                <div className="flex space-x-2">
                    <input 
                        type="text" 
                        value={ytUrl}
                        onChange={(e) => setYtUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition"
                    />
                    <button 
                        disabled={isProcessing || !ytUrl}
                        onClick={handleYoutubeExtract}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-red-600 transition flex items-center"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                    </button>
                </div>
           </div>

           {/* File Upload Section */}
           <div className="glass-panel p-6 rounded-xl border border-white/5">
                <div className="flex items-center space-x-2 mb-4 text-blue-400">
                    <Upload size={24} />
                    <h2 className="text-lg font-semibold text-white">Local Upload</h2>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                    Upload MP3/WAV files directly to the database.
                </p>
                <label className="block w-full cursor-pointer group">
                    <div className="border-2 border-dashed border-gray-700 rounded-xl h-32 flex flex-col items-center justify-center group-hover:border-blue-500 transition">
                         <span className="text-gray-500 text-sm group-hover:text-blue-400">Tap to select files</span>
                    </div>
                    <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                </label>
           </div>
           
           {uploadStatus && (
               <div className="p-4 bg-gray-800/50 rounded-xl text-center border border-white/5">
                   <p className={`${uploadStatus.includes('Error') ? 'text-red-400' : 'text-green-400'} text-sm font-medium animate-pulse mb-1`}>
                       {uploadStatus}
                   </p>
                   {isProcessing && <p className="text-xs text-gray-500">Please wait, larger files take longer to save.</p>}
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
                 <button onClick={() => setActiveTab('add')} className="text-green-400 mt-2 underline">Add songs to Database</button>
             </div>
          ) : (
              library.map((song) => {
                  const isCurrent = currentSong?.id === song.id;
                  const isPlayingCurrent = isCurrent && isPlaying;
                  
                  return (
                    <div 
                        key={song.id}
                        onClick={() => playSong(song)}
                        className={`flex items-center p-3 rounded-xl cursor-pointer transition active:scale-98 group ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                        <div className="relative w-12 h-12 rounded-md overflow-hidden mr-3 bg-gray-800 flex-shrink-0">
                            <img src={song.coverUrl} className={`w-full h-full object-cover transition duration-500 ${isPlayingCurrent ? 'scale-110' : 'scale-100'}`} alt="art" />
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

                        <div className="flex items-center space-x-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleLike(song.id); }}
                                className={`${song.isFavorite ? 'text-green-500' : 'text-gray-600 hover:text-white'}`}
                            >
                                <Heart size={18} fill={song.isFavorite ? 'currentColor' : 'none'} />
                            </button>
                            <button 
                                onClick={(e) => deleteSong(e, song.id)}
                                className="text-gray-600 hover:text-red-400"
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