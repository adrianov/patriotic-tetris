# Patriotic Tetris - Agent Guidelines

## Development Workflow
- **Start dev server**: `python3 -m http.server 8000` (DO NOT RUN - hangs the agent)
- **Run tests**: Open `http://localhost:8000` in browser
- **Lint/Type check**: `tsc --noEmit --project jsconfig.json`
- **Complexity check**: `npx eslint assets/js/` (CCN > 10, max-depth > 4, max-params > 5, max-lines > 400)
- **Test audio**: Press M to toggle mute, arrow keys to test sounds

## Code Quality Rules
- **ESLint errors**: Must fix all before committing
- **Parsing errors**: Read entire file, rewrite as complete syntactically-correct unit
- **Module length**: Break into smaller logical modules when exceeding linter limits
- **File refactoring**: For line limit violations, remove dead code, reduce duplication, apply proper refactoring
- **Bug fixing**: If issue persists, check git diff, analyze logic changes before retrying

## Project Hygiene
- **TODO.md**: Mark completed items with `[x]` or `✅`, never remove

## Code Standards

### JavaScript
- **Imports**: ES6 modules, relative paths (`./module.js`)
- **Classes**: PascalCase, export class declarations
- **Methods**: camelCase, use `this.` for instance methods
- **Constants**: UPPER_SNAKE_CASE for colors/dimensions
- **Error handling**: Check null/undefined before property access
- **Comments**: Single line `//` for brief descriptions

### CSS
- **Colors**: CSS custom properties (`var(--white)`)
- **Naming**: kebab-case for classes/IDs
- **Units**: `rem` for typography, `px` for game elements
- **Responsive**: Mobile-first `@media` queries

### File Structure
- **Modules**: One class per file, export at bottom
- **Assets**: SVG in `assets/svg/`, JS in `assets/js/`
- **Build**: No build tools, vanilla JS runs directly

### Game Development
- **Canvas**: `getContext('2d')`, clear before each frame
- **Audio**: Web Audio API, synthesized sounds only
- **Theme**: Patriotic colors - white (#FFFFFF), blue (#0039A6), red (#D52B1E)
- **Performance**: Target 60 FPS with `requestAnimationFrame`