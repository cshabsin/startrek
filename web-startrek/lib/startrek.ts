
export type GameState = 'COMMAND' | 'INIT' | 'ENDED' | string;

export interface Line {
  text: string;
  color?: string; // For future usage
}

export class StarTrekGame {
  // Game Settings / Constants
  private readonly GALAXY_SIZE = 8;
  private readonly SECTOR_SIZE = 8;
  
  // Game State
  public state: GameState = 'INIT';
  private outputBuffer: Line[] = [];
  
  // Ship Systems
  public energy: number = 3000;
  public energyMax: number = 3000;
  public torpedoes: number = 10;
  public shields: number = 0;
  public dockStatus: boolean = false;
  
  // Position
  public quadX: number = 0; // 0-7
  public quadY: number = 0; // 0-7
  public sectX: number = 0; // 0-7
  public sectY: number = 0; // 0-7
  
  // Time
  public stardate: number = 0;
  public stardateStart: number = 0;
  public stardateEnd: number = 0;
  
  // Galaxy Map (Format: K*100 + B*10 + S)
  // K=Klingons, B=Starbases, S=Stars
  private galaxy: number[][] = [];
  private knownGalaxy: number[][] = []; // What the player has seen (LRS)
  
  // Current Quadrant Entities
  private localKlingons: { x: number, y: number, energy: number }[] = [];
  private localStarbases: { x: number, y: number }[] = [];
  private localStars: { x: number, y: number }[] = [];
  
  // Counts
  public totalKlingons: number = 0;
  public totalStarbases: number = 0;
  public startKlingons: number = 0;
  
  // Damage Control (0 = functional, <0 = damaged)
  // 0: Warp, 1: SRS, 2: LRS, 3: Phaser, 4: Tubes, 5: Dmg Ctrl, 6: Shields, 7: Comp
  private damage: number[] = new Array(8).fill(0);
  private damageNames = [
    "WARP ENGINES", "SHORT RANGE SENSORS", "LONG RANGE SENSORS", 
    "PHASER CONTROL", "PHOTON TUBES", "DAMAGE CONTROL", 
    "SHIELD CONTROL", "LIBRARY-COMPUTER"
  ];

  // Input handling state
  private inputCallback: ((input: string) => void) | null = null;

  constructor() {
    this.init();
  }

  private print(text: string) {
    this.outputBuffer.push({ text });
  }

  public getOutput(): Line[] {
    const out = [...this.outputBuffer];
    this.outputBuffer = [];
    return out;
  }

  // --- Initialization ---
  
