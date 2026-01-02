
'use client';

import { useState, useRef } from 'react';
import GameTerminal from '@/components/GameTerminal';
import ModernInterface from '@/components/ModernInterface';
import { StarTrekGame } from '@/lib/startrek';

export default function Home() {
  const [mode, setMode] = useState<'classic' | 'modern'>('classic');
  const gameRef = useRef<StarTrekGame | null>(null);

  // Initialize game once shared between modes (optional, but good for switching)
  // However, Terminal component initializes its own game currently.
  // To share state, we should lift the game instance up.
  // The Terminal component was written to init its own game. Let's modify usage.
  
  if (!gameRef.current) {
      gameRef.current = new StarTrekGame();
  }

  return (
    <main className="min-h-screen bg-black relative">
      <div className="absolute top-2 right-2 z-50 flex gap-2">
        <button 
            onClick={() => setMode('classic')}
            className={`px-3 py-1 rounded text-sm font-bold border ${mode === 'classic' ? 'bg-green-700 text-black border-green-500' : 'bg-black text-green-700 border-green-700'}`}
        >
            CLASSIC
        </button>
        <button 
            onClick={() => setMode('modern')}
            className={`px-3 py-1 rounded text-sm font-bold border ${mode === 'modern' ? 'bg-blue-600 text-white border-blue-400' : 'bg-black text-blue-600 border-blue-600'}`}
        >
            MODERN
        </button>
      </div>

      {mode === 'classic' ? (
          // We need to modify GameTerminal to accept a game instance if we want persistence
          // Or just let it be independent.
          // Let's modify GameTerminal quickly to accept props, or just render it fresh.
          // For a true "Mode" switch, sharing state is better.
          // But GameTerminal currently manages its own ref.
          // Let's wrapper it or modify it. 
          // Since I can't easily modify GameTerminal props without editing it, 
          // and I want to avoid breaking existing code flow too much:
          // I will edit GameTerminal to accept an optional `gameInstance` prop.
          <GameTerminal gameInstance={gameRef.current} />
      ) : (
          <ModernInterface game={gameRef.current} />
      )}
    </main>
  );
}
