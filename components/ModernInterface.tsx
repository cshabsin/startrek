'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StarTrekGame, Line } from '../lib/startrek';

interface ModernInterfaceProps {
    game: StarTrekGame;
}

export default function ModernInterface({ game }: ModernInterfaceProps) {
    const [tick, setTick] = useState(0);
    const [logs, setLogs] = useState<Line[]>([]);
    
    // UI State
    const [viewState, setViewState] = useState(game.getSectorData());
    const [animatingShip, setAnimatingShip] = useState<{x: number, y: number} | null>(null);
    const [animatingTorpedo, setAnimatingTorpedo] = useState<{x: number, y: number} | null>(null);
    const [overlay, setOverlay] = useState<'LRS' | 'MAP' | 'STATUS' | null>(null);

    // Command State
    const [navMode, setNavMode] = useState(false);
    const [fireMode, setFireMode] = useState<'PHA' | 'TOR' | null>(null);
    const [shieldMode, setShieldMode] = useState(false);
    const [computerMode, setComputerMode] = useState(false);
    
    // Inputs
    const [warpFactor, setWarpFactor] = useState(1);
    const [targetCourse, setTargetCourse] = useState<number | ''>(''); // Allow empty for manual entry
    const [phaserEnergy, setPhaserEnergy] = useState(100);
    const [shieldEnergy, setShieldEnergy] = useState(100);

    const logsEndRef = useRef<HTMLDivElement>(null);
    const courseInputRef = useRef<HTMLInputElement>(null);

    const refresh = () => {
        setTick(t => t + 1);
        setLogs(game.getFullLog());
        // Clear pending buffer so we don't double count if getOutput is called elsewhere
        game.getOutput(); 
        setViewState(game.getSectorData());
    };

    useEffect(() => {
        refresh();
    }, []);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Auto-focus course input when entering Nav/Tor mode
    useEffect(() => {
        if ((navMode || fireMode === 'TOR') && courseInputRef.current) {
            courseInputRef.current.focus();
        }
    }, [navMode, fireMode]);

    const exec = (action: () => void) => {
        action();
        refresh();
        setNavMode(false);
        setFireMode(null);
        setShieldMode(false);
        setTargetCourse('');
    };

    const animateMove = (endX: number, endY: number, onComplete: () => void) => {
         const startX = viewState.x;
         const startY = viewState.y;
         const startTime = performance.now();
         const duration = 500;
         setNavMode(false);
         const loop = (time: number) => {
             const elapsed = time - startTime;
             const progress = Math.min(1, elapsed / duration);
             const ease = 1 - Math.pow(1 - progress, 3);
             const curX = startX + (endX - startX) * ease;
             const curY = startY + (endY - startY) * ease;
             setAnimatingShip({x: curX, y: curY});
             if (progress < 1) {
                 requestAnimationFrame(loop);
             } else {
                 setAnimatingShip(null);
                 onComplete();
             }
         };
         requestAnimationFrame(loop);
    };

    const animateTorpedo = (path: {x: number, y: number}[], onComplete: () => void) => {
        let step = 0;
        const interval = setInterval(() => {
            if (step < path.length) {
                setAnimatingTorpedo(path[step]);
                step++;
            } else {
                clearInterval(interval);
                setAnimatingTorpedo(null);
                onComplete();
            }
            // If game ended (e.g. self-destruct via starbase), stop animation early
            if (game.state === 'ENDED') {
                clearInterval(interval);
                setAnimatingTorpedo(null);
                refresh();
            }
        }, 100);
    };

    const handleNav = (course: number, warp: number) => {
        const oldQuadX = game.quadX;
        const oldQuadY = game.quadY;
        
        // Suppress logs for modern nav
        game.executeNav(course, warp, true);
        
        if (game.state === 'ENDED') {
            refresh();
            return;
        }

        if (game.quadX !== oldQuadX || game.quadY !== oldQuadY) {
            refresh();
            setNavMode(false);
            setTargetCourse('');
        } else {
            const newX = game.sectX;
            const newY = game.sectY;
            animateMove(newX, newY, () => {
                refresh();
                setTargetCourse('');
            });
        }
    };

    const damageReport = game.getDamageReport();
    const missionStats = game.getMissionStats();

    // Clamp warp factor if engines damaged
    const warpEnginesDamaged = damageReport[0].value < 0;
    const maxWarp = warpEnginesDamaged ? 0.2 : 8;
    
    useEffect(() => {
        if (warpFactor > maxWarp) {
            setWarpFactor(maxWarp);
        }
    }, [maxWarp, warpFactor]);

    useEffect(() => {
        if (phaserEnergy > game.energy) {
            setPhaserEnergy(Math.floor(game.energy));
        }
    }, [game.energy, phaserEnergy]);

    const CompassRose = ({ course }: { course: number | '' }) => {
        const labels = ["1 (E)", "2 (NE)", "3 (N)", "4 (NW)", "5 (W)", "6 (SW)", "7 (S)", "8 (SE)"];
        const angles = [0, 315, 270, 225, 180, 135, 90, 45]; // Degrees
        
        return (
            <div className="relative w-24 h-24 mx-auto mb-2 border border-slate-700 rounded-full bg-slate-900 shadow-inner">
                {labels.map((label, i) => {
                    const angleRad = (angles[i] * Math.PI) / 180;
                    const r = 38; // px
                    const x = 48 + r * Math.cos(angleRad);
                    const y = 48 + r * Math.sin(angleRad);
                    return (
                        <div key={i} className="absolute text-[8px] font-bold text-slate-500 -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
                            {label.split(' ')[0]}
                        </div>
                    );
                })}
                {/* Center Point */}
                <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-slate-600 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                
                {/* Course Indicator Line */}
                {course !== '' && (
                    <div 
                        className="absolute top-1/2 left-1/2 h-10 w-0.5 bg-blue-500 origin-bottom shadow-[0_0_5px_rgba(59,130,246,1)]"
                        style={{ 
                            transform: `translate(-50%, -100%) rotate(${90 - ((Number(course) - 1) * 45)}deg)` 
                        }}
                    >
                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_white]"></div>
                    </div>
                )}
            </div>
        );
    };

    const EnterpriseIcon = () => (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">
            {/* Nacelles */}
            <rect x="20" y="60" width="10" height="30" rx="2" fill="#3b82f6" />
            <rect x="70" y="60" width="10" height="30" rx="2" fill="#3b82f6" />
            {/* Pylons */}
            <path d="M30 75 L50 65 M70 75 L50 65" stroke="#60a5fa" strokeWidth="4" />
            {/* Secondary Hull */}
            <ellipse cx="50" cy="70" rx="12" ry="20" fill="#94a3b8" />
            {/* Saucer */}
            <circle cx="50" cy="35" r="30" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
            <circle cx="50" cy="35" r="10" fill="#94a3b8" opacity="0.5" />
            {/* Deflector */}
            <circle cx="50" cy="60" r="4" fill="#fbbf24" />
        </svg>
    );

    const KlingonIcon = () => (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
            {/* Wings / Main Body */}
            <path d="M10 70 L50 40 L90 70 L50 80 Z" fill="#166534" stroke="#14532d" strokeWidth="1" />
            {/* Boom */}
            <rect x="47" y="20" width="6" height="30" fill="#166534" />
            {/* Bridge Head */}
            <path d="M35 20 L50 5 L65 20 L50 25 Z" fill="#15803d" />
            {/* Engine Glow */}
            <rect x="40" y="75" width="20" height="3" fill="#ef4444" opacity="0.8" />
        </svg>
    );

    const StarbaseIcon = () => (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
            <path d="M50 5 L95 25 L95 75 L50 95 L5 75 L5 25 Z" fill="#064e3b" stroke="#22c55e" strokeWidth="2" />
            <circle cx="50" cy="50" r="20" fill="#065f46" stroke="#4ade80" strokeWidth="1" />
            <rect x="48" y="5" width="4" height="90" fill="#22c55e" opacity="0.3" />
            <rect x="5" y="48" width="90" height="4" fill="#22c55e" opacity="0.3" />
            {/* Lights */}
            <circle cx="50" cy="20" r="2" fill="#facc15" />
            <circle cx="50" cy="80" r="2" fill="#facc15" />
            <circle cx="20" cy="50" r="2" fill="#facc15" />
            <circle cx="80" cy="50" r="2" fill="#facc15" />
        </svg>
    );

    const StarIcon = () => (
        <svg viewBox="0 0 100 100" className="w-2 h-2 overflow-visible">
            <defs>
                <radialGradient id="starGrad">
                    <stop offset="0%" stopColor="white" />
                    <stop offset="100%" stopColor="rgba(253,224,71,0)" />
                </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="50" fill="url(#starGrad)" />
            <path d="M50 0 L50 100 M0 50 L100 50" stroke="#fde047" strokeWidth="2" opacity="0.5" />
        </svg>
    );

    const renderGrid = () => {
        const grid = [];
        const entities = viewState;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                let content = null;
                let bgClass = "bg-gray-900 border-gray-800";
                const isShip = !animatingShip && x === entities.x && y === entities.y;
                if (isShip) {
                    content = <div className="w-[80%] h-[80%]"><EnterpriseIcon /></div>;
                } else if (entities.klingons.some(k => k.x === x && k.y === y)) {
                    content = <div className="w-[70%] h-[70%] animate-pulse"><KlingonIcon /></div>;
                } else if (entities.starbases.some(b => b.x === x && b.y === y)) {
                    content = <div className="w-[85%] h-[85%]"><StarbaseIcon /></div>;
                } else if (entities.stars.some(s => s.x === x && s.y === y)) {
                    content = <StarIcon />;
                }
                const handleClick = () => {
                    const dx = x - entities.x;
                    const dy = y - entities.y;
                    
                    if (dx === 0 && dy === 0) return; // Ignore clicks on self
                    
                    if (navMode) {
                        // Calculate Course
                        const angle = Math.atan2(dy, dx);
                        let course = 1 - angle / (Math.PI / 4);
                        if (course < 1) course += 8;
                        if (course >= 9) course -= 8;
                        
                        // Calculate Auto-Warp
                        const distSectors = Math.sqrt(dx*dx + dy*dy);
                        let autoWarp = Math.sqrt(distSectors / 8);
                        autoWarp = Math.max(0.05, Math.min(maxWarp, autoWarp));
                        autoWarp = Math.round(autoWarp * 20) / 20;
                        
                        // Set State (Do not execute yet)
                        setTargetCourse(parseFloat(course.toFixed(2)));
                        setWarpFactor(autoWarp);
                    }
                    if (fireMode === 'TOR') {
                         const angle = Math.atan2(dy, dx);
                         let course = 1 - angle / (Math.PI / 4);
                         if (course < 1) course += 8;
                         if (course >= 9) course -= 8;
                         setTargetCourse(parseFloat(course.toFixed(2)));
                    }
                };
                
                let cursor = 'cursor-default';
                if (navMode || fireMode === 'TOR') cursor = 'cursor-crosshair hover:bg-white/10';
                grid.push(
                    <div key={`${x},${y}`} className={`w-full aspect-square border flex items-center justify-center ${bgClass} ${cursor}`} onClick={handleClick}>
                        {content}
                    </div>
                );
            }
        }
        return grid;
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center shadow-md pr-72">
                <h1 className="text-2xl font-bold tracking-wider text-blue-400 shrink-0">USS ENTERPRISE <span className="text-sm text-slate-500 font-normal">NCC-1701</span></h1>
                <div className="text-xl font-mono text-yellow-500 truncate ml-4">
                    STARDATE {game.stardate.toFixed(1)}
                    <span className="text-sm text-slate-500 ml-3">({missionStats.daysLeft} DAYS LEFT)</span>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel */}
                <div className="w-1/4 bg-slate-900/50 p-4 border-r border-slate-800 flex flex-col gap-6 overflow-y-auto">
                    {/* Mission Status */}
                    <div className="space-y-4">
                        <h2 className="text-sm uppercase tracking-widest text-slate-500 font-bold">Mission Status</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                                <div className="text-[10px] text-slate-400 uppercase">Klingons</div>
                                <div className="text-xl font-mono text-red-500 font-bold">{missionStats.klingonsLeft}</div>
                            </div>
                            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                                <div className="text-[10px] text-slate-400 uppercase">Days Left</div>
                                <div className="text-xl font-mono text-yellow-500 font-bold">{missionStats.daysLeft}</div>
                            </div>
                            <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                                <div className="text-[10px] text-slate-400 uppercase">Starbases</div>
                                <div className="text-xl font-mono text-green-500 font-bold">{missionStats.starbases}</div>
                            </div>
                            <div className="bg-slate-800/50 p-2 rounded border border-slate-700 flex items-center justify-center">
                                <div className={`text-sm font-bold uppercase ${missionStats.condition === '*RED*' ? 'text-red-600 animate-pulse' : missionStats.condition === 'YELLOW' ? 'text-yellow-500' : 'text-green-500'}`}>
                                    {missionStats.condition}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-sm uppercase tracking-widest text-slate-500 font-bold">Systems Status</h2>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs"><span>ENERGY</span> <span>{Math.floor(game.energy)}</span></div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400 transition-all duration-500" style={{width: `${(game.energy/3000)*100}%`}}></div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs"><span>SHIELDS</span> <span>{Math.floor(game.shields)}</span></div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 transition-all duration-500" style={{width: `${Math.min(100, (game.shields/1000)*100)}%`}}></div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs"><span>TORPEDOES</span> <span>{game.torpedoes}</span></div>
                             <div className="flex gap-1">
                                {Array.from({length: 10}).map((_, i) => (
                                    <div key={i} className={`h-2 flex-1 rounded-sm ${i < game.torpedoes ? 'bg-red-500' : 'bg-slate-800'}`}></div>
                                ))}
                             </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <h2 className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-2">Damage Control</h2>
                        <div className="space-y-2 text-xs font-mono">
                            {damageReport.map((sys, i) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-slate-800 rounded">
                                    <span className={sys.value < 0 ? 'text-red-400' : 'text-slate-300'}>{sys.name}</span>
                                    <span className={sys.value < 0 ? 'text-red-500 font-bold' : 'text-green-500'}>
                                        {sys.value < 0 ? `${Math.abs(sys.value).toFixed(1)}d` : 'OK'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center Panel */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-950 relative">
                     {navMode && <div className="absolute top-4 bg-blue-600 text-white px-4 py-1 rounded-full shadow-lg z-30 animate-pulse">NAVIGATION MODE: Enter Manual Course</div>}
                     {fireMode === 'TOR' && <div className="absolute top-4 bg-red-600 text-white px-4 py-1 rounded-full shadow-lg z-30 animate-pulse">WEAPON MODE: Enter Manual Course</div>}
                     
                     <div className="relative aspect-square h-full max-h-[600px] bg-slate-800 p-1 rounded-lg shadow-2xl border border-slate-700">
                        {/* Position Overlay */}
                        <div className="absolute top-2 left-2 z-10 bg-black/50 text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-700">
                            Q: {game.quadX + 1},{game.quadY + 1} &nbsp; S: {game.sectX + 1},{game.sectY + 1}
                        </div>

                        <div className="grid grid-cols-8 grid-rows-8 gap-1 w-full h-full">
                            {renderGrid()}
                        </div>
                        {animatingShip && (
                             <div className="absolute w-[12.5%] h-[12.5%] pointer-events-none transition-none z-20 flex items-center justify-center" style={{ left: `${(animatingShip.x / 8) * 100}%`, top: `${(animatingShip.y / 8) * 100}%` }}>
                                <div className="w-[80%] h-[80%]">
                                    <EnterpriseIcon />
                                </div>
                             </div>
                        )}

                        {animatingTorpedo && (
                             <div 
                                className="absolute w-[12.5%] h-[12.5%] pointer-events-none transition-all duration-75 z-30 flex items-center justify-center"
                                style={{ 
                                    left: `${(animatingTorpedo.x / 8) * 100}%`, 
                                    top: `${(animatingTorpedo.y / 8) * 100}%` 
                                }}
                             >
                                <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_red] ring-2 ring-white/50"></div>
                             </div>
                        )}
                        
                        {/* Overlays (Status, LRS, Map) */}
                        {overlay === 'STATUS' && (
                            <div className="absolute inset-0 bg-black/95 z-40 flex flex-col p-8 overflow-y-auto">
                                <h3 className="text-2xl font-bold mb-6 text-blue-400 uppercase tracking-widest text-center border-b border-blue-900 pb-2">Status Report</h3>
                                
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="bg-slate-900 p-4 rounded border border-slate-700">
                                        <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase">Mission Objectives</h4>
                                        <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-2">
                                            <span className="text-sm text-slate-300">Klingons Remaining</span>
                                            <span className="text-2xl font-mono text-red-500 font-bold">{missionStats.klingonsLeft}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm text-slate-300">Days Left</span>
                                            <span className="text-2xl font-mono text-yellow-500 font-bold">{missionStats.daysLeft}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 p-4 rounded border border-slate-700">
                                        <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase">Logistics</h4>
                                        <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-2">
                                            <span className="text-sm text-slate-300">Starbases</span>
                                            <span className="text-xl font-mono text-green-500 font-bold">{missionStats.starbases}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm text-slate-300">Alert Condition</span>
                                            <span className={`text-xl font-bold uppercase ${missionStats.condition === '*RED*' ? 'text-red-600 animate-pulse' : missionStats.condition === 'YELLOW' ? 'text-yellow-500' : 'text-green-500'}`}>
                                                {missionStats.condition}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Damage Control Report</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {damageReport.map((sys, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-slate-900/50 rounded border border-slate-800">
                                            <span className={`text-xs font-bold ${sys.value < 0 ? 'text-red-400' : 'text-slate-300'}`}>{sys.name}</span>
                                            {sys.value < 0 ? (
                                                <div className="text-right">
                                                    <div className="text-xs text-red-500 font-bold uppercase">Damaged</div>
                                                    <div className="text-[10px] text-slate-500">Rep in {Math.abs(sys.value).toFixed(1)} days</div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-green-500 font-bold uppercase">Operational</div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button onClick={() => setOverlay(null)} className="mt-auto bg-slate-800 px-6 py-3 rounded hover:bg-slate-700 text-white font-bold tracking-widest w-full border border-slate-600">CLOSE REPORT</button>
                            </div>
                        )}

                        {overlay === 'LRS' && (
                            <div className="absolute inset-0 bg-black/90 z-40 flex flex-col items-center justify-center p-8">
                                <h3 className="text-xl font-bold mb-4 text-blue-400 uppercase tracking-widest">Long Range Sensors</h3>
                                {game.getLRSData() ? (
                                    <div className="grid grid-cols-3 grid-rows-3 gap-4 w-full max-w-[400px]">
                                        {game.getLRSData()?.map((row, y) => row.map((val, x) => (
                                            <div key={`${x},${y}`} className="aspect-square bg-slate-900 border border-slate-700 flex flex-col items-center justify-center rounded">
                                                <div className="text-xs text-slate-500 mb-1">{val === -1 ? '' : `${game.quadX + x - 1 + 1},${game.quadY + y - 1 + 1}`}</div>
                                                <div className="text-xl font-mono text-green-400">{val === -1 ? '***' : val.toString().padStart(3, '0')}</div>
                                            </div>
                                        )))}
                                    </div>
                                ) : (
                                    <div className="text-red-500 font-bold text-xl animate-pulse text-center border-2 border-red-500 p-4 rounded bg-red-900/20">
                                        SENSORS OFFLINE
                                        <div className="text-sm text-red-400 mt-2 font-normal">Damage repair in progress</div>
                                    </div>
                                )}
                                <button onClick={() => setOverlay(null)} className="mt-8 bg-slate-800 px-6 py-2 rounded hover:bg-slate-700">CLOSE</button>
                            </div>
                        )}
                        {overlay === 'MAP' && (
                            <div className="absolute inset-0 bg-black/90 z-40 flex flex-col items-center justify-center p-4">
                                <h3 className="text-xl font-bold mb-4 text-blue-400 uppercase tracking-widest">Galactic Map</h3>
                                <div className="grid grid-cols-8 grid-rows-8 gap-1 w-full max-w-[500px] aspect-square">
                                    {game.getGalaxyMap().map((col, x) => col.map((val, y) => {
                                        const isCurrent = x === game.quadX && y === game.quadY;
                                        return (
                                            <div 
                                                key={`${x},${y}`} 
                                                className={`border border-slate-800 flex items-center justify-center text-[10px] font-mono cursor-pointer hover:bg-white/20 transition-colors
                                                    ${isCurrent ? 'bg-blue-900/40 text-blue-200 border-blue-500' : 'bg-slate-900/40 text-slate-500'}
                                                `} 
                                                style={{ gridColumn: x + 1, gridRow: y + 1 }}
                                                onClick={() => {
                                                    if (isCurrent) return; 
                                                    
                                                    const dx = x - game.quadX;
                                                    const dy = y - game.quadY;
                                                    
                                                    // Calculate course
                                                    const angle = Math.atan2(dy, dx);
                                                    let course = 1 - angle / (Math.PI / 4);
                                                    if (course < 1) course += 8;
                                                    if (course >= 9) course -= 8;
                                                    
                                                    // Calculate Warp (Distance in Quadrants)
                                                    let dist = Math.sqrt(dx*dx + dy*dy);
                                                    // Clamp to max engine speed
                                                    if (dist > maxWarp) dist = maxWarp;
                                                    
                                                    // Round to 1 decimal
                                                    dist = Math.round(dist * 10) / 10;
                                                    
                                                    if (confirm(`Warp to Quadrant ${x+1},${y+1}?
Course: ${course.toFixed(1)}, Warp: ${dist}`)) {
                                                        setOverlay(null);
                                                        handleNav(course, dist);
                                                    }
                                                }}
                                            >
                                                {val === 0 ? '???' : val.toString().padStart(3, '0')}
                                            </div>
                                        );
                                    }))}
                                </div>
                                <button onClick={() => setOverlay(null)} className="mt-4 bg-slate-800 px-6 py-2 rounded hover:bg-slate-700">CLOSE</button>
                            </div>
                        )}

                        {game.state === 'ENDED' && (
                            <div className="absolute inset-0 bg-red-950/90 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
                                <div className="text-red-500 text-6xl font-black mb-4 tracking-tighter">MISSION ENDED</div>
                                <div className="bg-black/50 p-6 rounded border border-red-500/50 max-w-lg mb-8">
                                    <div className="text-slate-200 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                                        {logs.slice(-5).map(l => l.text).join('\n\n')}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        game.init();
                                        refresh();
                                    }}
                                    className="bg-white text-red-900 px-8 py-4 rounded font-black text-xl hover:bg-red-100 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                                >
                                    COMMENCE NEW MISSION
                                </button>
                            </div>
                        )}
                     </div>
                </div>

                {/* Right Panel */}
                <div className="w-1/4 bg-slate-900/50 p-4 border-l border-slate-800 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setNavMode(!navMode); setFireMode(null); setShieldMode(false); setComputerMode(false); setTargetCourse(''); }}
                            className={`p-2 rounded font-bold text-xs transition-colors ${navMode ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700 text-blue-400'}`}>NAV</button>
                        <button onClick={() => { setShieldMode(!shieldMode); setNavMode(false); setFireMode(null); setComputerMode(false); }}
                            className={`p-2 rounded font-bold text-xs transition-colors ${shieldMode ? 'bg-blue-500' : 'bg-slate-800 hover:bg-slate-700 text-blue-300'}`}>SHIELDS</button>
                        <button onClick={() => { setFireMode(fireMode === 'PHA' ? null : 'PHA'); setNavMode(false); setShieldMode(false); setComputerMode(false); }}
                            className={`p-2 rounded font-bold text-xs transition-colors ${fireMode === 'PHA' ? 'bg-orange-600' : 'bg-slate-800 hover:bg-slate-700 text-orange-400'}`}>PHASERS</button>
                        <button onClick={() => { setFireMode(fireMode === 'TOR' ? null : 'TOR'); setNavMode(false); setShieldMode(false); setComputerMode(false); setTargetCourse(''); }}
                            className={`p-2 rounded font-bold text-xs transition-colors ${fireMode === 'TOR' ? 'bg-red-600' : 'bg-slate-800 hover:bg-slate-700 text-red-400'}`}>TORPEDO</button>
                        
                        <button onClick={() => { setComputerMode(!computerMode); setNavMode(false); setFireMode(null); setShieldMode(false); }}
                            className={`p-2 rounded font-bold text-xs transition-colors ${computerMode ? 'bg-purple-600' : 'bg-slate-800 hover:bg-slate-700 text-purple-400'}`}>COMPUTER</button>
                        <button onClick={() => setOverlay('LRS')} className="p-2 rounded font-bold text-xs bg-slate-800 hover:bg-slate-700 text-green-400">LRS SCAN</button>
                        <button onClick={() => setOverlay('MAP')} className="p-2 rounded font-bold text-xs bg-slate-800 hover:bg-slate-700 text-purple-400">GALAXY MAP</button>
                        <button onClick={() => { if(confirm('Resign command?')) exec(() => game.processInput('XXX')) }} className="p-2 rounded font-bold text-xs bg-slate-800 hover:bg-slate-700 text-gray-500">RESIGN</button>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-lg min-h-[150px] flex flex-col justify-center">
                        {/* Persistent Repair Button if Docked and Damaged */}
                        {game.dockStatus && damageReport.some(d => d.value < 0) && !navMode && !fireMode && !shieldMode && !computerMode && (
                            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500 rounded text-center">
                                <div className="text-[10px] text-blue-300 uppercase font-bold mb-2">Starbase Technicians Available</div>
                                <button 
                                    onClick={() => exec(() => game.executeRepairOrder())}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-xs shadow-lg"
                                >
                                    AUTHORIZE REPAIRS
                                </button>
                            </div>
                        )}

                        {/* Rest / Repair in deep space */}
                        {!game.dockStatus && damageReport.some(d => d.value < 0) && !navMode && !fireMode && !shieldMode && !computerMode && (
                            <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded text-center">
                                <div className="text-[10px] text-green-400 uppercase font-bold mb-2">Deep Space Operations</div>
                                <button 
                                    onClick={() => exec(() => game.executeRest(0.5))}
                                    className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-2 rounded text-xs shadow-lg"
                                >
                                    WAIT / REPAIR (0.5 DAYS)
                                </button>
                            </div>
                        )}

                        {navMode && (
                            <div className="space-y-4">
                                <CompassRose course={targetCourse} />
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold uppercase text-slate-400 text-center">Manual Course Entry</label>
                                    <input 
                                        ref={courseInputRef}
                                        type="number" 
                                        value={targetCourse} 
                                        onChange={(e) => setTargetCourse(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-center text-sm font-mono text-white"
                                        placeholder="1-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold uppercase text-slate-400 text-center">Warp Factor: {warpFactor}</label>
                                    <input 
                                        type="range" 
                                        min="0.05" 
                                        max={maxWarp} 
                                        step="0.05" 
                                        value={warpFactor} 
                                        onChange={(e) => setWarpFactor(parseFloat(e.target.value))} 
                                        className={`w-full ${warpEnginesDamaged ? 'accent-red-500' : 'accent-blue-500'}`}
                                    />
                                </div>
                                {warpEnginesDamaged && <div className="text-[10px] text-red-500 font-bold text-center animate-pulse">WARP ENGINES DAMAGED - MAX 0.2</div>}
                                
                                <button 
                                    onClick={() => targetCourse !== '' && handleNav(Number(targetCourse), warpFactor)} 
                                    disabled={targetCourse === ''}
                                    className={`w-full py-2 rounded text-xs font-bold shadow-lg ${targetCourse !== '' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                >
                                    ENGAGE
                                </button>
                                <div className="text-[9px] text-slate-500 text-center uppercase mt-1">Tactical Computer: Click Sector to Auto-Plot</div>
                            </div>
                        )}
                        {shieldMode && (
                            <div className="space-y-4">
                                <label className="block text-xs font-bold uppercase text-slate-400 text-center">Deflector Control</label>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                                        <span className="text-yellow-500">Ship: {Math.floor(game.energy + game.shields - shieldEnergy)}</span>
                                        <span className="text-blue-500">Shields: {shieldEnergy}</span>
                                    </div>
                                    <div className="relative h-6 bg-slate-900 rounded overflow-hidden border border-slate-700 flex">
                                        <div className="h-full bg-yellow-500/50 transition-all duration-75" style={{width: `${((game.energy + game.shields - shieldEnergy) / (game.energy + game.shields)) * 100}%`}}></div>
                                        <div className="h-full bg-blue-500/50 transition-all duration-75" style={{width: `${(shieldEnergy / (game.energy + game.shields)) * 100}%`}}></div>
                                        <input type="range" min="0" max={game.energy + game.shields} value={shieldEnergy} onChange={(e) => setShieldEnergy(parseInt(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"/>
                                        <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] pointer-events-none transition-all duration-75" style={{left: `${((game.energy + game.shields - shieldEnergy) / (game.energy + game.shields)) * 100}%`}}></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                    <button onClick={() => setShieldEnergy(0)} className="bg-slate-700 text-[10px] py-1 rounded hover:bg-slate-600 text-slate-300">0</button>
                                    <button onClick={() => setShieldEnergy(500)} className="bg-slate-700 text-[10px] py-1 rounded hover:bg-slate-600 text-slate-300">500</button>
                                    <button onClick={() => setShieldEnergy(1000)} className="bg-slate-700 text-[10px] py-1 rounded hover:bg-slate-600 text-slate-300">1000</button>
                                    <button onClick={() => setShieldEnergy(Math.floor(game.energy + game.shields))} className="bg-slate-700 text-[10px] py-1 rounded hover:bg-slate-600 text-slate-300">MAX</button>
                                </div>
                                <button onClick={() => exec(() => game.executeShields(shieldEnergy))} className="w-full bg-blue-600 py-2 rounded text-xs font-bold hover:bg-blue-500 shadow-lg">TRANSFER POWER</button>
                            </div>
                        )}
                        {fireMode === 'PHA' && (
                            <div className="space-y-4">
                                <label className="block text-xs font-bold uppercase text-slate-400 text-center">Phaser Control</label>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                                        <span>Output Level</span>
                                        <span className="text-orange-500">{phaserEnergy} Units</span>
                                    </div>
                                    <div className="relative h-6 bg-slate-900 rounded overflow-hidden border border-slate-700">
                                        <div 
                                            className="h-full bg-orange-500/50 transition-all duration-75" 
                                            style={{width: `${(phaserEnergy / Math.max(1, game.energy)) * 100}%`}}
                                        ></div>
                                        <input 
                                            type="range" min="1" max={Math.floor(game.energy)} value={phaserEnergy} 
                                            onChange={(e) => setPhaserEnergy(parseInt(e.target.value))} 
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                                        />
                                        <div 
                                            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] pointer-events-none transition-all duration-75"
                                            style={{left: `${(phaserEnergy / Math.max(1, game.energy)) * 100}%`}}
                                        ></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                    <button onClick={() => setPhaserEnergy(Math.min(100, Math.floor(game.energy)))} className="bg-slate-700 text-[10px] py-1 rounded hover:bg-slate-600 text-slate-300">100</button>
                                    <button onClick={() => setPhaserEnergy(Math.min(250, Math.floor(game.energy)))} className="bg-slate-700 text-[10px] py-1 rounded hover:bg-slate-600 text-slate-300">250</button>
                                    <button onClick={() => setPhaserEnergy(Math.min(500, Math.floor(game.energy)))} className="bg-slate-700 text-[10px] py-1 rounded hover:bg-slate-600 text-slate-300">500</button>
                                    <button onClick={() => setPhaserEnergy(Math.floor(game.energy))} className="bg-slate-700 text-[10px] py-1 rounded hover:bg-slate-600 text-slate-300">MAX</button>
                                </div>
                                <button onClick={() => exec(() => game.executePhasers(phaserEnergy))} className="w-full bg-orange-600 py-2 rounded text-xs font-bold hover:bg-orange-500 shadow-lg">FIRE PHASERS</button>
                            </div>
                        )}
                        {fireMode === 'TOR' && (
                            <div className="space-y-4">
                                <CompassRose course={targetCourse} />
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold uppercase text-slate-400 text-center">Manual Course Entry</label>
                                    <input 
                                        ref={courseInputRef}
                                        type="number" 
                                        value={targetCourse} 
                                        onChange={(e) => setTargetCourse(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-center text-sm font-mono text-white"
                                        placeholder="1-9"
                                    />
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        if (targetCourse !== '') {
                                            const path = game.executeTorpedo(Number(targetCourse));
                                            if (path) {
                                                animateTorpedo(path, () => refresh());
                                            } else {
                                                refresh();
                                            }
                                            setFireMode(null);
                                            setTargetCourse('');
                                        }
                                    }}
                                    disabled={targetCourse === ''}
                                    className={`w-full py-2 rounded text-xs font-bold shadow-lg ${targetCourse !== '' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                >
                                    FIRE TORPEDO
                                </button>
                                <div className="text-[9px] text-slate-500 text-center uppercase mt-1">Tactical Computer: Click Sector to Auto-Plot</div>
                            </div>
                        )}
                        {computerMode && (
                            <div className="grid grid-cols-1 gap-1">
                                <button onClick={() => exec(() => game.executeComputer('1'))} className="bg-slate-700 text-[10px] py-2 rounded hover:bg-slate-600 text-slate-200">STATUS REPORT (LOG)</button>
                                <button onClick={() => exec(() => game.executeComputer('2'))} className="bg-slate-700 text-[10px] py-2 rounded hover:bg-slate-600 text-slate-200">TORPEDO DATA</button>
                                <button onClick={() => exec(() => game.executeComputer('3'))} className="bg-slate-700 text-[10px] py-2 rounded hover:bg-slate-600 text-slate-200">STARBASE NAV</button>
                                <button onClick={() => exec(() => game.executeComputer('5'))} className="bg-slate-700 text-[10px] py-2 rounded hover:bg-slate-600 text-slate-200">REGION NAMES</button>
                            </div>
                        )}
                        {!navMode && !fireMode && !shieldMode && !computerMode && <div className="text-center text-slate-500 italic text-xs">Ready for orders...</div>}
                    </div>

                    <div className="flex-1 bg-black p-2 font-mono text-[10px] overflow-y-auto text-green-500 rounded border border-slate-800">
                        {logs.map((line, i) => (
                            <div key={i} className="whitespace-pre-wrap mb-1 border-b border-green-900/20 pb-1">{line.text}</div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}