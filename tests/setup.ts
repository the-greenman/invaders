import { beforeAll, afterEach, vi } from 'vitest';

// Mock localStorage with working implementation
const localStorageData: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageData[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }),
  get length() { return Object.keys(localStorageData).length; },
  key: vi.fn((i: number) => Object.keys(localStorageData)[i] ?? null)
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock requestAnimationFrame (required by Phaser)
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16) as unknown as number;
});
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// jsdom throws for focus(); Phaser may call it
if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'focus', { value: vi.fn(), configurable: true });
  } catch {
    (window as any).focus = vi.fn();
  }
}
if (typeof HTMLElement !== 'undefined') {
  try {
    Object.defineProperty(HTMLElement.prototype, 'focus', { value: vi.fn(), configurable: true });
  } catch {
    (HTMLElement.prototype as any).focus = vi.fn();
  }
}

// Mock canvas with comprehensive 2D context
const createCanvasContextMock = () => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createPattern: vi.fn(),
  canvas: { width: 800, height: 600 }
});

HTMLCanvasElement.prototype.getContext = vi.fn(function(this: HTMLCanvasElement, contextType: string, options?: any) {
  // console.log(`[Mock] getContext called with type: ${contextType}`);
  if (contextType === '2d') {
    const ctx = createCanvasContextMock();
    // Ensure context.canvas points back to the element
    ctx.canvas = this as any;
    return ctx;
  }
  if (contextType === 'webgl' || contextType === 'webgl2') {
    // Return minimal WebGL mock - Phaser will fall back to Canvas
    return null;
  }
  return null;
}) as any;

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,');
HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob()));

// Mock Image loading
Object.defineProperty(global.Image.prototype, 'src', {
  set(src: string) {
    setTimeout(() => this.onload?.(), 0);
  }
});

// Mock MediaPipe (for FaceManager tests)
vi.mock('@mediapipe/face_detection', () => ({
  FaceDetection: vi.fn(() => ({
    setOptions: vi.fn(),
    onResults: vi.fn(),
    send: vi.fn()
  }))
}));

vi.mock('@mediapipe/camera_utils', () => ({
  Camera: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

// Mock AudioContext
global.AudioContext = vi.fn(() => ({
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { value: 1 } })),
  createBufferSource: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
  decodeAudioData: vi.fn(),
  destination: {},
  state: 'running',
  resume: vi.fn()
})) as any;

beforeAll(() => {
  // Global test setup
});

afterEach(() => {
  // Reset mocks between tests
  vi.clearAllMocks();
  // Clear localStorage data
  Object.keys(localStorageData).forEach(k => delete localStorageData[k]);
});
