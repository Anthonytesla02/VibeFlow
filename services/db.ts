import { Song } from '../types';

const DB_NAME = 'VibeFlowDB';
const DB_VERSION = 2; // Incremented version
const STORE_SONGS = 'songs';

class MusicDatabase {
  private db: IDBDatabase | null = null;

  async connect(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
          console.error("Database connection failed:", request.error);
          reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SONGS)) {
          const songStore = db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
          songStore.createIndex('addedAt', 'addedAt', { unique: false });
          songStore.createIndex('title', 'title', { unique: false });
        }
      };
    });
  }

  async saveSong(song: Song): Promise<void> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_SONGS], 'readwrite');
      const store = transaction.objectStore(STORE_SONGS);
      
      // We strip the audioUrl because it's a blob URL specific to the session
      // We persist the audioBlob
      const { audioUrl, ...songData } = song; 
      
      const request = store.put(songData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSongs(): Promise<Song[]> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_SONGS], 'readonly');
      const store = transaction.objectStore(STORE_SONGS);
      const request = store.getAll();
      request.onsuccess = () => {
        const songs = request.result as Song[];
        // Reconstruct Blob URLs for playback
        const songsWithUrls = songs.map(s => {
            // Safety check if blob was stored correctly
            if (s.audioBlob instanceof Blob) {
                return {
                    ...s,
                    audioUrl: URL.createObjectURL(s.audioBlob)
                };
            }
            return s;
        });
        // Sort by most recent
        songsWithUrls.sort((a, b) => b.addedAt - a.addedAt);
        resolve(songsWithUrls);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSong(id: string): Promise<void> {
    await this.connect();
    return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_SONGS], 'readwrite');
        const store = transaction.objectStore(STORE_SONGS);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  }

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
     await this.connect();
     return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_SONGS], 'readwrite');
        const store = transaction.objectStore(STORE_SONGS);
        const getReq = store.get(id);
        
        getReq.onsuccess = () => {
            const song = getReq.result;
            if (song) {
                song.isFavorite = isFavorite;
                store.put(song);
                resolve();
            } else {
                reject('Song not found');
            }
        };
        getReq.onerror = () => reject(getReq.error);
     });
  }
}

export const musicDB = new MusicDatabase();
