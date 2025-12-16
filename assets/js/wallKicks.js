// Wall Kick System - Handles rotation wall kicks for Tetris pieces
export class WallKickSystem {
    static getWallKickTests(pieceType, currentShape) {
        // Standard wall kick patterns for different piece types
        // Based on SRS (Super Rotation System) with simplified patterns
        switch (pieceType) {
            case 'I':
                // I-piece has special extended kicks based on current orientation
                // Check if piece is horizontal (1 row, 4 columns) or vertical (4 rows, 1 column)
                const isHorizontal = currentShape.length === 1;
                
                if (isHorizontal) {
                    // Horizontal to vertical rotation needs more extensive kicks
                    return [
                        [-1, 0], [1, 0],   // Left/right kicks
                        [-2, 0], [2, 0],   // Extended left/right kicks
                        [0, -1],          // Up kick
                        [-1, -1], [1, -1] // Diagonal kicks
                    ];
                } else {
                    // Vertical to horizontal rotation
                    // Prioritize left kicks when near right wall
                    return [
                        [-1, 0], [-2, 0], [-3, 0],   // Left kicks (prioritized)
                        [1, 0], [2, 0],               // Right kicks
                        [0, -1],                      // Up kick
                        [-1, -1], [1, -1]             // Diagonal kicks
                    ];
                }
            case 'O':
                // O-piece doesn't rotate, but include for completeness
                return [];
            default:
                // Standard kicks for J, L, S, T, Z pieces
                return [
                    [-1, 0], [1, 0],   // Left/right kicks
                    [0, -1],          // Up kick
                    [-1, -1], [1, -1] // Diagonal kicks
                ];
        }
    }
}