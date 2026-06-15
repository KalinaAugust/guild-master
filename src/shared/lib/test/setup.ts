import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock scrollIntoView as it's not implemented in jsdom
HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock PointerEvent as it's not implemented in jsdom and needed for Radix UI
class PointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}

window.PointerEvent = PointerEvent as unknown as typeof window.PointerEvent;
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

// Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// jsdom has no layout engine, so elementFromPoint is missing. ProseMirror/Tiptap
// (e.g. the Placeholder viewport tracking) calls it on mount; returning null makes
// posAtCoords fall back to getBoundingClientRect instead of throwing.
document.elementFromPoint = () => null;