  public init() {
    this.state = 'COMMAND';
    this.outputBuffer = [];
    this.energy = 3000;
    this.torpedoes = 10;
    this.shields = 0;
    this.damage = new Array(8).fill(0);
    this.dockStatus = false;
    
    // Setup Time
    this.stardate = Math.floor(Math.random() * 20 + 20) * 100;
    this.stardateStart = this.stardate;
    const duration = 25 + Math.floor(Math.random() * 10);
    this.stardateEnd = this.stardate + duration;
    
    // Setup Galaxy
    this.galaxy = [];
    this.knownGalaxy = [];
    this.totalKlingons = 0;
    this.totalStarbases = 0;
    
    // Position Enterprise
    this.quadX = Math.floor(Math.random() * 8);
    this.quadY = Math.floor(Math.random() * 8);
    this.sectX = Math.floor(Math.random() * 8);
    this.sectY = Math.floor(Math.random() * 8);

    for (let i = 0; i < 8; i++) {
      this.galaxy[i] = [];
      this.knownGalaxy[i] = [];
      for (let j = 0; j < 8; j++) {
        this.knownGalaxy[i][j] = 0;
        let k = 0; 
        let b = 0;
        let s = 0;
        
        const r1 = Math.random();
        if (r1 > 0.98) k = 3;
        else if (r1 > 0.95) k = 2;
        else if (r1 > 0.80) k = 1;
        
        this.totalKlingons += k;
        
        if (Math.random() > 0.96) {
          b = 1;
          this.totalStarbases++;
        }
        
        s = Math.floor(Math.random() * 8) + 1;
        
        this.galaxy[i][j] = k * 100 + b * 10 + s;
      }
    }
    
    if (this.totalKlingons > duration) {
       this.stardateEnd = this.stardateStart + this.totalKlingons + 1;
    }
    this.startKlingons = this.totalKlingons;

    // Ensure at least one starbase if none generated? BASIC does this at line 1100
    // "IF B9 <> 0 THEN 1200" -> If >0 continue. 
    // If B9=0, it forces one at a random location.
    if (this.totalStarbases === 0) {
      if (this.galaxy[this.quadX][this.quadY] < 200) {
        this.galaxy[this.quadX][this.quadY] += 120; // Add K=1, B=1? No, wait. 
        // Line 1150: G(Q1,Q2) = G(Q1,Q2) + 120. K9=K9+1. 
        // This adds 1 Klingon (100) and 2 Starbases (20)? No.
        // BASIC: K3*100 + B3*10 + S. 
        // +120 means +1 Klingon, +2 Starbases? 
        // Wait, line 1160: B9=1. G+=10. 
        // Let's simplified: If 0 starbases, add one at random.
         const qx = Math.floor(Math.random() * 8);
         const qy = Math.floor(Math.random() * 8);
         this.galaxy[qx][qy] += 10;
         this.totalStarbases++;
      }
    }

    // Intro Text
    this.print("YOUR ORDERS ARE AS FOLLOWS:");
    this.print(`     DESTROY THE ${this.totalKlingons} KLINGON WARSHIPS WHICH HAVE INVADED`);
    this.print("   THE GALAXY BEFORE THEY CAN ATTACK FEDERATION HEADQUARTERS");
    this.print(`   ON STARDATE ${this.stardateEnd}   THIS GIVES YOU ${this.stardateEnd - this.stardateStart} DAYS.`);
    this.print(`   THERE ${this.totalStarbases === 1 ? 'IS' : 'ARE'} ${this.totalStarbases} STARBASE${this.totalStarbases === 1 ? '' : 'S'} IN THE GALAXY FOR RESUPPLYING YOUR SHIP`);
    this.print("");
    
    this.enterQuadrant();
  }

  private enterQuadrant() {
    // Populate local entities based on galaxy map
    const val = this.galaxy[this.quadX][this.quadY];
    const kCount = Math.floor(val / 100);
    const bCount = Math.floor((val % 100) / 10);
    const sCount = val % 10;
    
    this.localKlingons = [];
    this.localStarbases = [];
    this.localStars = [];
    
    // BASIC logic for positioning is random empty spots
    // We need to keep track of occupied sectors to avoid collisions during generation
    // Enterprise is at sectX, sectY
    
    const isOccupied = (x: number, y: number) => {
      if (x === this.sectX && y === this.sectY) return true;
      if (this.localKlingons.some(k => k.x === x && k.y === y)) return true;
      if (this.localStarbases.some(b => b.x === x && b.y === y)) return true;
      if (this.localStars.some(s => s.x === x && s.y === y)) return true;
      return false;
    };
    
    const findEmpty = () => {
      let x, y;
      do {
        x = Math.floor(Math.random() * 8);
        y = Math.floor(Math.random() * 8);
      } while (isOccupied(x, y));
      return { x, y };
    };
    
    for (let i = 0; i < kCount; i++) {
      const pos = findEmpty();
      // Klingon shield/energy: 200 * (0.5 + RND) -> 100 to 300? 
      // BASIC Line 440: S9=200. Line 1780: S9*(0.5+RND(1))
      this.localKlingons.push({ ...pos, energy: 200 * (0.5 + Math.random()) });
    }
    
    for (let i = 0; i < bCount; i++) {
      this.localStarbases.push(findEmpty());
    }
    
    for (let i = 0; i < sCount; i++) {
      this.localStars.push(findEmpty());
    }
    
    // Update known galaxy
    this.knownGalaxy[this.quadX][this.quadY] = this.galaxy[this.quadX][this.quadY];

    if (kCount > 0) {
      this.print("");
      this.print("COMBAT AREA      CONDITION RED");
      if (this.shields <= 200) {
        this.print("   SHIELDS DANGEROUSLY LOW");
      }
    }
    
    this.shortRangeScan();
  }

