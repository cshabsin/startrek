export interface Line {
  text: string;
  color?: string;
}

export type GameState = 'COMMAND' | 'INIT' | 'ENDED' | string;

export interface SectorEntity {
    x: number;
    y: number;
    energy?: number;
}

export interface SectorData {
    x: number;
    y: number;
    klingons: SectorEntity[];
    starbases: SectorEntity[];
    stars: SectorEntity[];
}

export interface MissionStats {
    stardate: number;
    stardateEnd: number;
    daysLeft: number;
    klingonsLeft: number;
    klingonsStart: number;
    starbases: number;
    dockStatus: boolean;
    condition: string;
}

export interface DamageReportItem {
    name: string;
    value: number;
}

export interface IStarTrekGame {
    state: GameState;
    
    // Core Status
    stardate: number;
    energy: number;
    shields: number;
    torpedoes: number;
    dockStatus: boolean;
    
    // Position
    quadX: number;
    quadY: number;
    sectX: number;
    sectY: number;

    // Methods
    init(): void;
    processInput(input: string): void;
    
    // UI Helpers
    subscribe(listener: () => void): void;
    unsubscribe(listener: () => void): void;
    getOutput(): Line[];
    getFullLog(): Line[];
    
    // Data Access
    getSectorData(): SectorData;
    getDamageReport(): DamageReportItem[];
    getMissionStats(): MissionStats;
    getLRSData(): number[][] | null;
    getGalaxyMap(): number[][];
    getRegionName(x: number, y: number): string;
    getActiveStarbaseAttack(): { quadX: number, quadY: number, deadline: number } | null;
    
    // Commands
    executeNav(course: number, warp: number, suppressLogs?: boolean): void;
    executePhasers(amt: number): {x: number, y: number}[];
    executeTorpedo(course: number): {x: number, y: number}[] | null;
    executeShields(amt: number): void;
    executeComputer(val: string): void;
    executeRepairOrder(): void;
    executeRest(days: number): void;
}
