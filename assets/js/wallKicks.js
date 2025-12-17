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

    static hasNearbyObstructions(board, piece, rotatedShape) {
        // Check for nearby filled blocks that would interfere with rotation
        // This helps determine if wall kicks are needed due to block congestion
        const { x, y } = piece;
        const { width, height, grid } = board;
        
        // Get the bounds of current and rotated shapes
        const currentBounds = this.getShapeBounds(piece.shape, x, y);
        const rotatedBounds = this.getShapeBounds(rotatedShape, x, y);
        
        // Expand bounds to check nearby cells (1 cell buffer around shapes)
        const minX = Math.max(0, Math.min(currentBounds.minX, rotatedBounds.minX) - 1);
        const maxX = Math.min(width - 1, Math.max(currentBounds.maxX, rotatedBounds.maxX) + 1);
        const minY = Math.max(0, Math.min(currentBounds.minY, rotatedBounds.minY) - 1);
        const maxY = Math.min(height - 1, Math.max(currentBounds.maxY, rotatedBounds.maxY) + 1);
        
        // Count filled blocks in the expanded area
        let nearbyBlockCount = 0;
        for (let checkY = minY; checkY <= maxY; checkY++) {
            for (let checkX = minX; checkX <= maxX; checkX++) {
                // Skip cells that are part of either shape
                if (this.isInShape(piece.shape, checkX - x, checkY - y)) continue;
                if (this.isInShape(rotatedShape, checkX - x, checkY - y)) continue;
                
                if (grid[checkY][checkX]) {
                    nearbyBlockCount++;
                }
            }
        }
        
        return nearbyBlockCount;
    }

    static getShapeBounds(shape, offsetX, offsetY) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    const worldX = offsetX + px;
                    const worldY = offsetY + py;
                    minX = Math.min(minX, worldX);
                    maxX = Math.max(maxX, worldX);
                    minY = Math.min(minY, worldY);
                    maxY = Math.max(maxY, worldY);
                }
            }
        }
        
        return { minX, maxX, minY, maxY };
    }

    static isInShape(shape, localX, localY) {
        if (localY < 0 || localY >= shape.length) return false;
        if (localX < 0 || localX >= shape[localY].length) return false;
        return shape[localY][localX] === 1;
    }

    static getPrioritizedKickTests(pieceType, currentShape, board, piece, rotatedShape) {
        const baseTests = this.getWallKickTests(pieceType, currentShape);
        const nearbyObstructions = this.hasNearbyObstructions(board, piece, rotatedShape);
        
        // If there are many nearby blocks, prioritize kicks that move away from congestion
        if (nearbyObstructions > 0) {
            // For pieces with many nearby blocks, prioritize kicks that create more space
            return this.adjustKickPriorities(baseTests, piece, board, nearbyObstructions);
        }
        
        return baseTests;
    }

    static adjustKickPriorities(kickTests, piece, board, obstructionCount) {
        // Adjust kick priorities based on nearby obstructions
        // Moves away from walls and into open spaces are prioritized
        const { x, y } = piece;
        const { width, height, grid } = board;
        
        const prioritizedTests = [...kickTests].sort((a, b) => {
            const [ax, ay] = a;
            const [bx, by] = b;
            
            // Calculate space availability for each kick position
            const spaceA = this.calculateSpaceScore(x + ax, y + ay, grid, width, height);
            const spaceB = this.calculateSpaceScore(x + bx, y + by, grid, width, height);
            
            return spaceB - spaceA; // Higher space score first
        });
        
        return prioritizedTests;
    }

    static calculateSpaceScore(x, y, grid, width, height) {
        // Calculate how much space is available around a position
        let score = 0;
        const checkRadius = 2;
        
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < height) {
                    if (!grid[checkY][checkX]) {
                        score++; // Empty space increases score
                    } else {
                        score--; // Filled space decreases score
                    }
                } else {
                    score -= 2; // Out of bounds heavily penalized
                }
            }
        }
        
        return score;
    }
}