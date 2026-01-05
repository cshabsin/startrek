
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

  public getSectorData() {
      return {
          x: this.sectX,
          y: this.sectY,
          klingons: [...this.localKlingons],
          starbases: [...this.localStarbases],
          stars: [...this.localStars]
      };
  }

  public getDamageReport() {
      return this.damage.map((val, i) => ({ name: this.damageNames[i], value: val }));
  }

  public getMissionStats() {
      return {
          stardate: this.stardate,
          stardateEnd: this.stardateEnd,
          daysLeft: Math.floor((this.stardateEnd - this.stardate) * 10) / 10,
          klingonsLeft: this.totalKlingons,
          klingonsStart: this.startKlingons,
          starbases: this.totalStarbases,
          dockStatus: this.dockStatus,
          condition: this.getCondition()
      };
  }

  public getLRSData() {
    if (this.damage[2] < 0) return null;
    const data = [];
    for (let y = this.quadY - 1; y <= this.quadY + 1; y++) {
      const row = [];
      for (let x = this.quadX - 1; x <= this.quadX + 1; x++) {
        if (x >= 0 && x <= 7 && y >= 0 && y <= 7) {
            this.knownGalaxy[x][y] = this.galaxy[x][y];
            row.push(this.galaxy[x][y]);
        } else {
            row.push(-1); // Out of bounds
        }
      }
      data.push(row);
    }
    return data;
  }

  public getGalaxyMap() {
    return this.knownGalaxy.map(col => [...col]);
  }

  public executeNav(course: number, warp: number) {
        if (isNaN(course) || course < 1 || course >= 9) {
            this.print("   LT. SULU REPORTS, 'INCORRECT COURSE DATA, SIR!'");
            return;
        }
        if (isNaN(warp) || warp < 0) return;
        
        const maxWarp = this.damage[0] < 0 ? 0.2 : 8;
        if (this.damage[0] < 0 && warp > 0.2) {
           this.print("WARP ENGINES ARE DAMAGED. MAXIUM SPEED = WARP 0.2");
           return;
        }
        if (warp === 0) return;
        if (warp > 8) {
             this.print(`   CHIEF ENGINEER SCOTT REPORTS 'THE ENGINES WON'T TAKE WARP ${warp}!'`);
             return;
        }

        const angle = (1 - course) * (Math.PI / 4);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle); 
        
        const energyRequired = Math.floor(warp * warp * warp * 10 + 10); 
        if (this.energy < energyRequired) {
             this.print("ENGINEERING REPORTS   'INSUFFICIENT ENERGY AVAILABLE");
             this.print(`                       FOR MANEUVERING AT WARP ${warp}!'`);
             return;
        }
        
        this.energy -= energyRequired;
        this.klingonsMoveAndFire();
        this.repairSystem(warp); 
        
        const timeSpent = warp < 1 ? 0.1 * Math.floor(10 * warp) : 1;
        this.stardate += timeSpent;
        if (this.stardate > this.stardateEnd) {
            this.gameOver();
            return;
        }

        let globalX = this.quadX * 8 + this.sectX;
        let globalY = this.quadY * 8 + this.sectY;
        
        const moveDist = warp * 8 * timeSpent; 
        
        const steps = Math.floor(warp * 8);
        const stepX = dx * moveDist / steps;
        const stepY = dy * moveDist / steps;
        
        for (let i = 0; i < steps; i++) {
            globalX += stepX;
            globalY += stepY;
        }
        
        const finalQX = Math.floor(globalX / 8);
        const finalQY = Math.floor(globalY / 8);
        const finalSX = Math.floor(globalX % 8);
        const finalSY = Math.floor(globalY % 8);
        
        if (finalQX < 0 || finalQX > 7 || finalQY < 0 || finalQY > 7) {
             this.print("LT. UHURA REPORTS MESSAGE FROM STARFLEET COMMAND:");
             this.print("  'PERMISSION TO ATTEMPT CROSSING OF GALACTIC PERIMETER");
             this.print("  IS HEREBY *DENIED*.  SHUT DOWN YOUR ENGINES.'");
             this.quadX = Math.max(0, Math.min(7, finalQX));
             this.quadY = Math.max(0, Math.min(7, finalQY));
             this.sectX = 0; this.sectY = 0; 
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
  }

  private commandNav() {
    this.prompt("COURSE (1-9)", (cStr) => {
      const course = parseFloat(cStr);
      const maxWarp = this.damage[0] < 0 ? 0.2 : 8;
      this.prompt(`WARP FACTOR (0-${maxWarp})`, (wStr) => {
        const warp = parseFloat(wStr);
        this.executeNav(course, warp);
      });
    });
  }

  public executePhasers(amt: number) {
    if (this.damage[3] < 0) {
        this.print("PHASERS INOPERATIVE");
        return;
    }
    if (this.localKlingons.length === 0) {
        this.print("SCIENCE OFFICER SPOCK REPORTS  'SENSORS SHOW NO ENEMY SHIPS");
        this.print("                                IN THIS QUADRANT'");
        return;
    }
    
    if (isNaN(amt) || amt <= 0) return;
    if (amt > this.energy) {
        this.print("ENERGY AVAILABLE EXCEEDED.");
        return;
    }
    
    this.energy -= amt;
    this.print(`PHASERS FIRED: ${amt} UNITS.`);
    
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
        const amt = parseInt(amtStr);
        this.executePhasers(amt);
    });
  }

  public executeTorpedo(course: number) {
     if (this.torpedoes <= 0) {
         this.print("ALL PHOTON TORPEDOES EXPENDED");
         return;
     }
     if (this.damage[4] < 0) {
         this.print("PHOTON TUBES ARE NOT OPERATIONAL");
         return;
     }
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
        
     for (let step = 0; step < 10; step++) { 
            tx += dx;
            ty += dy;
            const rx = Math.round(tx);
            const ry = Math.round(ty);
            
            if (rx < 0 || rx > 7 || ry < 0 || ry > 7) {
                this.print("TORPEDO MISSED");
                break;
            }
            
            this.print(`               ${rx+1},${ry+1}`);
            
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
            
            if (this.localStars.some(s => s.x === rx && s.y === ry)) {
                this.print(`STAR AT ${rx+1},${ry+1} ABSORBED TORPEDO ENERGY.`);
                hit = true;
                break;
            }
            
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
        
     this.klingonsMoveAndFire();
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
        this.executeTorpedo(course);
     });
  }

  public executeShields(amt: number) {
      if (this.damage[6] < 0) {
          this.print("SHIELD CONTROL INOPERABLE");
          return;
      }
      
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
  }

  private commandShields() {
      if (this.damage[6] < 0) {
          this.print("SHIELD CONTROL INOPERABLE");
          return;
      }
      this.print(`ENERGY AVAILABLE = ${this.energy + this.shields}`);
      this.prompt("NUMBER OF UNITS TO SHIELDS", (val) => {
          const amt = parseInt(val);
          this.executeShields(amt);
      });
  }

  private commandDamage() {
    this.print("DEVICE             STATE OF REPAIR");
    for (let i = 0; i < 8; i++) {
        let state = (Math.floor(this.damage[i] * 100) / 100).toString();
        this.print(`${this.damageNames[i].padEnd(25)} ${state}`);
    }
  }

  public executeComputer(val: string) {
      if (this.damage[7] < 0) {
          this.print("COMPUTER DISABLED");
          return;
      }
      if (val === '0') {
            // Galaxy Map
            this.print("COMPUTER RECORD OF GALAXY");
            this.print("       1     2     3     4     5     6     7     8");
            this.print("     ----- ----- ----- ----- ----- ----- ----- -----");
            for (let i = 0; i < 8; i++) {
                let line = `${i+1}  `;
                for (let j = 0; j < 8; j++) {
                    if (this.knownGalaxy[j][i] !== 0) {
                        line += `   ${this.knownGalaxy[j][i].toString().padStart(3, '0')}`;
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
          // Also print damage report
          this.print("DEVICE             STATE OF REPAIR");
          for (let i = 0; i < 8; i++) {
              let state = (Math.floor(this.damage[i] * 100) / 100).toString();
              this.print(`${this.damageNames[i].padEnd(25)} ${state}`);
          }
      } else if (val === '2') {
          // Photon Torpedo Data
          if (this.localKlingons.length === 0) {
              this.print("SCIENCE OFFICER SPOCK REPORTS  'SENSORS SHOW NO ENEMY SHIPS");
              this.print("                                IN THIS QUADRANT'");
              return;
          }
          this.print("FROM ENTERPRISE TO KLINGON BATTLE CRUISER(S)");
          for (const k of this.localKlingons) {
              this.printDistDir(this.sectX, this.sectY, k.x, k.y);
          }
      } else if (val === '3') {
          // Starbase Nav Data
          if (this.localStarbases.length === 0) {
              this.print("MR. SPOCK REPORTS,  'SENSORS SHOW NO STARBASES IN THIS");
              this.print(" QUADRANT.'");
              return;
          }
          this.print("FROM ENTERPRISE TO STARBASE:");
          for (const b of this.localStarbases) {
              this.printDistDir(this.sectX, this.sectY, b.x, b.y);
          }
      } else if (val === '4') {
          // Direction/Distance Calculator
          this.print("DIRECTION/DISTANCE CALCULATOR:");
          this.print(`YOU ARE AT QUADRANT ${this.quadX + 1},${this.quadY + 1} SECTOR ${this.sectX + 1},${this.sectY + 1}`);
          this.prompt("PLEASE ENTER INITIAL COORDINATES (X,Y)", (initStr) => {
              const [ix, iy] = initStr.split(',').map(s => parseFloat(s) - 1); 
              this.prompt("PLEASE ENTER FINAL COORDINATES (X,Y)", (finalStr) => {
                  const [fx, fy] = finalStr.split(',').map(s => parseFloat(s) - 1);
                  if (isNaN(ix) || isNaN(iy) || isNaN(fx) || isNaN(fy)) {
                      this.print("INVALID COORDINATES");
                      return;
                  }
                  this.printDistDir(ix, iy, fx, fy);
              });
          });
      } else if (val === '5') {
          // Galaxy Region Name Map
          this.print("                        THE GALAXY");
          this.print("       1     2     3     4     5     6     7     8");
          this.print("     ----- ----- ----- ----- ----- ----- ----- -----");
          for (let i = 0; i < 8; i++) {
               let line = `${i+1}  `;
               for (let j = 0; j < 8; j++) {
                   const name = this.getRegionName(j, i);
                   line += `   ${name.substring(0, 3).padEnd(3, ' ')}`; 
               }
               this.print(line);
          }
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
      this.print("   2 = PHOTON TORPEDO DATA"); 
      this.print("   3 = STARBASE NAV DATA");
      this.print("   4 = DIRECTION/DISTANCE CALCULATOR");
      this.print("   5 = GALAXY 'REGION NAME' MAP");
      
      this.prompt("COMPUTER ACTIVE AND AWAITING COMMAND", (val) => {
          this.executeComputer(val);
      });
  }

  private printDistDir(x1: number, y1: number, x2: number, y2: number) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      // Direction:
      // 1=East(0), 3=North(-PI/2), 5=West(PI), 7=South(PI/2)
      // Math.atan2(dy, dx) gives angle in radians from X+ axis.
      // angle 0 -> East -> Course 1.
      // angle -PI/2 -> North -> Course 3.
      // angle PI -> West -> Course 5.
      // angle PI/2 -> South -> Course 7.
      // Formula: Course = 1 - angle / (PI/4).
      // Check: 1 - (-PI/2)/(PI/4) = 1 - (-2) = 3. Correct.
      // Check: 1 - (PI)/(PI/4) = 1 - 4 = -3 -> +8 = 5. Correct.
      let angle = Math.atan2(dy, dx);
      let course = 1 - angle / (Math.PI / 4);
      if (course < 1) course += 8;
      
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      this.print(`DIRECTION = ${course.toFixed(2)}`);
      this.print(`DISTANCE = ${dist.toFixed(2)}`);
  }

  private getRegionName(x: number, y: number): string {
      // x, y are 0-7. BASIC uses 1-8.
      const row = y + 1;
      const col = x + 1;
      
      const leftNames = [
          "ANTARES", "RIGEL", "PROCYON", "VEGA", 
          "CANOPUS", "ALTAIR", "SAGITTARIUS", "POLLUX"
      ];
      const rightNames = [
          "SIRIUS", "DENEB", "CAPELLA", "BETELGEUSE", 
          "ALDEBARAN", "REGULUS", "ARCTURUS", "SPICA"
      ];
      
      if (col <= 4) return leftNames[row - 1] || "UNKNOWN";
      return rightNames[row - 1] || "UNKNOWN";
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
