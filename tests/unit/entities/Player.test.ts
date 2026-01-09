import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Player } from '../../../src/entities/Player';
import { PLAYER_SPEED, PLAYER_SHOOT_COOLDOWN, PLAYER_WIDTH, GAME_WIDTH } from '../../../src/constants';

// Mock Phaser completely to avoid complex scene dependencies
vi.mock('phaser', () => {
  const MockSprite = class {
    scene: any;
    x: number;
    y: number;
    texture: any;
    body: any;
    active: boolean = true;
    
    constructor(scene: any, x: number, y: number, texture: any) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.texture = texture;
      this.body = {
        setSize: vi.fn(),
        setCollideWorldBounds: vi.fn(),
        setImmovable: vi.fn(),
        setVelocityX: vi.fn(),
        reset: vi.fn(),
        velocity: { x: 0, y: 0 }
      };
    }
    
    setDisplaySize = vi.fn();
    setTint = vi.fn();
    clearTint = vi.fn();
    setActive = vi.fn((val) => { this.active = val; });
    setVisible = vi.fn();
    setPosition = vi.fn((x, y) => { this.x = x; this.y = y; });
    destroy = vi.fn();
    setX = vi.fn((x) => { this.x = x; });
  };

  return {
    default: {
      GameObjects: {
        Sprite: MockSprite
      },
      Input: {
        Keyboard: {
          KeyCodes: { SPACE: 32 }
        }
      },
      Math: {
        Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(v, max))
      },
      Physics: {
        Arcade: {
          Body: class {}
        }
      }
    },
    GameObjects: {
      Sprite: MockSprite
    },
    Input: {
      Keyboard: {
        KeyCodes: { SPACE: 32 }
      }
    },
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(v, max))
    },
    Physics: {
      Arcade: {
        Body: class {}
      }
    }
  };
});

// Mock LocalStorage
vi.mock('../../../src/utils/localStorage', () => ({
  LocalStorage: {
    getSettings: vi.fn().mockReturnValue({
      controllerFireButton: 0,
      controllerBackButton: 1  // Button 1 is the back button
    })
  }
}));

describe('Player Entity', () => {
  let scene: any;
  let player: Player;
  let cursors: any;
  let spaceKey: any;

  beforeEach(() => {
    // Setup Mock Scene with Input capabilities
    cursors = {
      left: { isDown: false },
      right: { isDown: false },
      up: { isDown: false },
      down: { isDown: false }
    };
    spaceKey = { isDown: false };

    // Define scene locally to ensure integrity
    const mockScene = {
      add: {
        existing: vi.fn()
      },
      physics: {
        add: {
          existing: vi.fn()
        }
      },
      input: {
        keyboard: {
          createCursorKeys: vi.fn().mockReturnValue(cursors),
          addKey: vi.fn().mockReturnValue(spaceKey)
        },
        gamepad: {
          total: 0,
          getPad: vi.fn(),
          on: vi.fn(),
          off: vi.fn()
        }
      },
      events: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
      },
      time: {
        now: 0,
        delayedCall: vi.fn()
      },
      anims: {
        create: vi.fn(),
        exists: vi.fn(),
        play: vi.fn()
      }
    };

    scene = mockScene;
    console.log('DEBUG: mockScene keys:', Object.keys(mockScene));
    console.log('DEBUG: mockScene.add:', mockScene.add);

    // Create player using mocked Phaser.GameObjects.Sprite
    player = new Player(scene, 400, 550, 'player');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create player at correct position', () => {
      expect(player.x).toBe(400);
      expect(player.y).toBe(550);
    });

    it('should setup controls', () => {
      expect(scene.input.keyboard.createCursorKeys).toHaveBeenCalled();
      expect(scene.input.keyboard.addKey).toHaveBeenCalled();
    });
  });

  describe('Movement', () => {
    it('should not move when no keys pressed', () => {
      player.update(16);
      expect((player.body as any).setVelocityX).toHaveBeenCalledWith(0);
    });

    it('should move left when left cursor down', () => {
      cursors.left.isDown = true;
      player.update(16);
      expect((player.body as any).setVelocityX).toHaveBeenCalledWith(-PLAYER_SPEED);
    });

    it('should move right when right cursor down', () => {
      cursors.right.isDown = true;
      player.update(16);
      expect((player.body as any).setVelocityX).toHaveBeenCalledWith(PLAYER_SPEED);
    });

    it('should prioritize touch input over keyboard', () => {
      // Mock TouchControlManager
      const mockTouch = {
        isEnabled: () => true,
        getDragX: () => null,
        getMoveDirection: () => 1, // Moving right
        consumeShootRequest: () => false
      };
      player.setTouchControls(mockTouch as any);
      
      // Press left on keyboard (should be ignored due to touch right)
      cursors.left.isDown = true;
      
      player.update(16);
      expect((player.body as any).setVelocityX).toHaveBeenCalledWith(PLAYER_SPEED);
    });
  });

  describe('Shooting', () => {
    it('should emit fireBullet event when space pressed', () => {
      spaceKey.isDown = true;
      player.update(16);
      // The exact Y position might vary based on implementation constants, checking rough value
      expect(scene.events.emit).toHaveBeenCalledWith('fireBullet', 400, expect.any(Number));
    });

    it('should respect cooldown', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      
      // First shot
      spaceKey.isDown = true;
      player.update(16);
      expect(scene.events.emit).toHaveBeenCalledTimes(1);
      
      // Immediate second shot (should fail)
      player.update(16);
      expect(scene.events.emit).toHaveBeenCalledTimes(1);
      
      // After cooldown
      vi.setSystemTime(1000 + PLAYER_SHOOT_COOLDOWN + 100);
      player.update(16); // This frame resets canShoot to true (at end of update)
      player.update(16); // This frame fires the shot
      expect(scene.events.emit).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });

    it('should fire when any non-excluded gamepad button is pressed', () => {
      const mockPad = {
        connected: true,
        axes: [{ getValue: vi.fn().mockReturnValue(0) }],
        buttons: [
          { pressed: false }, // configured fire (index 0)
          { pressed: false },
          { pressed: true } // alternate button should trigger fire
        ]
      };
      scene.input.gamepad.total = 1;
      scene.input.gamepad.getPad.mockReturnValue(mockPad);

      player.update(16);

      expect(scene.events.emit).toHaveBeenCalledWith('fireBullet', 400, expect.any(Number));
    });

    it('should not fire when only excluded buttons are pressed', () => {
      const mockPad = {
        connected: true,
        axes: [{ getValue: vi.fn().mockReturnValue(0) }],
        buttons: [
          { pressed: false }, // configured fire (index 0)
          { pressed: true },  // back/start substitute (excluded)
          { pressed: false },
          { pressed: false },
          { pressed: false },
          { pressed: false },
          { pressed: false },
          { pressed: false },
          { pressed: false },
          { pressed: true } // start button (index 9) excluded by default
        ]
      };
      scene.input.gamepad.total = 1;
      scene.input.gamepad.getPad.mockReturnValue(mockPad);

      player.update(16);

      expect(scene.events.emit).not.toHaveBeenCalledWith('fireBullet', 400, expect.any(Number));
    });
  });

  describe('Damage', () => {
    it('should flash tint when taking damage', () => {
      player.takeDamage();
      
      expect(player.setTint).toHaveBeenCalledWith(0xff0000);
      expect(scene.time.delayedCall).toHaveBeenCalledWith(200, expect.any(Function));
    });
  });
});
