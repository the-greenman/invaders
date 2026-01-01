import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Alien, AlienState } from '../../../src/entities/Alien';
import { ALIEN_WIDTH, ALIEN_HEIGHT } from '../../../src/constants';
import { AttackPath } from '../../../src/systems/AttackPath';

// Mock Phaser
vi.mock('phaser', () => {
  const MockSprite = class {
    scene: any;
    x: number = 0;
    y: number = 0;
    body: any;
    active: boolean = true;
    
    constructor(scene: any, x: number, y: number, texture: any) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.body = {
        setSize: vi.fn(),
        setImmovable: vi.fn(),
        reset: vi.fn((bx, by) => { this.x = bx; this.y = by; })
      };
    }
    setDisplaySize = vi.fn();
    
    // Define as method to avoid shadowing Alien.destroy
    destroy(fromScene?: boolean) {
      this.active = false;
    }
    
    setPosition = vi.fn((x, y) => { this.x = x; this.y = y; });
    play = vi.fn();
    setTint = vi.fn();
    clearTint = vi.fn();
    getWorldTransformMatrix = vi.fn(() => ({ tx: this.x, ty: this.y }));
  };

  return {
    default: {
      GameObjects: { Sprite: MockSprite },
      Physics: { Arcade: { Body: class {} } },
      Math: { Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) }
    },
    GameObjects: { Sprite: MockSprite },
    Physics: { Arcade: { Body: class {} } },
    Math: { Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) }
  };
});

describe('Alien Entity', () => {
  let scene: any;
  let alien: Alien;

  beforeEach(() => {
    scene = {
      add: { 
        existing: vi.fn(), 
        circle: vi.fn().mockReturnValue({ 
          setAlpha: vi.fn(), 
          destroy: vi.fn(),
          setScale: vi.fn() // For tween
        }) 
      },
      physics: { add: { existing: vi.fn() } },
      tweens: { add: vi.fn() },
      anims: { exists: vi.fn().mockReturnValue(false) }
    };
    
    alien = new Alien(scene, 100, 100, 0, { row: 0, col: 0 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create alien at correct position', () => {
      expect(alien.x).toBe(100);
      expect(alien.y).toBe(100);
    });

    it('should set grid position', () => {
      expect(alien.getGridPosition()).toEqual({ row: 0, col: 0 });
    });

    it('should have points', () => {
      expect(alien.getPoints()).toBeGreaterThan(0);
    });
  });

  describe('Movement', () => {
    it('should move by offset', () => {
      alien.move(10, 20);
      expect(alien.x).toBe(110);
      expect(alien.y).toBe(120);
      expect((alien.body as any).reset).toHaveBeenCalledWith(110, 120);
    });
  });

  describe('Destruction', () => {
    it('should mark as dead and play effect', () => {
      expect(alien.isAlive()).toBe(true);
      const points = alien.destroy();
      
      expect(alien.isAlive()).toBe(false);
      expect(scene.add.circle).toHaveBeenCalled(); // Explosion effect
      expect(scene.tweens.add).toHaveBeenCalled();
      expect(points).toBeGreaterThan(0);
    });

    it('should not destroy twice', () => {
      alien.destroy();
      const points = alien.destroy();
      expect(points).toBe(0);
    });
  });

  describe('Galaga State Machine', () => {
    it('should start IN_FORMATION', () => {
      expect(alien.getState()).toBe('IN_FORMATION');
    });

    it('should transition states', () => {
      alien.setAlienState(AlienState.ATTACKING);
      expect(alien.getState()).toBe(AlienState.ATTACKING);
      
      alien.setAlienState(AlienState.RETURNING);
      expect(alien.getState()).toBe(AlienState.RETURNING);
    });

    it('should follow attack path when ATTACKING', () => {
      const mockPath = {
        getCurrentPosition: vi.fn().mockReturnValue({ x: 200, y: 200, t: 0.5 }),
        isComplete: vi.fn().mockReturnValue(false)
      } as unknown as AttackPath;

      alien.setAttackPath(mockPath);
      alien.setAlienState(AlienState.ATTACKING);
      
      alien.followPath(16);
      
      expect(mockPath.getCurrentPosition).toHaveBeenCalled();
      expect(alien.x).toBe(200);
      expect(alien.y).toBe(200);
    });

    it('should not follow path if not ATTACKING', () => {
      const mockPath = {
        getCurrentPosition: vi.fn()
      } as unknown as AttackPath;

      alien.setAttackPath(mockPath);
      alien.setAlienState(AlienState.IN_FORMATION);
      
      alien.followPath(16);
      expect(mockPath.getCurrentPosition).not.toHaveBeenCalled();
    });
  });
});
