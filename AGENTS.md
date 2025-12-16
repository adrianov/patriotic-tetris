# Patriotic Tetris - Agent Guidelines

## Commands
- **Start dev server**: `python3 -m http.server 8000`
- **Run single test**: Open `http://localhost:8000` in browser
- **Lint JS**: `tsc --noEmit --project jsconfig.json`
- **Complexity check**: `npx eslint assets/js/` (errors if CCN > 10, max-depth > 4, max-params > 5, max-lines > 400)
- **Test audio**: Press M to toggle mute, use arrow keys to test sounds
- **Fix parsing error**: Parsing errors affect the whole file, so to fix them, read the file as a whole, do not read it with limits or partials. And then rewrite file as a whole syntaxically correct.
- **Fix ESLint errors**: Must fix all ESLint errors before committing changes

## Project Hygiene
- **TODO.md**: Do **not** remove finished items; mark them as completed instead (use `[x]` or `✅`).

## Code Style Guidelines

### JavaScript
- **Imports**: ES6 modules at top, use relative paths (`./module.js`)
- **Classes**: PascalCase, export class declarations
- **Methods**: camelCase, use `this.` for instance methods
- **Constants**: UPPER_SNAKE_CASE for colors, dimensions
- **Error handling**: Check null/undefined before property access
- **Comments**: Single line `//` for brief descriptions

### CSS
- **Colors**: Use CSS custom properties (`var(--white)`)
- **Naming**: kebab-case for classes and IDs
- **Units**: `rem` for typography, `px` for game elements
- **Responsive**: Mobile-first with `@media` queries

### File Structure
- **Modules**: One class per file, export at bottom
- **Assets**: SVG in `assets/svg/`, JS in `assets/js/`
- **No build tools**: Vanilla JS runs directly in browser

### Game Specific
- **Canvas**: Use `getContext('2d')`, clear before each frame
- **Audio**: Web Audio API with synthesized sounds only
- **Colors**: Patriotic theme - white (#FFFFFF), blue (#0039A6), red (#D52B1E)
- **Performance**: Target 60 FPS, use `requestAnimationFrame`