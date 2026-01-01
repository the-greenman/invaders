import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SpriteManager } from '../../../src/managers/SpriteManager';
import { FaceManager } from '../../../src/managers/FaceManager';
import { LocalStorage } from '../../../src/utils/localStorage';

// Mock dependencies
vi.mock('../../../src/managers/FaceManager', () => ({
  FaceManager: {
    getCurrentFace: vi.fn(),
    addBase64Texture: vi.fn(),
    composeFaceTexture: vi.fn().mockResolvedValue('composed-texture-key'),
    tintImage: vi.fn().mockResolvedValue('tinted-image-data')
  }
}));

vi.mock('../../../src/utils/localStorage', () => ({
  LocalStorage: {
    getFaceHistory: vi.fn().mockReturnValue([])
  }
}));

describe('SpriteManager', () => {
  let spriteManager: SpriteManager;
  let scene: any;

  beforeEach(() => {
    // Reset singleton instance (if possible, or just create new one via private constructor hack or ensuring getInstance works)
    // SpriteManager is a singleton. To test it properly, we might need to reset the instance.
    // However, it stores 'instance' privately. 
    // We can cast to any to reset it.
    (SpriteManager as any).instance = null;

    scene = {
      textures: {
        exists: vi.fn().mockReturnValue(false),
        getBase64: vi.fn().mockReturnValue('base64-data')
      },
      cache: {
        json: {
          get: vi.fn().mockReturnValue({ relativeX: 0.5, relativeY: 0.5, rx: 20 })
        }
      }
    };

    spriteManager = SpriteManager.getInstance(scene);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = SpriteManager.getInstance(scene);
      const instance2 = SpriteManager.getInstance(scene);
      expect(instance1).toBe(instance2);
    });
  });

  describe('Player Sprite', () => {
    it('should build default player sprite if no face set', async () => {
      vi.mocked(FaceManager.getCurrentFace).mockReturnValue(null);
      // Mock default face existence
      scene.textures.exists.mockReturnValue(true);

      const key = await spriteManager.buildPlayerSprite();
      
      expect(key).toBe('composed-texture-key');
      expect(FaceManager.composeFaceTexture).toHaveBeenCalled();
    });

    it('should build custom player sprite if face set', async () => {
      vi.mocked(FaceManager.getCurrentFace).mockReturnValue('face-data');
      
      const key = await spriteManager.buildPlayerSprite();
      
      expect(key).toBe('composed-texture-key');
      expect(FaceManager.addBase64Texture).toHaveBeenCalledWith(scene, expect.stringContaining('src'), 'face-data');
    });

    it('should return cached key on second call', async () => {
      vi.mocked(FaceManager.getCurrentFace).mockReturnValue(null);
      scene.textures.exists.mockReturnValue(false); // Fallback to 'player'

      const key1 = await spriteManager.buildPlayerSprite();
      expect(key1).toBe('player');
      
      // Should satisfy from cache
      const key2 = await spriteManager.buildPlayerSprite();
      expect(key2).toBe('player');
      
      // Verify mocks called only once
      expect(scene.textures.exists).toHaveBeenCalledTimes(1);
    });
  });

  describe('Alien Sprites', () => {
    it('should build alien sprites from history', async () => {
      const history = [
        { id: '1', imageData: 'face1', timestamp: 0 },
        { id: '2', imageData: 'face2', timestamp: 0 }
      ];
      vi.mocked(LocalStorage.getFaceHistory).mockReturnValue(history);
      // Mock default face exists for fallback
      scene.textures.exists.mockReturnValue(true);

      const keys = await spriteManager.buildAlienSprites(3);
      
      expect(keys).toHaveLength(3);
      // 1 default alien: 2 calls (1 tinted texture + 1 composite src)
      // 2 history faces: 2 * 2 calls (1 src + 1 tinted) = 4 calls
      // Total = 6
      expect(FaceManager.addBase64Texture).toHaveBeenCalledTimes(6); 
    });

    it('should cache alien sprites', async () => {
      vi.mocked(LocalStorage.getFaceHistory).mockReturnValue([]);
      scene.textures.exists.mockReturnValue(true);

      await spriteManager.buildAlienSprites(1);
      await spriteManager.buildAlienSprites(1);

      // 1 default alien build = 2 calls (first run)
      // Second run hits cache = 0 calls
      expect(FaceManager.addBase64Texture).toHaveBeenCalledTimes(2);
    });
  });

  describe('Animation', () => {
    it('should create animation', () => {
      const frames = [{ textureKey: 'f1', duration: 100 }];
      const key = spriteManager.createAnimation('test', frames);
      expect(key).toBe('f1');
    });

    it('should build player animation from frames', async () => {
      const frames = ['data1', 'data2'];
      await spriteManager.buildPlayerAnimation(frames);
      
      // For each frame:
      // 1. addBase64Texture for the frame itself
      // 2. buildSpriteWithFace -> addBase64Texture for src
      // Total 2 * 2 = 4 calls
      expect(FaceManager.addBase64Texture).toHaveBeenCalledTimes(4);
      expect(FaceManager.composeFaceTexture).toHaveBeenCalledTimes(2);
    });
  });
});
