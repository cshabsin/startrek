
'use client';

import { useState, useEffect } from 'react';
import GameTerminal from '@/components/GameTerminal';
import ModernInterface from '@/components/ModernInterface';
import CreditsOverlay from '@/components/CreditsOverlay';
import { StarTrekGame } from '@/lib/startrek';
import { StarTrekGameV2 } from '@/lib/startrek2';
import { IStarTrekGame } from '@/lib/game-interface';
import { ThemeType, THEMES } from '@/lib/themes';

export default function Home() {
  const [mode, setMode] = useState<'classic' | 'modern'>(() => {
    if (typeof window === 'undefined') return 'classic';
    return window.location.hash.toLowerCase() === '#modern' ? 'modern' : 'classic';
  });
  const [theme, setTheme] = useState<ThemeType>(() => {
    if (typeof window === 'undefined') return 'TERMINAL';
    const hash = window.location.hash.toLowerCase();
    if (hash === '#c64') return 'C64';
    if (hash === '#ti') return 'TI99';
    if (hash === '#apple') return 'APPLE_II';
    return 'TERMINAL';
  });
  const [engine, setEngine] = useState<'v1' | 'v2'>('v1');
  const [game, setGame] = useState<IStarTrekGame | null>(null);
  const [showCredits, setShowCredits] = useState(false);

  // Sync URL Hash on state change
  useEffect(() => {
    let newHash = '';
    if (mode === 'modern') {
      newHash = '#modern';
    } else {
      if (theme === 'C64') newHash = '#c64';
      else if (theme === 'TI99') newHash = '#ti';
      else if (theme === 'APPLE_II') newHash = '#apple';
      else newHash = '#classic';
    }
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [mode, theme]);

  useEffect(() => {
      const timer = setTimeout(() => {
          if (engine === 'v1') setGame(new StarTrekGame());
          else setGame(new StarTrekGameV2());
      }, 0);
      return () => clearTimeout(timer);
  }, [engine]);

  return (
    <main className="min-h-screen bg-black relative">
      <div className="absolute top-2 right-2 z-50 flex gap-2 items-center">
        {mode === 'classic' && (
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeType)}
            className="px-2 py-1 rounded text-sm font-bold border bg-black text-green-500 border-green-700 mr-4 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {Object.keys(THEMES).map((key) => (
              <option key={key} value={key}>
                {THEMES[key as ThemeType].name}
              </option>
            ))}
          </select>
        )}
        <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as 'v1' | 'v2')}
            className="px-2 py-1 rounded text-sm font-bold border bg-black text-blue-400 border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
            <option value="v1">SST (1978)</option>
            <option value="v2">SST II (Advanced)</option>
        </select>
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
        <button 
            onClick={() => setShowCredits(true)}
            className="px-3 py-1 rounded text-sm font-bold border bg-black text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
        >
            CREDITS
        </button>
      </div>

      {mode === 'classic' && game ? (
          <GameTerminal gameInstance={game} theme={theme} />
      ) : (
          game && <ModernInterface game={game} />
      )}

      {showCredits && <CreditsOverlay onClose={() => setShowCredits(false)} />}
    </main>
  );
}