  // --- Input Processing ---

  public processInput(input: string) {
    input = input.trim().toUpperCase();
    
    if (this.inputCallback) {
      const cb = this.inputCallback;
      this.inputCallback = null;
      cb(input);
      return;
    }

    // Main Command Loop
    if (input === 'NAV') this.commandNav();
    else if (input === 'SRS') this.shortRangeScan();
    else if (input === 'LRS') this.longRangeScan();
    else if (input === 'PHA') this.commandPhasers();
    else if (input === 'TOR') this.commandTorpedo();
    else if (input === 'SHE') this.commandShields();
    else if (input === 'DAM') this.commandDamage();
    else if (input === 'COM') this.commandComputer();
    else if (input === 'XXX') {
        this.print("COMMAND RESIGNED.");
        this.state = 'ENDED';
    }
    else if (input === 'HELP') this.printCommands();
    else {
      this.print("ENTER ONE OF THE FOLLOWING:");
      this.printCommands();
    }
  }
  
  private printCommands() {
    this.print("  NAV  (TO SET COURSE)");
    this.print("  SRS  (FOR SHORT RANGE SENSOR SCAN)");
    this.print("  LRS  (FOR LONG RANGE SENSOR SCAN)");
    this.print("  PHA  (TO FIRE PHASERS)");
    this.print("  TOR  (TO FIRE PHOTON TORPEDOES)");
    this.print("  SHE  (TO RAISE OR LOWER SHIELDS)");
    this.print("  DAM  (FOR DAMAGE CONTROL REPORTS)");
    this.print("  COM  (TO CALL ON LIBRARY-COMPUTER)");
    this.print("  XXX  (TO RESIGN YOUR COMMAND)");
  }

  private prompt(msg: string, callback: (val: string) => void) {
    this.print(msg);
    this.inputCallback = callback;
  }
  
  // --- Commands ---

