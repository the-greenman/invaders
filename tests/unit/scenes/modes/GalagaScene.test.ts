import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GalagaScene } from '../../../../src/scenes/modes/GalagaScene';
import { Player } from '../../../../src/entities/Player';
import { ScoreManager } from '../../../../src/managers/ScoreManager';
import { LevelManager } from '../../../../src/managers/LevelManager';
import { DifficultyPreset } from '../../../../src/types/DifficultyPreset';

// Mock dependencies
vi.mock('../../../../src/entities/Player');
vi.mock('../../../../src/entities/GalagaGrid');
vi.mock('../../../../src/managers/ScoreManager');
vi.mock('../../../../src/managers/LevelManager');
vi.mock('../../../../src/managers/AudioManager');
vi.mock('../../../../src/managers/SpriteManager', () => ({
  SpriteManager: {
    getInstance: vi.fn().mockReturnValue({
      buildPlayerSprite: vi.fn().mockResolvedValue('player'),
      buildAlienSprites: vi.fn().mockResolvedValue(['alien1', 'alien2']),
      clearCache: vi.fn()
    })
  }
}));

describe('GalagaScene', () => {
  let scene: GalagaScene;

  beforeEach(() => {
    scene = new GalagaScene();
    
    // Mock Phaser Scene properties
    scene.sys = {
      settings: { data: {} },
      displayList: { remove: vi.fn() },
      updateList: { remove: vi.fn() },
      events: { 
        once: vi.fn(), 
        on: vi.fn(), 
        off: vi.fn(), 
        emit: vi.fn() 
      },
      add: { existing: vi.fn() },
      make: {
        text: vi.fn().mockReturnValue({ setOrigin: vi.fn() }),
        graphics: vi.fn().mockReturnValue({ fillRect: vi.fn() })
      },
      queueDepthSort: vi.fn(),
      isActive: vi.fn().mockReturnValue(true)
    } as any;

    scene.add = {
      text: vi.fn().mockReturnValue({ 
        setOrigin: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        setText: vi.fn().mockReturnThis() 
      }),
      image: vi.fn().mockReturnValue({ 
        setOrigin: vi.fn(), 
        setDisplaySize: vi.fn(),
        setDepth: vi.fn()
      }),
      graphics: vi.fn().mockReturnValue({
        fillStyle: vi.fn(),
        fillCircle: vi.fn(),
        setDepth: vi.fn(),
        setPosition: vi.fn()
      }),
      existing: vi.fn(),
      group: vi.fn()
    } as any;

    scene.physics = {
      add: {
        group: vi.fn().mockReturnValue({
          clear: vi.fn(),
          children: { entries: [] },
          add: vi.fn(),
          getChildren: vi.fn().mockReturnValue([])
        }),
        existing: vi.fn(),
        overlap: vi.fn(),
        collider: vi.fn()
      },
      world: {
        setBounds: vi.fn()
      }
    } as any;

    scene.tweens = {
      add: vi.fn()
    } as any;

    scene.time = {
      now: 0,
      delayedCall: vi.fn()
    } as any;

    scene.scene = {
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      settings: { data: {} }
    } as any;
    
    scene.registry = {
      set: vi.fn()
    } as any;

    scene.cameras = {
      main: {
        width: 800,
        height: 600,
        setViewport: vi.fn()
      }
    } as any;

    scene.input = {
      keyboard: {
        on: vi.fn(),
        off: vi.fn(),
        once: vi.fn()
      },
      gamepad: {
        on: vi.fn()
      }
    } as any;

    // Initialize core properties manually for testing since we skip create()
    (scene as any).levelManager = new LevelManager(1, DifficultyPreset.MEDIUM);
    (scene as any).scoreManager = new ScoreManager();
  });

  it('should transition to AbductionScene on game over', () => {
    // Access protected method via any cast
    (scene as any).onGameOver();

    // Verify scene.start was called with correct args
    expect(scene.scene.start).toHaveBeenCalledWith(
      'AbductionScene',
      expect.objectContaining({
        gameMode: expect.anything(), // Should check value if possible
        score: expect.any(Number),
        level: expect.any(Number)
      })
    );
  });
});
