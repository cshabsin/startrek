
/**
 * Calculates the course (1-9) for the original BASIC Star Trek navigation algorithm.
 * 
 * The coordinate system is:
 * X grows to the right (East).
 * Y grows down (South).
 * 
 * Course mapping:
 * 1: East (0) -> dx=1, dy=0
 * 2: North-East (45) -> dx=1, dy=-1 (BASIC Y is inverted relative to Cartesian?)
 *    Wait, in BASIC:
 *    C(1) = 0,1 (Row, Col) -> dy=0, dx=1. East.
 *    C(2) = -1,1 -> dy=-1, dx=1. North-East.
 *    C(3) = -1,0 -> dy=-1, dx=0. North.
 *    C(7) = 1,0 -> South.
 * 
 * So Y decreases going North. This matches screen coordinates.
 */
export const calculateBasicCourse = (dx: number, dy: number): number => {
    if (dx === 0 && dy === 0) return 1;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    
    if (adx >= ady) {
        // Major axis X
        if (dx > 0) {
            // East-ish (1)
            // If dy=0 -> 1. If dy=-1 (North) -> 2.
            // 1 - (-1)/1 = 2. Correct.
            // If dy=1 (South) -> 8?
            // 1 - 1/1 = 0 -> 0 maps to 8?
            // Logic: 1 - dy/dx.
            // If dy is positive (South), course should be > 1? No, South is 7.
            // East is 1. South East is 8.
            // 1 - 1 = 0.
            // We need 8.
            // The helper in ModernInterface handles this via `9 - dy/dx`?
            return (dy <= 0) ? 1 - dy/dx : 9 - dy/dx;
        } else {
            // West-ish (5)
            // dx < 0.
            // West is 5.
            // North-West (4): dy=-1.
            // 5 - (-1)/(-1) = 5 - 1 = 4. Correct.
            // South-West (6): dy=1.
            // 5 - 1/(-1) = 5 + 1 = 6. Correct.
            return 5 - dy/dx;
        }
    } else {
        // Major axis Y
        if (dy < 0) {
            // North-ish (3)
            // North is 3.
            // North-East (2): dx=1.
            // 3 + 1/(-1) = 2. Correct.
            // North-West (4): dx=-1.
            // 3 + (-1)/(-1) = 4. Correct.
            return 3 + dx/dy;
        } else {
            // South-ish (7)
            // South is 7.
            // South-East (8): dx=1.
            // 7 + 1/1 = 8. Correct.
            // South-West (6): dx=-1.
            // 7 + (-1)/1 = 6. Correct.
            return 7 + dx/dy;
        }
    }
};

/**
 * Calculates the exact warp factor required to travel a given distance 
 * in the Chebyshev (chessboard) metric used by the BASIC engine.
 * 
 * @param dx Sector distance in X
 * @param dy Sector distance in Y
 * @returns Warp factor (where 1.0 = 8 sectors)
 */
export const calculateWarp = (dx: number, dy: number): number => {
    // Distance in sectors (Chebyshev)
    const distSectors = Math.max(Math.abs(dx), Math.abs(dy));
    return distSectors / 8;
};
