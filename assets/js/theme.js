// Theme Module - UI theme switching (like light/dark mode)
// Applies a theme by setting data-theme on <html> and persists in localStorage.

const STORAGE_KEY = 'patriotic_tetris_theme';
const THEMES = new Set(['modern', 'imperial', 'soviet']);

function getRoot() {
    return document.documentElement;
}

function setPressed(theme) {
    const buttons = document.querySelectorAll('.theme-btn[data-theme]');
    buttons.forEach((btn) => {
        const btnTheme = btn.getAttribute('data-theme');
        btn.setAttribute('aria-pressed', btnTheme === theme ? 'true' : 'false');
    });
}

export function applyTheme(theme) {
    const safeTheme = THEMES.has(theme) ? theme : 'modern';
    getRoot().setAttribute('data-theme', safeTheme);
    try {
        localStorage.setItem(STORAGE_KEY, safeTheme);
    } catch {
        // Ignore storage failures (private mode, disabled storage, etc.)
    }
    setPressed(safeTheme);

    // Let canvas renderers refresh cached CSS-variable based colors.
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: safeTheme } }));
}

export function initTheme() {
    let saved = 'modern';
    try {
        saved = localStorage.getItem(STORAGE_KEY) || 'modern';
    } catch {
        saved = 'modern';
    }

    applyTheme(saved);

    document.addEventListener('click', (e) => {
        const btn = e.target?.closest?.('.theme-btn[data-theme]');
        if (!btn) return;
        const theme = btn.getAttribute('data-theme');
        applyTheme(theme);
    });
}


