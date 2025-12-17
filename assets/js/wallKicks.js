// Simplified Wall Kick System - Safe rotation without teleportation
export class WallKickSystem {
    // This class is kept for compatibility but the complex logic has been moved to controls.js
    // The new system only uses basic, safe kicks that don't risk teleportation through walls
    
    static getPrioritizedKickTests(pieceType, currentShape, board, piece, rotatedShape) {
        // Return empty array - not used in the new simplified system
        return [];
    }
}