
import { StarTrekGame } from '../lib/startrek';
import { calculateBasicCourse, calculateWarp } from '../lib/navigation-utils';

const clearGame = (game: StarTrekGame) => {
    // Clear current sector entities
    (game as any).localKlingons = [];
    (game as any).localStarbases = [];
    (game as any).localStars = [];
    
    // Clear entire galaxy map to prevent spawning new things when entering quadrants
    // galaxy format: K*100 + B*10 + S
    // Set to 0 (0K, 0B, 0S)
    for(let x=0; x<8; x++) {
        for(let y=0; y<8; y++) {
            if ((game as any).galaxy && (game as any).galaxy[x]) {
                (game as any).galaxy[x][y] = 0;
            }
        }
    }
};

const runTest = (name: string, startQ: [number, number], startS: [number, number], targetQ: [number, number], expectedQ: [number, number]) => {
    const game = new StarTrekGame();
    
    // Force position
    game.quadX = startQ[0];
    game.quadY = startQ[1];
    game.sectX = startS[0];
    game.sectY = startS[1];
    
    // Ensure clear path
    clearGame(game);
    
    // Simulate Galaxy Map Click Logic
    const dxSectors = (targetQ[0] - startQ[0]) * 8;
    const dySectors = (targetQ[1] - startQ[1]) * 8;
    
    const course = calculateBasicCourse(dxSectors, dySectors);
    const warp = calculateWarp(dxSectors, dySectors);
    
    console.log(`[${name}] Start: Q${startQ.join(',')} S${startS.join(',')} -> Target Q${targetQ.join(',')}`);
    console.log(`[${name}] Calculated Course: ${course.toFixed(2)}, Warp: ${warp.toFixed(3)}`);
    
    // Execute
    game.executeNav(course, warp, true);
    
    const finalQ = [game.quadX, game.quadY];
    const finalS = [game.sectX, game.sectY];
    
    const passed = finalQ[0] === expectedQ[0] && finalQ[1] === expectedQ[1];
    console.log(`[${name}] Result: Q${finalQ.join(',')} S${finalS.join(',')} - ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) {
        console.error(`Expected Q${expectedQ.join(',')}, got Q${finalQ.join(',')}`);
    }
    console.log('---');
};

console.log('Running Navigation Unit Tests...\n');

// 1. East 1 Quadrant (0,0 -> 1,0)
runTest('East 1 Quad', [0,0], [3,3], [1,0], [1,0]);

// 2. South-East 1 Quadrant (0,0 -> 1,1)
runTest('SE 1 Quad', [0,0], [3,3], [1,1], [1,1]);

// 3. User Report: 8,1 (7,0) -> 5,3 (4,2). Start Sector 3,6 (2,5).
// dx = 4-7 = -3. dy = 2-0 = 2.
// Expected: 4,2.
runTest('User Report 8,1->5,3', [7,0], [2,5], [4,2], [4,2]);

// 4. Boundary Check: 4,4 -> 0,0
runTest('NW 4 Quad', [4,4], [0,0], [0,0], [0,0]);

// 5. Shallow Angle: 0,0 -> 4,1
runTest('Shallow Angle 0,0 -> 4,1', [0,0], [4,4], [4,1], [4,1]);

// 6. Perimeter Clamp: 0,0 -> -1,0
// Should stay in 0,0 (clamped)
runTest('Perimeter Clamp West', [0,0], [0,0], [-1,0], [0,0]);

// 7. Request: dx = -2, dy = -3
// Start at 4,4, target 2,1
runTest('West-North-West 2,3', [4,4], [0,0], [2,1], [2,1]);

// --- Galaxy Map Scenarios ---

// 8. Corner to Corner (0,0 -> 7,7)
// Should move from top-left of galaxy to bottom-right, preserving sector 0,0
runTest('Galaxy Map: Corner to Corner', [0,0], [0,0], [7,7], [7,7]);

// 9. Far East with Offset (0,0 -> 7,0)
// Start at Sector 4,4. Should land at Sector 4,4 in Quadrant 7,0.
runTest('Galaxy Map: Far East (Sector Preservation)', [0,0], [4,4], [7,0], [7,0]);

// 10. Knight's Move (0,0 -> 1,2)
// Start Sector 2,2. Target Q1,2.
runTest('Galaxy Map: Knight Move', [0,0], [2,2], [1,2], [1,2]);

