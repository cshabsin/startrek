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
  const inputRef = useRef<HTMLInputElement>(null);

  const currentTheme = THEMES[theme];

  // Auto-focus input on mount or when mode/theme changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [theme]);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = gameInstance || new StarTrekGame();
      // Load existing history
      setLines(gameRef.current.getFullLog());
      // Flush any pending output
      gameRef.current.getOutput(); 
    } else if (gameInstance && gameRef.current !== gameInstance) {
        gameRef.current = gameInstance;
        setLines(gameRef.current.getFullLog());
        gameRef.current.getOutput();
    }

    // Subscribe to any updates (log prints) from the game instance
    const listener = () => {
        if (gameRef.current) {
            setLines(gameRef.current.getFullLog());
        }
    };
    gameRef.current.subscribe(listener);
    return () => gameRef.current?.unsubscribe(listener);
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
        className={`flex flex-col h-full p-2 sm:p-4 overflow-hidden text-xs sm:text-base ${currentTheme.className}`}
        style={{
            ...currentTheme.style,
            fontFamily: currentTheme.fontVariable,
        }}
    >
      <div className="flex-1 overflow-y-auto mb-2 sm:mb-4 custom-scrollbar">
        {lines.map((line, i) => (
          <div
            key={i}
            style={{ color: line.color === 'inherit' ? undefined : line.color }}
            className="whitespace-pre-wrap leading-tight"
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="flex items-center">
        <span className="mr-2">{'>'}</span>
        <input
          ref={inputRef}
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