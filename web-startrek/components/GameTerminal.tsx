
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StarTrekGame, Line } from '../lib/startrek';

export default function GameTerminal() {
  const [lines, setLines] = useState<Line[]>([]);
  const [inputValue, setInputValue] = useState('');
  const gameRef = useRef<StarTrekGame | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new StarTrekGame();
      // Flush initial output
      setLines(gameRef.current.getOutput());
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameRef.current) return;
    
    const cmd = inputValue; // Keep raw case for display? BASIC used uppercase.
    setLines(prev => [...prev, { text: `> ${cmd}`, color: 'cyan' }]);
    
    gameRef.current.processInput(cmd);
    const newLines = gameRef.current.getOutput();
    setLines(prev => [...prev, ...newLines]);
    
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-screen bg-black text-green-500 font-mono p-4 overflow-hidden">
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
