
'use client';

import { useState, useEffect } from 'react';
import GameTerminal from '@/components/GameTerminal';
import ModernInterface from '@/components/ModernInterface';
import CreditsOverlay from '@/components/CreditsOverlay';
import SourceCodeAnalysis from '@/components/SourceCodeAnalysis';
import { StarTrekGame } from '@/lib/startrek';
import { ThemeType, THEMES } from '@/lib/themes';

export default function Home() {
  const [mode, setMode] = useState<'classic' | 'modern' | 'analysis'>('classic');
  const [theme, setTheme] = useState<ThemeType>('TERMINAL');
  const [game, setGame] = useState<StarTrekGame | null>(null);
  const [showCredits, setShowCredits] = useState(false);

  // Handle URL Hash on Mount
  useEffect(() => {
    // Wrap in timeout to avoid "synchronous state update in effect" warning
    const timer = setTimeout(() => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#modern') {
        setMode('modern');
      } else if (hash === '#c64') {
        setMode('classic');
        setTheme('C64');
      } else if (hash === '#ti') {
        setMode('classic');
        setTheme('TI99');
      } else if (hash === '#apple') {
        setMode('classic');
        setTheme('APPLE_II');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
      // Use timeout to avoid immediate state set warning if StrictMode is on,
      // or just accept it's standard client-only init.
      // Actually the warning says "synchronously".
      // Let's defer it slightly or ignore if we know it's fine (it is for mount).
      // Better yet, just use a ref for the game and force update?
      // No, we need state to trigger re-render when game is ready.
      // The warning is about "Cascading renders".
      // Since this is effect on mount, it's unavoidable if we want to render based on it.
      // But wrapping in timeout or requestAnimationFrame helps.
      const timer = setTimeout(() => setGame(new StarTrekGame()), 0);
      return () => clearTimeout(timer);
  }, []);

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
            onClick={() => setMode('analysis')}
            className={`px-3 py-1 rounded text-sm font-bold border ${mode === 'analysis' ? 'bg-purple-600 text-white border-purple-400' : 'bg-black text-purple-600 border-purple-600'}`}
        >
            SOURCE
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
      ) : mode === 'modern' && game ? (
          <ModernInterface game={game} />
      ) : mode === 'analysis' ? (
          <SourceCodeAnalysis />
      ) : null}

      {showCredits && <CreditsOverlay onClose={() => setShowCredits(false)} />}
    </main>
  );
}
