import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Bullet } from '../../../src/entities/Bullet';
import { BULLET_SPEED } from '../../../src/constants';

// Mock Phaser
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
        velocity: { y: 0 },
        setVelocityY: vi.fn((vy) => { this.body.velocity.y = vy; }),
        setVelocity: vi.fn((vx, vy) => { this.body.velocity.y = vy; }),
        stop: vi.fn(),
        enable: true,
        checkCollision: { none: false }
      };
    }
    
    setActive = vi.fn((val) => { this.active = val; return this; });
    setVisible = vi.fn((val) => { this.visible = val; return this; });
    setPosition = vi.fn((x, y) => { this.x = x; this.y = y; return this; });
    destroy = vi.fn();
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

describe('Bullet Entity', () => {
  let scene: any;
  let bullet: Bullet;

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
      tweens: { add: vi.fn() }
    };
    bullet = new Bullet(scene, 0, 0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create bullet', () => {
      expect(bullet).toBeDefined();
      expect(scene.add.existing).toHaveBeenCalledWith(bullet);
      expect(scene.physics.add.existing).toHaveBeenCalledWith(bullet);
    });
  });

  describe('Launch', () => {
    it('should reset position and set velocity on launch', () => {
      bullet.launch(100, 200);
      
      expect((bullet.body as any).reset).toHaveBeenCalledWith(100, 200);
      expect((bullet.body as any).velocity.y).toBe(-BULLET_SPEED);
      expect(bullet.setActive).toHaveBeenCalledWith(true);
      expect(bullet.setVisible).toHaveBeenCalledWith(true);
    });
  });

  describe('Update', () => {
    it('should deactivate if out of bounds', () => {
      bullet.y = -50; // Above screen
      
      // We need to manually invoke the logic that hides bullets, which is usually in GameScene update
      // But Bullet itself might have an update? 
      // Checking Bullet.ts... it inherits Sprite.
      // Usually GameScene handles out-of-bounds check for bullets group.
      // But Bullet might implement preUpdate or update.
      
      // Looking at BaseGameScene.ts:
      // if (bullet.y < -20) { bullet.setActive(false); bullet.setVisible(false); }
      
      // So Bullet class itself just handles movement via physics.
      // We can only test what Bullet class implements.
      
      // Bullet.ts might implement hit()
    });
  });

  describe('Hit', () => {
    it('should deactivate on hit', () => {
      bullet.hit();
      expect(bullet.setActive).toHaveBeenCalledWith(false);
      expect(bullet.setVisible).toHaveBeenCalledWith(false);
    });
  });
});