  private shortRangeScan() {
    if (this.damage[1] < 0) {
      this.print("SHORT RANGE SENSORS ARE OUT");
      return;
    }
    
    // Check Docking
    let adjacentToStarbase = false;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const tx = this.sectX + dx;
            const ty = this.sectY + dy;
            if (this.localStarbases.some(b => b.x === tx && b.y === ty)) {
                adjacentToStarbase = true;
            }
        }
    }
    
    if (adjacentToStarbase) {
        if (!this.dockStatus) {
            this.print("SHIELDS DROPPED FOR DOCKING PURPOSES");
            this.shields = 0;
            this.energy = this.energyMax;
            this.torpedoes = 10;
        }
        this.dockStatus = true;
    } else {
        this.dockStatus = false;
    }

    this.print("---------------------------------");
    for (let y = 0; y < 8; y++) {
      let line = "";
      for (let x = 0; x < 8; x++) {
        let symbol = "   ";
        if (x === this.sectX && y === this.sectY) symbol = "<*>";
        else if (this.localKlingons.some(k => k.x === x && k.y === y)) symbol = "+K+";
        else if (this.localStarbases.some(b => b.x === x && b.y === y)) symbol = ">!<";
        else if (this.localStars.some(s => s.x === x && s.y === y)) symbol = " * ";
        line += symbol;
      }
      // Append Status Info to the right
      let status = "";
      if (y === 0) status = `        STARDATE          ${Math.floor(this.stardate * 10) / 10}`;
      if (y === 1) status = `        CONDITION         ${this.getCondition()}`;
      if (y === 2) status = `        QUADRANT          ${this.quadX + 1},${this.quadY + 1}`;
      if (y === 3) status = `        SECTOR            ${this.sectX + 1},${this.sectY + 1}`;
      if (y === 4) status = `        PHOTON TORPEDOES  ${Math.floor(this.torpedoes)}`;
      if (y === 5) status = `        TOTAL ENERGY      ${Math.floor(this.energy + this.shields)}`;
      if (y === 6) status = `        SHIELDS           ${Math.floor(this.shields)}`;
      if (y === 7) status = `        KLINGONS REMAINING ${this.totalKlingons}`;
      
      this.print(line + status);
    }
    this.print("---------------------------------");
  }

  private getCondition() {
    if (this.dockStatus) return "DOCKED";
    if (this.localKlingons.length > 0) return "*RED*";
    if (this.energy < 300) return "YELLOW"; // BASIC: E < E0*.1 (3000*.1 = 300)
    return "GREEN";
  }

  private longRangeScan() {
    if (this.damage[2] < 0) {
      this.print("LONG RANGE SENSORS ARE INOPERABLE");
      return;
    }
    this.print(`LONG RANGE SCAN FOR QUADRANT ${this.quadX + 1},${this.quadY + 1}`);
    this.print("-------------------");
    
    for (let y = this.quadY - 1; y <= this.quadY + 1; y++) {
      let line = "";
      for (let x = this.quadX - 1; x <= this.quadX + 1; x++) {
        if (x >= 0 && x <= 7 && y >= 0 && y <= 7) {
            this.knownGalaxy[x][y] = this.galaxy[x][y];
            line += `: ${this.galaxy[x][y].toString().padStart(3, '0')} `;
        } else {
            line += ": *** ";
        }
      }
      this.print(line + ":");
      this.print("-------------------");
    }
  }

  private commandNav() {
    this.prompt("COURSE (1-9)", (cStr) => {
      const course = parseFloat(cStr);
      if (isNaN(course) || course < 1 || course >= 9) {
        this.print("   LT. SULU REPORTS, 'INCORRECT COURSE DATA, SIR!'");
        return;
      }
      
      const maxWarp = this.damage[0] < 0 ? 0.2 : 8;
      this.prompt(`WARP FACTOR (0-${maxWarp})`, (wStr) => {
        let warp = parseFloat(wStr);
        if (isNaN(warp) || warp < 0) return;
        if (this.damage[0] < 0 && warp > 0.2) {
           this.print("WARP ENGINES ARE DAMAGED. MAXIUM SPEED = WARP 0.2");
           return;
        }
        if (warp === 0) return;
        if (warp > 8) {
             this.print(`   CHIEF ENGINEER SCOTT REPORTS 'THE ENGINES WON'T TAKE WARP ${warp}!'`);
             return;
        }

        // Energy Calculation
        const dist = Math.floor(warp * 8 + 0.5); // BASIC uses logic N = INT(W1*8+.5)
        const energyCost = Math.floor(dist * dist * (dist / 8.0) + 10); // Simplified approximation of BASIC cost?? 
        // BASIC Line 2490: N=INT(W1*8+.5). IF E-N>=0... 
        // Wait, N is distance in tenths of quadrants? Or sector steps?
        // BASIC move logic is complex.
        // Let's use simpler vector math but respect the game's scale.
        // Course 1=Right(East), 3=Up(North), 5=Left(West), 7=Down(South).
        // Angle in radians:
        // 1 -> 0
        // 2 -> -PI/4 (Up-Right) -- Wait, standard unit circle is 0=Right, PI/2=Up.
        // 3 -> -PI/2 (Up)
        // This is clockwise starting from East = 1.
        // (Course - 1) * (-PI/4) ?
        // 1 -> 0
        // 2 -> -0.78 (SE?) No, 2 is Up-Right usually? 
        // Let's check BASIC:
        // C(1,1)=0, C(1,2)=1. Wait.
        // Lines 530-600 define C array vectors.
        // C(1,2)=1 (X=0, Y=1 -> Down?). BASIC coordinates: Y increases downwards? Usually.
        // If 3 is North, 7 is South.
        // 1 is East (X+), 5 is West (X-).
        
        // Let's just implement standard trigonometry mapped to the input.
        // 1=East (0 deg), increasing clockwise (like a compass but starting East?).
        // Actually, let's assume standard compass: 3=North, 1=East? 
        // Let's stick to the code.
        // X1 = C(C1,1)... 
        // Let's use simple math:
        // Angle = (1 - Course) * 45 degrees.
        // 1 -> 0 deg (East)
        // 2 -> -45 deg (North East)
        // 3 -> -90 deg (North)
        // ...
        
        const angle = (1 - course) * (Math.PI / 4);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle); // Y is down in screen coords usually, but let's check.
        // If 3 is North, Y should decrease. sin(-90) = -1. Correct.
        
        const energyRequired = Math.floor(warp * warp * warp * 10 + 10); // Heuristic
        if (this.energy < energyRequired) {
             this.print("ENGINEERING REPORTS   'INSUFFICIENT ENERGY AVAILABLE");
             this.print(`                       FOR MANEUVERING AT WARP ${warp}!'`);
             return;
        }
        
        // Move Step by Step
        this.energy -= energyRequired;
        this.klingonsMoveAndFire();
        this.repairSystem(warp); // Repair happens during Warp
        
        // Actual Move
        // Total distance in Quadrants = Warp * (Time step?).
        // In BASIC: T = T + 1 (if crossing quadrant) or T + 0.1 * Warp?
        // Line 3430: T8=1. IF W1<1 THEN T8=.1*INT(10*W1). T=T+T8.
        const timeSpent = warp < 1 ? 0.1 * Math.floor(10 * warp) : 1;
        this.stardate += timeSpent;
        if (this.stardate > this.stardateEnd) {
            this.gameOver();
            return;
        }

        // Move calculation
        // Position is (QuadX, QuadY) + (SectX, SectY)/8.
        // GlobalX = QuadX * 8 + SectX
        // GlobalY = QuadY * 8 + SectY
        let globalX = this.quadX * 8 + this.sectX;
        let globalY = this.quadY * 8 + this.sectY;
        
        const moveDist = warp * 8 * timeSpent; // Distance in sectors? 
        // Actually BASIC moves N steps. N = W1 * 8. 
        // So Warps are essentially "Quadrants per Time Unit" approx.
        
        const steps = Math.floor(warp * 8);
        const stepX = dx * moveDist / steps;
        const stepY = dy * moveDist / steps;
        
        let hitEdge = false;
        
        for (let i = 0; i < steps; i++) {
            globalX += stepX;
            globalY += stepY;
            
            // Check for star collision (only in current quadrant)
            // But we are moving potentially across quadrants.
            // Simplified: Just update position. collision check is hard across quadrants without generating them.
            // BASIC only checks collision in current quadrant?
            // Line 3170: Loop N. Update S1, S2. If S1<1... GOTO 3500 (New Quadrant).
            // Line 3240: Check for Star collision in CURRENT quadrant logic.
            
            // We'll just calculate final position for simplicity, stopping at quadrant boundaries if needed or updating quad.
        }
        
        // Calculate final Quad/Sect
        const finalQX = Math.floor(globalX / 8);
        const finalQY = Math.floor(globalY / 8);
        const finalSX = Math.floor(globalX % 8);
        const finalSY = Math.floor(globalY % 8);
        
        if (finalQX < 0 || finalQX > 7 || finalQY < 0 || finalQY > 7) {
            // Hit galactic barrier
             this.print("LT. UHURA REPORTS MESSAGE FROM STARFLEET COMMAND:");
             this.print("  'PERMISSION TO ATTEMPT CROSSING OF GALACTIC PERIMETER");
             this.print("  IS HEREBY *DENIED*.  SHUT DOWN YOUR ENGINES.'");
             // Bounce back? Or just stop at edge.
             this.quadX = Math.max(0, Math.min(7, finalQX));
             this.quadY = Math.max(0, Math.min(7, finalQY));
             this.sectX = 0; this.sectY = 0; // Reset sector
        } else {
             const changedQuad = (finalQX !== this.quadX || finalQY !== this.quadY);
             this.quadX = finalQX;
             this.quadY = finalQY;
             this.sectX = Math.floor(finalSX);
             this.sectY = Math.floor(finalSY);
             
             if (changedQuad) {
                 this.enterQuadrant();
             } else {
                 this.shortRangeScan();
             }
        }
      });
    });
  }

  private commandPhasers() {
    if (this.damage[3] < 0) {
        this.print("PHASERS INOPERATIVE");
        return;
    }
    if (this.localKlingons.length === 0) {
        this.print("SCIENCE OFFICER SPOCK REPORTS  'SENSORS SHOW NO ENEMY SHIPS");
        this.print("                                IN THIS QUADRANT'");
        return;
    }
    
    this.print(`PHASERS LOCKED ON TARGET;  ENERGY AVAILABLE = ${this.energy}`);
    this.prompt("NUMBER OF UNITS TO FIRE", (amtStr) => {
        let amt = parseInt(amtStr);
        if (isNaN(amt) || amt <= 0) return;
        if (amt > this.energy) {
            this.print("ENERGY AVAILABLE EXCEEDED.");
            return;
        }
        
        this.energy -= amt;
        
        // Distribute hit among klingons
        // BASIC splits amount by number of klingons? No.
        // Line 4450: H1 = INT(X/K3). Loop per klingon.
        // Hit = (H1 / Distance) * (RND + 2).
        
        const perKlingon = amt / this.localKlingons.length;
        
        for (let i = this.localKlingons.length - 1; i >= 0; i--) {
            const k = this.localKlingons[i];
            const dist = Math.sqrt(Math.pow(k.x - this.sectX, 2) + Math.pow(k.y - this.sectY, 2));
            let damage = Math.floor((perKlingon / dist) * (Math.random() + 2));
            
            if (damage > 0.15 * k.energy) {
                 this.print(`${damage} UNIT HIT ON KLINGON AT SECTOR ${k.x+1},${k.y+1}`);
                 k.energy -= damage;
                 if (k.energy <= 0) {
                     this.print("*** KLINGON DESTROYED ***");
                     this.localKlingons.splice(i, 1);
                     this.totalKlingons--;
                     this.galaxy[this.quadX][this.quadY] -= 100;
                     if (this.totalKlingons <= 0) {
                         this.winGame();
                         return;
                     }
                 } else {
                     this.print(`   (SENSORS SHOW ${Math.floor(k.energy)} UNITS REMAINING)`);
                 }
            } else {
                this.print(`SENSORS SHOW NO DAMAGE TO ENEMY AT ${k.x+1},${k.y+1}`);
            }
        }
        
        this.klingonsMoveAndFire();
    });
  }

  private commandTorpedo() {
     if (this.torpedoes <= 0) {
         this.print("ALL PHOTON TORPEDOES EXPENDED");
         return;
     }
     if (this.damage[4] < 0) {
         this.print("PHOTON TUBES ARE NOT OPERATIONAL");
         return;
     }
     
     this.prompt("PHOTON TORPEDO COURSE (1-9)", (cStr) => {
        const course = parseFloat(cStr);
        if (isNaN(course) || course < 1 || course >= 9) {
             this.print("ENSIGN CHEKOV REPORTS,  'INCORRECT COURSE DATA, SIR!'");
             return;
        }
        
        this.energy -= 2;
        this.torpedoes--;
        
        const angle = (1 - course) * (Math.PI / 4);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        
        this.print("TORPEDO TRACK:");
        
        let tx = this.sectX;
        let ty = this.sectY;
        
        let hit = false;
        
        // Move torpedo
        for (let step = 0; step < 10; step++) { // Range limit?
            tx += dx;
            ty += dy;
            const rx = Math.round(tx);
            const ry = Math.round(ty);
            
            if (rx < 0 || rx > 7 || ry < 0 || ry > 7) {
                this.print("TORPEDO MISSED");
                break;
            }
            
            this.print(`               ${rx+1},${ry+1}`);
            
            // Check Hit
            // Klingon?
            const kIdx = this.localKlingons.findIndex(k => k.x === rx && k.y === ry);
            if (kIdx !== -1) {
                this.print("*** KLINGON DESTROYED ***");
                this.localKlingons.splice(kIdx, 1);
                this.totalKlingons--;
                this.galaxy[this.quadX][this.quadY] -= 100;
                hit = true;
                if (this.totalKlingons <= 0) this.winGame();
                break;
            }
            
            // Star?
            if (this.localStars.some(s => s.x === rx && s.y === ry)) {
                this.print(`STAR AT ${rx+1},${ry+1} ABSORBED TORPEDO ENERGY.`);
                hit = true;
                break;
            }
            
            // Starbase?
            const bIdx = this.localStarbases.findIndex(b => b.x === rx && b.y === ry);
            if (bIdx !== -1) {
                this.print("*** STARBASE DESTROYED ***");
                this.localStarbases.splice(bIdx, 1);
                this.totalStarbases--;
                this.galaxy[this.quadX][this.quadY] -= 10;
                this.print("THAT DOES IT, CAPTAIN!!  YOU ARE HEREBY RELIEVED OF COMMAND");
                this.print("AND SENTENCED TO 99 STARDATES AT HARD LABOR ON CYGNUS 12!!");
                this.state = 'ENDED';
                hit = true;
                break;
            }
        }
        
        if (!hit) {
             // Redraw track? No need, printed as we went.
        }
        
        this.klingonsMoveAndFire();
     });
  }

  private commandShields() {
      if (this.damage[6] < 0) {
          this.print("SHIELD CONTROL INOPERABLE");
          return;
      }
      this.print(`ENERGY AVAILABLE = ${this.energy + this.shields}`);
      this.prompt("NUMBER OF UNITS TO SHIELDS", (val) => {
          const amt = parseInt(val);
          if (isNaN(amt) || amt < 0) {
              this.print("<SHIELDS UNCHANGED>");
              return;
          }
          if (amt > this.energy + this.shields) {
              this.print("SHIELD CONTROL REPORTS  'THIS IS NOT THE FEDERATION TREASURY.'");
              this.print("<SHIELDS UNCHANGED>");
              return;
          }
          
          this.energy = (this.energy + this.shields) - amt;
          this.shields = amt;
          this.print("DEFLECTOR CONTROL ROOM REPORT:");
          this.print(`  'SHIELDS NOW AT ${this.shields} UNITS PER YOUR COMMAND.'`);
      });
  }

  private commandDamage() {
    this.print("DEVICE             STATE OF REPAIR");
    for (let i = 0; i < 8; i++) {
        let state = (Math.floor(this.damage[i] * 100) / 100).toString();
        this.print(`${this.damageNames[i].padEnd(25)} ${state}`);
    }
  }

  private commandComputer() {
      if (this.damage[7] < 0) {
          this.print("COMPUTER DISABLED");
          return;
      }
      this.print("FUNCTIONS AVAILABLE FROM LIBRARY-COMPUTER:");
      this.print("   0 = CUMULATIVE GALACTIC RECORD");
      this.print("   1 = STATUS REPORT");
      this.print("   2 = PHOTON TORPEDO DATA"); // Not implementing all calculator features yet
      this.print("   3 = STARBASE NAV DATA");
      this.print("   4 = DIRECTION/DISTANCE CALCULATOR");
      
      this.prompt("COMPUTER ACTIVE AND AWAITING COMMAND", (val) => {
          if (val === '0') {
               // Galaxy Map
               this.print("COMPUTER RECORD OF GALAXY");
               this.print("       1     2     3     4     5     6     7     8");
               this.print("     ----- ----- ----- ----- ----- ----- ----- -----");
               for (let i = 0; i < 8; i++) {
                   let line = `${i+1}  `;
                   for (let j = 0; j < 8; j++) {
                       if (this.knownGalaxy[i][j] !== 0) {
                           line += `   ${this.knownGalaxy[i][j].toString().padStart(3, '0')}`;
                       } else {
                           line += "   ***";
                       }
                   }
                   this.print(line);
               }
          } else if (val === '1') {
              this.print("   STATUS REPORT:");
              this.print(`KLINGONS LEFT: ${this.totalKlingons}`);
              this.print(`MISSION MUST BE COMPLETED IN ${Math.floor((this.stardateEnd - this.stardate)*10)/10} STARDATES`);
              this.print(`THE FEDERATION IS MAINTAINING ${this.totalStarbases} STARBASES IN THE GALAXY`);
          } else {
              this.print("FUNCTION NOT IMPLEMENTED YET");
          }
      });
  }

  // --- Game Mechanics ---

  private klingonsMoveAndFire() {
      if (this.localKlingons.length === 0) return;
      
      // Klingon Turn
      // Move? BASIC line 2590 just fires. It says "KLINGONS MOVE/FIRE" but code mainly fires.
      
      for (const k of this.localKlingons) {
          const dist = Math.sqrt(Math.pow(k.x - this.sectX, 2) + Math.pow(k.y - this.sectY, 2));
          // Hit energy
          const hit = Math.floor((k.energy / dist) * (2 + Math.random()));
          this.shields -= hit;
          k.energy /= (3 + Math.random()); // Deplete Klingon energy
          
          this.print(`${hit} UNIT HIT ON ENTERPRISE FROM SECTOR ${k.x+1},${k.y+1}`);
          if (this.shields < 0) {
               this.print("      <SHIELDS DOWN TO 0 UNITS>"); // Or negative
               this.gameOver();
               return;
          } else {
              this.print(`      <SHIELDS DOWN TO ${Math.floor(this.shields)} UNITS>`);
          }
      }
  }
  
  private repairSystem(time: number) {
      // BASIC repairs devices over time
      for (let i = 0; i < 8; i++) {
          if (this.damage[i] < 0) {
              this.damage[i] += time; // Simple repair
              if (this.damage[i] > -0.1 && this.damage[i] < 0) this.damage[i] = -0.1;
              if (this.damage[i] >= 0) {
                  this.damage[i] = 0;
                  this.print(`DAMAGE CONTROL REPORT: ${this.damageNames[i]} REPAIR COMPLETED.`);
              }
          }
      }
      
      // Random damage?
      if (Math.random() > 0.9) {
          const dev = Math.floor(Math.random() * 8);
          this.damage[dev] -= (Math.random() * 5 + 1);
          this.print(`DAMAGE CONTROL REPORT: ${this.damageNames[dev]} DAMAGED`);
      }
  }

  private gameOver() {
      this.print("");
      this.print("IT IS STARDATE " + this.stardate);
      this.print("THE ENTERPRISE HAS BEEN DESTROYED. THE FEDERATION WILL BE CONQUERED.");
      this.print(`THERE WERE ${this.totalKlingons} KLINGON BATTLE CRUISERS LEFT.`);
      this.state = 'ENDED';
  }

  private winGame() {
      this.print("");
      this.print("CONGRATULATION, CAPTAIN!  THE LAST KLINGON BATTLE CRUISER");
      this.print("MENACING THE FEDERATION HAS BEEN DESTROYED.");
      // Efficiency rating
      const efficiency = 1000 * Math.pow(this.startKlingons / (this.stardate - this.stardateStart), 2);
      this.print(`YOUR EFFICIENCY RATING IS ${Math.floor(efficiency)}`);
      this.state = 'ENDED';
  }

}
