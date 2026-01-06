
'use client';

import React, { useState, useEffect } from 'react';

interface CreditsOverlayProps {
    onClose: () => void;
}

export default function CreditsOverlay({ onClose }: CreditsOverlayProps) {
    const [viewSource, setViewSource] = useState(false);
    const [sourceCode, setSourceCode] = useState<string>('Loading source...');

    useEffect(() => {
        if (viewSource && sourceCode === 'Loading source...') {
            fetch('superstartrek.bas')
                .then(res => res.text())
                .then(text => setSourceCode(text))
                .catch(err => setSourceCode('Error loading source: ' + err.message));
        }
    }, [viewSource, sourceCode]);

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col p-8 overflow-hidden backdrop-blur-sm">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
                <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                    <h2 className="text-4xl font-black text-blue-500 tracking-tighter uppercase italic">Credits & Origin</h2>
                    <button 
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded font-bold transition-colors border border-slate-600"
                    >
                        CLOSE
                    </button>
                </div>

                {!viewSource ? (
                    <div className="flex-1 overflow-y-auto space-y-12 pr-4 custom-scrollbar">
                        <section>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-4">Original BASIC Game (1978)</h3>
                            <div className="space-y-2">
                                <p className="text-2xl text-slate-200 font-serif">Original logic and design by <span className="text-white font-bold">Mike Mayfield</span>.</p>
                                <p className="text-lg text-slate-400">Modified and published by <span className="text-slate-200">Dave Ahl</span> in "101 BASIC Computer Games".</p>
                                <p className="text-lg text-slate-400">Major debug and enhancements by <span className="text-slate-200">Bob Leedom</span> (1974).</p>
                                <p className="text-lg text-slate-400 font-mono">Converted to Microsoft 8K BASIC by John Gorders (1978).</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-4">Modern Web Implementation (2026)</h3>
                            <div className="space-y-4">
                                <p className="text-xl text-slate-200">Built using <span className="text-blue-400">Next.js 15</span>, <span className="text-blue-400">TypeScript</span>, and <span className="text-blue-400">Tailwind CSS</span>.</p>
                                <p className="text-lg text-slate-400 italic">Project initiated and developed as a collaborative engineering experiment with Gemini CLI.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-4">Art & Design</h3>
                            <ul className="list-disc list-inside text-slate-300 space-y-2">
                                <li><span className="font-bold text-white">Tactical Icons:</span> Custom SVG vectors designed for this implementation.</li>
                                <li><span className="font-bold text-white">Retro Themes:</span> Visual styles inspired by TI-99/4A, Commodore 64, and Apple II.</li>
                                <li><span className="font-bold text-white">Interface:</span> Dual-mode architecture (Terminal vs Tactical Console).</li>
                            </ul>
                        </section>

                        <div className="pt-8 flex gap-4">
                            <button 
                                onClick={() => setViewSource(true)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded font-black tracking-widest transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            >
                                VIEW ORIGINAL SOURCE CODE
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">superstartrek.bas</h3>
                            <button onClick={() => setViewSource(false)} className="text-blue-400 text-xs hover:underline">← BACK TO CREDITS</button>
                        </div>
                        <div className="flex-1 bg-black/50 border border-slate-800 rounded p-4 overflow-y-auto font-mono text-[10px] text-green-500/80 custom-scrollbar whitespace-pre">
                            {sourceCode}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
