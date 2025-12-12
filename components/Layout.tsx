import React from 'react';
import { Home, Library, Disc, LogOut } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userName: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, onLogout, userName }) => {
  const { currentSong } = useAudio();

  const navItems = [
    { id: 'home', icon: Home, label: 'Vibe' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'player', icon: Disc, label: 'Player' },
  ];

  return (
    <div className="h-screen w-full flex flex-col bg-[#0f0f11] overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 safe-area-top">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-white text-sm font-medium truncate max-w-[120px]">{userName}</span>
        </div>
        <button onClick={onLogout} className="text-gray-400 hover:text-white p-2 transition">
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 relative">
        {children}
      </main>

      {currentPage !== 'player' && currentSong && (
        <div 
          onClick={() => onNavigate('player')}
          className="fixed bottom-16 left-0 right-0 h-16 bg-[#18181b] border-t border-white/10 flex items-center px-4 cursor-pointer z-40 safe-area-bottom"
        >
          <img 
            src={currentSong.coverUrl || 'https://picsum.photos/48/48'} 
            className="w-10 h-10 rounded bg-gray-700 object-cover" 
            alt="cover" 
          />
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
            <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
          </div>
          <div className="flex space-x-0.5 items-end h-4">
            <div className="w-1 bg-green-400 animate-[bounce_1s_infinite] h-2"></div>
            <div className="w-1 bg-green-400 animate-[bounce_1.2s_infinite] h-4"></div>
            <div className="w-1 bg-green-400 animate-[bounce_0.8s_infinite] h-3"></div>
          </div>
        </div>
      )}

      <nav className="h-16 bg-[#09090b] border-t border-white/5 flex items-center justify-around z-50 fixed bottom-0 w-full safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition active:scale-95 ${isActive ? 'text-green-400' : 'text-gray-500'}`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  );
};
