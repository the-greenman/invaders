import { describe, it, expect, vi } from 'vitest';
import { AbductionScene } from '../../src/scenes/AbductionScene';
import { GameOverScene } from '../../src/scenes/GameOverScene';

// Mock LocalStorage
vi.mock('../../src/utils/localStorage', () => ({
  LocalStorage: {
    getSettings: vi.fn().mockReturnValue({ 
      controllerFireButton: 0,
      controllerStartButton: 1 
    }),
    getFaceHistory: vi.fn().mockReturnValue([]),
    getCurrentFace: vi.fn().mockReturnValue(null),
    isHighScore: vi.fn().mockReturnValue(false),
    saveHighScore: vi.fn()
  }
}));

// Mock FaceManager to avoid webcam errors
vi.mock('../../src/managers/FaceManager', () => ({
  FaceManager: {
    initMediaPipe: vi.fn().mockResolvedValue(undefined),
    startWebcam: vi.fn().mockResolvedValue(undefined),
    startDetectionLoop: vi.fn(),
    captureAndSaveFace: vi.fn().mockResolvedValue('face-data'),
    cleanup: vi.fn(),
    addBase64Texture: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Integration: Game Flow', () => {
  it('should flow from AbductionScene -> GameOverScene -> Restart (WebcamScene)', async () => {
    const abductionScene = new AbductionScene();

    const delayedCalls: Array<{ delay: number; callback: () => void }> = [];
    const startSpy = vi.fn();

    // Minimal scene wiring for AbductionScene
    (abductionScene as any).cameras = { main: { setBackgroundColor: vi.fn() } };
    (abductionScene as any).add = {
      image: vi.fn(() => ({ setDisplaySize: vi.fn().mockReturnThis() })),
      graphics: vi.fn(() => ({
        fillStyle: vi.fn().mockReturnThis(),
        fillPoints: vi.fn().mockReturnThis(),
        setAlpha: vi.fn().mockReturnThis()
      })),
      text: vi.fn(() => ({ setOrigin: vi.fn().mockReturnThis() }))
    };
    (abductionScene as any).tweens = {
      add: vi.fn((config: any) => {
        // Run completion immediately to keep sequence deterministic
        if (typeof config?.onComplete === 'function') {
          config.onComplete();
        }
        return {};
      })
    };
    (abductionScene as any).time = {
      delayedCall: vi.fn((delay: number, callback: () => void) => {
        delayedCalls.push({ delay, callback });
        return {};
      })
    };
    (abductionScene as any).scene = { start: startSpy };

    await abductionScene.create({ score: 123, level: 4 });

    // The scene should schedule a delayed transition to GameOverScene at 5000ms
    const toGameOver = delayedCalls.find(c => c.delay === 5000);
    expect(toGameOver).toBeDefined();
    toGameOver!.callback();

    expect(startSpy).toHaveBeenCalledWith(
      'GameOverScene',
      expect.objectContaining({ score: 123, level: 4 })
    );

    // Now validate restart behavior from GameOverScene
    const gameOverScene = new GameOverScene();
    const gameOverStartSpy = vi.fn();
    (gameOverScene as any).scene = { start: gameOverStartSpy };
    (gameOverScene as any).restartGame();

    expect(gameOverStartSpy).toHaveBeenCalledWith(
      'WebcamScene',
      expect.objectContaining({ skipIntro: true })
    );
  });
});
