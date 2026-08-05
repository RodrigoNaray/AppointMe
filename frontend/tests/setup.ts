import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

const _origHasPointerCapture = EventTarget.prototype.hasPointerCapture;
if (!_origHasPointerCapture) {
  EventTarget.prototype.hasPointerCapture = () => false;
  EventTarget.prototype.setPointerCapture = () => {};
  EventTarget.prototype.releasePointerCapture = () => {};
}

if (!('IntersectionObserver' in globalThis)) {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
}

afterEach(() => {
	cleanup();
	sessionStorage.clear();
	localStorage.clear();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});
