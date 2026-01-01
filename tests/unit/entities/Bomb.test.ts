import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Bomb } from '../../../src/entities/Bomb';
import { BOMB_SPEED } from '../../../src/constants';

// Mock Phaser (reuse similar mock structure)
vi.mock('phaser', () => {
  const MockSprite = class {
    scene: any;
    x: number;
    y: number;
    texture: any;
    body: any;
    active: boolean = true;
    visible: boolean = true;
    
    constructor(scene: any, x: number, y: number, texture: any) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.texture = texture;
      this.body = {
        setSize: vi.fn(),
        reset: vi.fn((bx, by) => { this.x = bx; this.y = by; }),
        velocity: { x: 0, y: 0 },
        setVelocityY: vi.fn((vy) => { this.body.velocity.y = vy; }),
        setVelocity: vi.fn((vx, vy) => { this.body.velocity.x = vx; this.body.velocity.y = vy; }),
        stop: vi.fn(),
        checkCollision: { none: false },
        enable: true
      };
    }
    
    setActive = vi.fn((val) => { this.active = val; return this; });
    setVisible = vi.fn((val) => { this.visible = val; return this; });
    setDisplaySize = vi.fn();
    destroy = vi.fn();
    play = vi.fn();
  };

  return {
    default: {
      GameObjects: { Sprite: MockSprite },
      Physics: { Arcade: { Body: class {} } }
    },
    GameObjects: { Sprite: MockSprite },
    Physics: { Arcade: { Body: class {} } }
  };
});

describe('Bomb Entity', () => {
  let scene: any;
  let bomb: Bomb;

  beforeEach(() => {
    scene = {
      add: { 
        existing: vi.fn(),
        circle: vi.fn().mockReturnValue({
          setAlpha: vi.fn(),
          destroy: vi.fn()
        })
      },
      physics: { add: { existing: vi.fn() } },
      anims: { exists: vi.fn().mockReturnValue(false) },
      tweens: { add: vi.fn() }
    };
    bomb = new Bomb(scene, 100, 100);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create bomb with velocity', () => {
      expect(bomb).toBeDefined();
      expect((bomb.body as any).velocity.y).toBe(BOMB_SPEED);
    });
  });

  describe('Hit', () => {
    it('should deactivate on hit', () => {
      bomb.hit();
      expect(bomb.destroy).toHaveBeenCalled();
    });
  });
});
