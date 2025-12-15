# Patriotic Tetris TODO

## Current phase
**Phase 6: Themes (UI switcher)**

## Phase 6 tasks
- [x] Add flag controls in right pane (Modern / Imperial / Soviet)
- [x] Implement theme switching via CSS variables (`data-theme`)
- [x] Persist selected theme in `localStorage`
- [x] Update docs (`SPEC.md`, `TODO.md`)

## Next after themes (Phase 7)
- [x] Implement intelligent piece locking mechanism
- [x] Fix piece locking for pieces that create unavoidable gaps (e.g., Z piece on empty field)
- [x] Improve gap detection to distinguish between problematic and non-problematic gaps
- [x] Optimize piece locking to check if rotation would eliminate all gaps, not just reduce them
- [x] Fix Z piece locking to only wait if rotation would eliminate all gaps
- [x] Fix false positive locking when rotation would enable further movement
- [x] Simplify piece locking logic to focus on whether position can be improved
- [ ] Do a manual cross-browser pass (Chrome / Firefox / Safari / Edge)
- [ ] Do a long-play performance check (FPS + memory) and fix any regressions
- [ ] Verify audio controls + mute work consistently across browsers/devices

## Later (Phase 8)
- [x] Local high scores (localStorage)
- [x] Reset high score control
- [x] New high score celebration screen + melody
- [ ] Loading/intro screen (optional)
- [ ] Final code review + deployment readiness