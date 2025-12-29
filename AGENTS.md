# Patriotic Tetris - Agent Guidelines

## Development Workflow
- **Start dev server**: `python3 -m http.server 8000` (DO NOT RUN - hangs the agent)
- **Run tests**: Open `http://localhost:8000` in browser
- **Lint/Type check**: `tsc --noEmit --project jsconfig.json`
- **Complexity check**: `npx eslint assets/js/` (CCN > 10, max-depth > 4, max-params > 5, max-lines > 400) - MUST fix all ESLint errors before proceeding with work
- **Test audio**: Press M to toggle mute, arrow keys to test sounds

## Code Quality Rules
- **ESLint errors**: MUST fix all before proceeding with any work or committing changes
- **Parsing errors**: Read entire file, rewrite as complete syntactically-correct unit
- **Module length**: Break into smaller logical modules when exceeding linter limits
- **File refactoring**: For line limit violations, remove dead code, reduce duplication, apply proper refactoring
- **Bug fixing**: If issue persists, check git diff, analyze logic changes before retrying
- **Persistent issues**: When user asks to fix same thing several times and solution doesn't work, read entire file and all dependencies to gain full context
- **Wrapper functions**: Remove trivial functions that only call another function without adding value

## SOLID Principles
- **S - Single Responsibility**: Each class/module has one reason to change. Move methods to appropriate modules based on their primary responsibility.
- **O - Open/Closed**: Open for extension, closed for modification. Use interfaces/abstract patterns when adding new features.
- **L - Liskov Substitution**: Derived classes must be substitutable for their base classes without altering correctness.
- **I - Interface Segregation**: Clients shouldn't depend on interfaces they don't use. Keep interfaces focused and minimal.
- **D - Dependency Inversion**: High-level modules shouldn't depend on low-level modules. Both should depend on abstractions.

## DRY Principle (Don't Repeat Yourself)
- **Eliminate duplication**: When same logic exists in multiple places, extract to shared utility or base class.
- **Prefer composition over inheritance**: Use composition for code reuse when appropriate.
- **Parameterize differences**: Instead of copy-pasting similar code, use parameters to handle variations.
- **Shared constants**: Move magic numbers and repeated values to constants or configuration.

## YAGNI Principle (You Aren't Gonna Need It)
- **Avoid over-engineering**: Don't add code for hypothetical future requirements.
- **Implement what's needed now**: Build the simplest solution that meets current requirements.
- **Defer complexity**: Add complexity only when actual requirements demand it.
- **Prefer explicit to clever**: Simple, readable code is better than clever but unnecessary abstractions.

## Refactoring Guidelines
- **When module is too big (>400 lines)**: Break into focused modules based on single responsibility.
- **When methods don't belong**: Move methods to module that best represents their domain responsibility.
- **Before refactoring**: Identify method responsibilities, determine target modules, update imports.
- **After refactoring**: Run linting, type checking, and functional tests to ensure no regressions. MUST fix all ESLint errors before proceeding.
- **Extract patterns**: Common patterns (animations, scoring, state management) should be separate modules.
- **Module reduction**: Never remove functionality or comments to make modules shorter. Extract functions to other modules instead.
- **Comprehensive extraction**: When extracting a module, analyze both edited modules (all and new) in full and make extraction comprehensive, following SOLID principles: each module should have one reason to change, be open for extension but closed for modification, depend on abstractions, and not depend on methods they don't use.

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
- **Touch controls**: To prevent browser magnifying glass/zoom during touch manipulation, use `event.preventDefault()` on touchmove events