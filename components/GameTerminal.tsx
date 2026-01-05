'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StarTrekGame, Line } from '../lib/startrek';
import { ThemeType, THEMES } from '@/lib/themes';

interface GameTerminalProps {
    gameInstance?: StarTrekGame;
    theme?: ThemeType;
}

export default function GameTerminal({ gameInstance, theme = 'TERMINAL' }: GameTerminalProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [inputValue, setInputValue] = useState('');
  const gameRef = useRef<StarTrekGame | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentTheme = THEMES[theme];

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = gameInstance || new StarTrekGame();
      // Flush initial output
      // If sharing instance, it might already have output or state.
      // We should append any existing buffer? Or just start fresh log?
      // Let's grab whatever is in buffer.
      setLines(prev => [...prev, ...gameRef.current!.getOutput()]);
    } else if (gameInstance && gameRef.current !== gameInstance) {
        // Handle prop change if needed, though usually stable
        gameRef.current = gameInstance;
        setLines(prev => [...prev, ...gameRef.current!.getOutput()]);
    }
  }, [gameInstance]);

  // Poll for output periodically if game is shared and modified elsewhere?
  // For now, assume single active view controls game.
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameRef.current) return;
    
    const cmd = inputValue; 
    // We'll use the theme's text color for input echo instead of hardcoded cyan, or keep it distinct?
    // Let's use a distinct color but compatible with theme.
    // For now, let's just use the current color but maybe bold?
    // The Line type has a color property.
    setLines(prev => [...prev, { text: `> ${cmd}`, color: 'inherit' }]);
    
    gameRef.current.processInput(cmd);
    const newLines = gameRef.current.getOutput();
    setLines(prev => [...prev, ...newLines]);
    
    setInputValue('');
  };

  return (
    <div
        className={`flex flex-col h-screen p-4 overflow-hidden pt-12 ${currentTheme.className}`}
        style={{
            ...currentTheme.style,
            fontFamily: currentTheme.fontVariable,
        }}
    >
      <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
        {lines.map((line, i) => (
          <div
            key={i}
            // If line.color is set, usage might depend on if we want to override theme.
            // 'cyan' was hardcoded. 'inherit' will use theme color.
            // If line.color is 'cyan' (from legacy code), we might want to map it or let it be.
            // But 'cyan' on TI99 background (Cyan) will be invisible.
            // We should strip color or handle it.
            // For now, let's use style color only if it's not 'inherit' and not clashing.
            // Actually, let's just force theme color for main text, unless it's specific highlights.
            // But the game logic sets colors like 'red' for alerts.
            style={{ color: line.color === 'inherit' ? undefined : line.color }}
            className="whitespace-pre-wrap leading-tight"
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="flex">
        <span className="mr-2">{'>'}</span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className={`flex-1 bg-transparent border-none outline-none uppercase placeholder-opacity-50 ${currentTheme.className.includes('text-') ? '' : 'text-inherit'}`}
          // We inherit color from parent div usually, but some themes define text color in className
          style={{ color: 'inherit' }}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </div>
  );
}