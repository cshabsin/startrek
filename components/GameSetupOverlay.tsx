'use client';

import React, { useState } from 'react';

interface GameSetupProps {
    onStart: (config: { type: 'v1' | 'v2', rank: number }) => void;
}

const RANKS = [
    "Novice", "Ensign", "Lieutenant", "Lt. Commander", 
    "Commander", "Captain", "Commodore", "Admiral"
];

export default function GameSetupOverlay({ onStart }: GameSetupProps) {
    const [type, setType] = useState<'v1' | 'v2'>('v1');
    const [rank, setRank] = useState(5); // Default Commander

    // Map rank 1-12 to labels (simplified)
    const getRankLabel = (r: number) => {
        if (r <= 3) return "Novice";
        if (r <= 6) return "Lieutenant";
        if (r <= 8) return "Commander";
        if (r <= 10) return "Captain";
        return "Admiral";
    };

    return (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center p-8 font-sans text-slate-200">
            <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-8">
                <h1 className="text-4xl font-black text-blue-500 tracking-tighter uppercase italic mb-2 text-center">
                    Mission Configuration
                </h1>
                <p className="text-center text-slate-500 mb-8 font-mono text-sm">
                    SELECT PARAMETERS FOR SIMULATION
                </p>

                <div className="space-y-8">
                    {/* Game Type Selection */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Simulation Logic</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setType('v1')}
                                className={`p-4 rounded border-2 transition-all text-left ${type === 'v1' ? 'border-blue-500 bg-blue-900/20' : 'border-slate-800 bg-slate-800/50 hover:border-slate-600'}`}
                            >
                                <div className={`font-bold ${type === 'v1' ? 'text-blue-400' : 'text-slate-300'}`}>Standard (1978)</div>
                                <div className="text-xs text-slate-500 mt-1">The classic experience. Hunt Klingons, manage energy. Static universe.</div>
                            </button>
                            <button 
                                onClick={() => setType('v2')}
                                className={`p-4 rounded border-2 transition-all text-left ${type === 'v2' ? 'border-red-500 bg-red-900/20' : 'border-slate-800 bg-slate-800/50 hover:border-slate-600'}`}
                            >
                                <div className={`font-bold ${type === 'v2' ? 'text-red-400' : 'text-slate-300'}`}>Advanced (SST II)</div>
                                <div className="text-xs text-slate-500 mt-1">Dynamic threats. Starbases under attack. Action time costs. Configurable difficulty.</div>
                            </button>
                        </div>
                    </div>

                    {/* Rank Selection (V2 Only) */}
                    <div className={`transition-all duration-300 overflow-hidden ${type === 'v2' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-50'}`}>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                            Commander's Rank (Difficulty)
                        </label>
                        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-mono text-xl font-bold text-yellow-500">{rank}</span>
                                <span className="font-bold uppercase text-slate-300">{getRankLabel(rank)}</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="12" 
                                step="1" 
                                value={rank} 
                                onChange={(e) => setRank(parseInt(e.target.value))}
                                className="w-full accent-yellow-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono uppercase">
                                <span>Low (1)</span>
                                <span>High (12)</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 italic">
                                Higher rank increases frequency of Starbase attacks and shortens response time.
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={() => onStart({ type, rank })}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-black text-xl py-4 rounded tracking-widest shadow-[0_0_20px_rgba(22,163,74,0.5)] transition-all hover:scale-[1.02]"
                    >
                        ENGAGE
                    </button>
                </div>
            </div>
        </div>
    );
}
