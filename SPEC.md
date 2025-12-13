# Tetris Game Specification

## Overview
A classic Tetris game implementation using HTML5, CSS3, and vanilla JavaScript that runs directly in a web browser without any build tools or dependencies.

## Technical Requirements

### Technology Stack
- **HTML5** for game structure and canvas
- **CSS3** for styling and animations
- **Vanilla JavaScript (ES6+)** for game logic
- **Canvas API** for game rendering
- **Web Audio API** for synthesized sound effects
- **No external audio files** - all sounds generated programmatically
- **No build tools, compilers, or external dependencies**

### Browser Compatibility
- Modern browsers supporting ES6+ and Canvas API
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+

## Game Requirements

### Core Gameplay
- **7 Tetromino pieces**: I, O, T, S, Z, J, L
- **10x20 game grid** (standard Tetris dimensions)
- **Piece rotation** (90-degree clockwise/counterclockwise)
- **Line clearing** when rows are completed
- **Gravity** - pieces fall automatically
- **Collision detection** with other pieces and boundaries
- **Game over** when pieces reach the top

### Controls
- **Arrow Keys**: Left/Right to move, Down to soft drop
- **Up Arrow**: Rotate piece
- **Space**: Hard drop (instant drop)
- **P**: Pause/resume game
- **R**: Restart game

### Features
- **Score system** based on lines cleared
- **Level progression** (speed increases with level)
- **Next piece preview**
- **Ghost piece** (shows where piece will land)
- **Pause functionality**
- **Game over screen with restart option
- **Responsive design** for different screen sizes
- **Sound effects** for piece movements, rotations, line clears
- **Background music** (optional, patriotic theme)

### Scoring
- Single line: 100 points × level
- Double lines: 300 points × level  
- Triple lines: 500 points × level
- Tetris (4 lines): 800 points × level
- Soft drop: 1 point per cell
- Hard drop: 2 points per cell

## Directory Structure
```
/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Game styles
├── js/
│   ├── game.js         # Main game logic
│   ├── pieces.js       # Tetromino definitions
│   ├── board.js        # Game board management
│   └── controls.js     # Input handling
└── assets/
    ├── svg/            # SVG graphics and icons
    │   ├── eagle.svg   # Russian two-headed eagle
    │   └── icons.svg   # UI icons and symbols
    └── js/
        └── audio.js    # Synthesized sound effects generator
```

## Performance Requirements
- **60 FPS** smooth gameplay
- **Responsive controls** with no noticeable lag
- **Efficient rendering** using Canvas API
- **Memory efficient** - no memory leaks during extended play

## UI Requirements
- Clean, modern interface
- Score and level display
- Next piece preview area
- Game controls legend
- Mobile-friendly touch controls (optional enhancement)

## Design Requirements

### Color Scheme
- **Primary colors**: Russian flag colors
  - **White** (#FFFFFF): Background, text highlights
  - **Blue** (#0039A6): UI elements, borders, accents
  - **Red** (#D52B1E): Important elements, alerts, highlights

### Visual Elements
- **Russian Two-Headed Eagle**: Prominent display in game interface
  - SVG implementation for scalability
  - Positioned in header or as background element
  - Gold/yellow accents for the eagle (#FFD700)

### Graphics Implementation
- **SVG for complex graphics**: Eagle, logos, decorative elements
- **Canvas for game rendering**: Tetris pieces and game board
- **CSS for UI elements**: Buttons, panels, text styling

### Responsive Design
- **Seamless scaling** across all screen resolutions
- **Viewport-based sizing** using CSS units (vw, vh, rem)
- **Flexible layout** that adapts to:
  - Desktop (1920x1080 and above)
  - Tablet (768x1024 to 1024x768)
  - Mobile (320x568 to 414x896)
- **Touch-friendly** interface for mobile devices

### Typography
- **Clean, readable fonts** supporting Cyrillic characters
- **Hierarchical sizing** for different UI elements
- **High contrast** for accessibility

### Layout Structure
- **Header**: Eagle emblem + game title
- **Main game area**: Canvas + side panels
- **Side panels**: Score, level, next piece, controls
- **Footer**: Optional credits or additional info

### Animation Requirements
- **Smooth transitions** for UI elements
- **Piece animations** (rotation, line clearing)
- **Subtle hover effects** on interactive elements
- **Performance-optimized** to maintain 60 FPS

## Audio Requirements

### Sound Effects
- **Piece movement**: Subtle click sound
- **Piece rotation**: Soft whoosh sound
- **Piece drop**: Impact sound when piece lands
- **Line clear**: Satisfying clear sound with intensity based on lines cleared
- **Game over**: Dramatic sound effect
- **Background music**: Patriotic or classical theme (optional, can be muted)

### Audio Implementation
- **Web Audio API** for programmatic sound generation
- **Synthesized sounds** using oscillators and envelopes
- **Custom sound engine** in JavaScript
- **Volume controls** for sound effects and music
- **Mute/unmute functionality**
- **Cross-browser compatibility** for audio playback
- **Real-time sound generation** - no loading delays
- **Fallback options** for browsers with limited audio support

### Sound Synthesis
- **Oscillator-based** sound generation (sine, square, triangle waves)
- **ADSR envelopes** for natural sound shaping
- **Frequency modulation** for complex tones
- **Reverb and delay effects** using Web Audio API nodes
- **Dynamic pitch** based on game events
- **Polyphonic capability** for overlapping sounds