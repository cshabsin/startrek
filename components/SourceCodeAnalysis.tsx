'use client';

import React, { useEffect, useState, useRef } from 'react';

type CodeBlock = {
  start: number;
  end: number;
  label: string;
  description: string;
  color: string;
};

const BLOCKS: CodeBlock[] = [
  { start: 100, end: 240, label: 'HEADER', description: 'Program title and ASCII art', color: 'border-blue-500' },
  { start: 240, end: 470, label: 'INIT', description: 'Initialize variables and galaxy map', color: 'border-yellow-500' },
  { start: 500, end: 590, label: 'MAIN LOOP', description: 'Wait for user input and dispatch commands', color: 'border-green-500' },
  { start: 1000, end: 1070, label: 'SRS', description: 'Short Range Scan subroutine', color: 'border-purple-500' },
  { start: 2000, end: 2060, label: 'LRS', description: 'Long Range Scan subroutine', color: 'border-purple-500' },
  { start: 3000, end: 3080, label: 'PHASERS', description: 'Phaser control subroutine', color: 'border-red-500' },
  { start: 4000, end: 4160, label: 'TORPEDOES', description: 'Photon Torpedo control subroutine', color: 'border-red-500' },
  { start: 5000, end: 5060, label: 'SHIELDS', description: 'Shield energy management', color: 'border-cyan-500' },
  { start: 6000, end: 6040, label: 'COMPUTER', description: 'Library Computer functions', color: 'border-gray-500' },
];

export default function SourceCodeAnalysis() {
  const [parsedLines, setParsedLines] = useState<{lineNumber: number, text: string}[]>([]);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/startrek.bas')
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split('\n');
        const parsed = lines.map(line => {
          const match = line.match(/^(\d+)\s+(.*)$/);
          if (match) {
            return { lineNumber: parseInt(match[1]), text: match[2] };
          }
          return { lineNumber: -1, text: line };
        }).filter(l => l.lineNumber !== -1);
        setParsedLines(parsed);
      });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    // Simple simulation of execution flow
    const sequence = [
      100, 150, 200, 250, 260, 290, 420, // Init
      500, 510, 520, // Loop start
      530, 1000, 1010, 1020, 1040, 1060, 1070, // SRS
      590, 500, // Back to loop
      540, 2000, 2010, 2060, // LRS
      590, 500 // Back to loop
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step >= sequence.length) {
        step = 0;
      }
      const lineNum = sequence[step];
      setActiveLine(lineNum);

      // Auto scroll
      const el = document.getElementById(`line-${lineNum}`);
      if (el && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const relativeTop = el.offsetTop - container.offsetTop;
        if (relativeTop < container.scrollTop || relativeTop > container.scrollTop + container.clientHeight - 100) {
            container.scrollTo({ top: relativeTop - 100, behavior: 'smooth' });
        }
      }

      step++;
    }, 800);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const getBlockForLine = (lineNum: number) => {
    return BLOCKS.find(b => lineNum >= b.start && lineNum <= b.end);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-900 text-green-400 font-mono overflow-hidden pt-14">
      {/* Code View */}
      <div className="w-full md:w-2/3 p-4 flex flex-col relative h-1/2 md:h-full border-b md:border-b-0 md:border-r border-zinc-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">STARTREK.BAS ANALYSIS</h2>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-2 border rounded text-xs md:text-base ${isPlaying ? 'bg-red-900 border-red-500' : 'bg-green-900 border-green-500'}`}
          >
            {isPlaying ? 'PAUSE' : 'SIMULATE'}
          </button>
        </div>

        <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto border border-zinc-700 bg-black p-4 relative"
        >
          {parsedLines.map(({ lineNumber, text }) => {
            const block = getBlockForLine(lineNumber);
            const isActive = activeLine === lineNumber;

            return (
              <div
                id={`line-${lineNumber}`}
                key={lineNumber}
                className={`flex hover:bg-zinc-800 cursor-pointer ${isActive ? 'bg-green-900 text-white' : ''} ${block ? `border-l-4 ${block.color}` : 'border-l-4 border-transparent'}`}
              >
                <div className="w-8 md:w-12 text-right mr-2 md:mr-4 text-zinc-500 select-none text-xs md:text-base">{lineNumber}</div>
                <div className="whitespace-pre flex-1 text-xs md:text-base">{text}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis Sidebar */}
      <div className="w-full md:w-1/3 bg-zinc-800 p-4 overflow-y-auto h-1/2 md:h-full">
        <h3 className="text-lg font-bold mb-4 text-white">STRUCTURE BLOCKS</h3>
        <div className="space-y-4">
          {BLOCKS.map((block, idx) => (
            <div key={idx} className={`p-4 border rounded bg-black ${block.color}`}>
              <div className="flex justify-between mb-2">
                <span className="font-bold text-white">{block.label}</span>
                <span className="text-xs text-zinc-500">{block.start} - {block.end}</span>
              </div>
              <p className="text-sm text-zinc-300">{block.description}</p>
              {activeLine && activeLine >= block.start && activeLine <= block.end && (
                 <div className="mt-2 text-xs text-green-400 animate-pulse">● EXECUTING</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8">
            <h3 className="text-lg font-bold mb-4 text-white">CONTROL FLOW</h3>
            <p className="text-sm text-zinc-400">
                The BASIC code relies heavily on <code className="text-yellow-400">GOTO</code> and <code className="text-yellow-400">GOSUB</code> statements.
                <br/><br/>
                - <strong className="text-white">GOSUB 1000-6000:</strong> Dispatches commands to subroutines based on user input.
                <br/>
                - <strong className="text-white">GOTO 500:</strong> Returns to the main command loop after an action.
            </p>
        </div>
      </div>
    </div>
  );
}
