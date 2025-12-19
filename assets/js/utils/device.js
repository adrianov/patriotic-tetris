// Mobile detection utility - unified across the app
export function isMobileDevice() {
    // Primary input method detection + hover capability check
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) ||
           (window.matchMedia?.('(hover: hover)').matches !== true);
}

export function isHoverDevice() {
    return window.matchMedia?.('(hover: hover)').matches === true;
}