'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StarTrekGame, Line } from '../lib/startrek';

interface GameTerminalProps {
    gameInstance?: StarTrekGame;
}

export default function GameTerminal({ gameInstance }: GameTerminalProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [inputValue, setInputValue] = useState('');
  const gameRef = useRef<StarTrekGame | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    setLines(prev => [...prev, { text: `> ${cmd}`, color: 'cyan' }]);
    
    gameRef.current.processInput(cmd);
    const newLines = gameRef.current.getOutput();
    setLines(prev => [...prev, ...newLines]);
    
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-screen bg-black text-green-500 font-mono p-4 overflow-hidden pt-12">
      <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
        {lines.map((line, i) => (
          <div key={i} style={{ color: line.color }} className="whitespace-pre-wrap leading-tight">
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="flex">
        <span className="mr-2 text-green-500">{'>'}</span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-green-500 uppercase"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </div>
  );
}