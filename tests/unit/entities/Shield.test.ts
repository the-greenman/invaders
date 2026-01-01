import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Shield } from '../../../src/entities/Shield';

// Mock Phaser
vi.mock('phaser', () => {
  const MockSprite = class {
    scene: any;
    x: number;
    y: number;
    texture: any;
    visible: boolean = true;
    
    constructor(scene: any, x: number, y: number, texture: any) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.texture = texture;
    }
    
    setVisible = vi.fn((val) => { this.visible = val; });
    destroy = vi.fn();
  };

  return {
    default: {
      GameObjects: { Sprite: MockSprite },
      Textures: { CanvasTexture: class { refresh = vi.fn() } }
    },
    GameObjects: { Sprite: MockSprite },
    Textures: { CanvasTexture: class { refresh = vi.fn() } }
  };
});

describe('Shield Entity', () => {
  let scene: any;
  let shield: Shield;
  let mockContext: any;
  let mockCanvasTexture: any;

  beforeEach(() => {
    // Mock Canvas Context
    mockContext = {
      fillStyle: '',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray([0, 0, 0, 255]) // Default opaque pixel
      }),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      globalCompositeOperation: 'source-over'
    };

    // Mock Phaser CanvasTexture
    mockCanvasTexture = {
      getCanvas: vi.fn().mockReturnValue({}),
      getContext: vi.fn().mockReturnValue(mockContext),
      refresh: vi.fn()
    };

    scene = {
      add: { existing: vi.fn(), circle: vi.fn().mockReturnValue({ setAlpha: vi.fn(), destroy: vi.fn() }) },
      textures: {
        createCanvas: vi.fn().mockReturnValue(mockCanvasTexture),
        remove: vi.fn()
      },
      tweens: { add: vi.fn() }
    };

    shield = new Shield(scene, 100, 500);
    // Fix: Assign the mock texture object to the sprite instance
    // The MockSprite constructor just assigns the key string, but Shield needs the object to call refresh()
    (shield as any).texture = mockCanvasTexture;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create shield at position', () => {
      expect(shield.x).toBe(100);
      expect(shield.y).toBe(500);
    });

    it('should create canvas texture', () => {
      expect(scene.textures.createCanvas).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled(); // Initial draw
    });
  });

  describe('Collision', () => {
    it('should return true for opaque pixel collision', () => {
      // Mock getImageData to return opaque pixel
      mockContext.getImageData.mockReturnValue({
        data: new Uint8ClampedArray([0, 255, 0, 255])
      });
      
      const hit = shield.checkPixelCollision(100, 500);
      expect(hit).toBe(true);
    });

    it('should return false for transparent pixel collision', () => {
      // Mock getImageData to return transparent pixel
      mockContext.getImageData.mockReturnValue({
        data: new Uint8ClampedArray([0, 0, 0, 0])
      });
      
      const hit = shield.checkPixelCollision(100, 500);
      expect(hit).toBe(false);
    });

    it('should return false if destroyed', () => {
      // Force destroy state (hacky, or use destroyPixels to reach limit)
      (shield as any).destroyed = true;
      expect(shield.checkPixelCollision(100, 500)).toBe(false);
    });
  });

  describe('Destruction', () => {
    it('should clear pixels on explode', () => {
      shield.explode(100, 500);
      
      expect(mockContext.globalCompositeOperation).toBe('destination-out');
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
      expect(mockCanvasTexture.refresh).toHaveBeenCalled();
    });

    it('should become destroyed when pixels run low', () => {
      // Mock countPixels to return low count
      // We need to spy on countPixels or mock the context implementation of it
      // countPixels uses getImageData(0,0,60,40) and counts.
      
      // Let's mock getImageData for the whole shield check
      const emptyData = new Uint8ClampedArray(60 * 40 * 4).fill(0);
      mockContext.getImageData.mockReturnValue({ data: emptyData });
      
      shield.destroyPixels(100, 500, 10);
      
      expect(shield.isDestroyed()).toBe(true);
      expect(shield.visible).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should redraw and become visible', () => {
      shield.setVisible(false);
      (shield as any).destroyed = true;
      
      shield.reset();
      
      expect(mockContext.fillRect).toHaveBeenCalled(); // Redraw
      expect(shield.visible).toBe(true);
      expect(shield.isDestroyed()).toBe(false);
    });
  });
});
