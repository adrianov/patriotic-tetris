# Patriotic Tetris 🇷🇺

A classic Tetris game with a patriotic Russian theme, built with vanilla HTML5, CSS3, and JavaScript. No build tools, no dependencies - just pure web technologies running directly in your browser.

## 🎮 Features

### Core Gameplay
- **Classic Tetris mechanics** with all 7 tetromino pieces (I, O, T, S, Z, J, L)
- **10×20 game grid** following standard Tetris dimensions
- **Smooth controls** with keyboard and touch support
- **Ghost piece** preview to show where your piece will land
- **Line clearing** with satisfying animations
- **Progressive difficulty** - speed increases with level
- **Score system** with multipliers for consecutive line clears

### Patriotic Themes
- **Three unique themes** inspired by Russian history:
  - **Modern Russia** - White, Blue, Red tricolor
  - **Imperial Russia** - Black, Gold, White elegance
  - **Soviet Moscow** - Deep Red, Gold, Metro Green
- **Russian Two-Headed Eagle** emblem
- **Theme persistence** - your choice is saved locally

### Audio Experience
- **Synthesized sound effects** using Web Audio API
- **Dynamic audio** for piece movements, rotations, and line clears
- **Background music** with patriotic themes
- **Mute controls** and volume adjustment
- **No external audio files** - all sounds generated programmatically

### Modern Features
- **High score tracking** with localStorage persistence
- **Mobile-responsive design** with touch controls
- **Pause/Resume** functionality
- **Speed boost** control (+ key for 20% faster gameplay)
- **60 FPS smooth rendering** using Canvas API
- **Cross-browser compatibility** (Chrome, Firefox, Safari, Edge)

## 🕹️ Controls

### Keyboard
- **← →** - Move piece left/right
- **↑** - Rotate piece
- **↓** - Soft drop (faster fall)
- **Space** - Hard drop (instant drop)
- **P** - Pause/Resume
- **R** - Restart game
- **M** - Mute/Unmute
- **G** - Toggle ghost piece
- **+** - Increase speed (+20% per press)

### Mobile
- **Touch D-Pad** - Move and rotate pieces
- **Touch buttons** - Pause, restart, toggle ghost, sound control
- **Swipe gestures** - Intuitive piece control

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/patriotic-tetris.git
   cd patriotic-tetris
   ```

2. **Start the development server**
   ```bash
   python3 -m http.server 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

That's it! No npm install, no build process - just open and play.

## 📁 Project Structure

```
patriotic-tetris/
├── index.html              # Main game HTML
├── assets/
│   ├── css/
│   │   └── style.css       # Game styles and themes
│   ├── js/
│   │   ├── game.js         # Main game controller
│   │   ├── board.js        # Game board management
│   │   ├── pieces.js       # Tetromino definitions
│   │   ├── controls.js     # Input handling
│   │   ├── audio.js        # Sound synthesis engine
│   │   └── theme.js        # Theme switching logic
│   └── svg/
│       └── eagle.svg       # Russian two-headed eagle
├── SPEC.md                 # Detailed game specification
├── TODO.md                 # Development roadmap
└── README.md               # This file
```

## 🎯 Scoring System

- **Single line**: 100 points × level
- **Double lines**: 300 points × level
- **Triple lines**: 500 points × level
- **Tetris (4 lines)**: 800 points × level
- **Soft drop**: 1 point per cell
- **Hard drop**: 2 points per cell

Level increases every 10 lines cleared, making pieces fall faster.

## 🛠️ Development

### Code Style
- **ES6+ modules** with clean class-based architecture
- **PascalCase** for classes, **camelCase** for methods
- **CSS custom properties** for theming
- **No external dependencies** - pure vanilla JavaScript

### Testing
- **Manual testing** - Open `http://localhost:8000` in browser
- **Cross-browser testing** - Chrome, Firefox, Safari, Edge
- **Mobile testing** - Touch controls and responsive design
- **Performance testing** - 60 FPS target, memory efficiency

### Linting
```bash
# Type checking with TypeScript compiler
tsc --noEmit --project jsconfig.json
```

## 🌟 Technical Highlights

### Performance Optimizations
- **RequestAnimationFrame** for smooth 60 FPS rendering
- **Efficient canvas rendering** with minimal redraws
- **Viewport-aware responsive design** for mobile browsers
- **Memory-efficient** game state management

### Audio Engineering
- **Web Audio API** for real-time sound synthesis
- **Oscillator-based** sound generation
- **ADSR envelopes** for natural sound shaping
- **Cross-browser audio compatibility**

### Responsive Design
- **Mobile-first** approach with touch controls
- **Viewport units** for consistent scaling
- **Flexible layout** adapting to all screen sizes
- **Touch-friendly** interface elements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎨 Credits

- **Peter Adrianov** - Developer & Designer
- **Classic Tetris** - Original game concept by Alexey Pajitnov
- **Russian Heraldry** - Two-headed eagle emblem inspiration

---

**Enjoy the game!** 🎮🇷🇺

Built with ❤️ using pure web technologies - no frameworks, no build tools, just the power of modern browsers.