import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_SHOOT_COOLDOWN, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_BODY_SCALE, GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Bullet } from './Bullet';
import { LocalStorage } from '../utils/localStorage';
import { TouchControlManager } from '../managers/TouchControlManager';

/**
 * Player Entity
 *
 * Represents the defender ship controlled by the player.
 * Handles movement, shooting, and collision detection.
 *
 * Extends Phaser.GameObjects.Sprite with physics body.
 */

export class Player extends Phaser.GameObjects.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private canShoot: boolean = true;
  private shootCooldown: number = PLAYER_SHOOT_COOLDOWN;
  private lastShotTime: number = 0;
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevShootPressed: boolean = false;
  private fireButtonIndex: number = 0;
  private touchControls: TouchControlManager | null = null;

  private lastSettingsPollTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string = 'player') {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_WIDTH * PLAYER_BODY_SCALE, PLAYER_HEIGHT * PLAYER_BODY_SCALE, true); // center body to sprite
    body.setCollideWorldBounds(true);
    body.setImmovable(true);

    this.cursors = scene.input.keyboard?.createCursorKeys()!;
    this.spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)!;

    const settings = LocalStorage.getSettings();
    this.fireButtonIndex = settings.controllerFireButton ?? 0;

    // Gamepad setup
    this.setupGamepad();
  }

  /**
   * Set touch controls (called by GameScene after creating TouchControlManager)
   */
  setTouchControls(touchControls: TouchControlManager): void {
    this.touchControls = touchControls;
  }

  private setupGamepad(): void {
    if (!this.scene.input.gamepad) {
      console.warn('Player: Input Gamepad Plugin missing!');
      return;
    }

    // Try to get existing pad
    if (this.scene.input.gamepad.total > 0) {
      this.gamepad = this.scene.input.gamepad.getPad(0);
      if (this.gamepad) console.log('Player: Gamepad found on init:', this.gamepad.id);
    } else {
      console.log('Player: No gamepads found on init. Total:', this.scene.input.gamepad.total);
    }

    // Listen for new connections
    this.scene.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      if (!this.gamepad) {
        this.gamepad = pad;
        console.log('Player: Gamepad connected event:', pad.id);
      }
    });

    this.scene.input.gamepad.on('disconnected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      if (this.gamepad === pad) {
        this.gamepad = null;
        console.log('Player: Gamepad disconnected event:', pad.id);
      }
    });
  }

  /**
   * Update player movement and handle shooting
   * @param delta - Time since last frame in ms
   *
   * TODO:
   * 1. Handle left/right movement with cursors
   * 2. Handle shooting with space key
   * 3. Enforce shoot cooldown
   */
  update(delta: number): void {
    if (!this.active) return;

    // Allow controller bindings to take effect without restarting the scene.
    // (ControllerDebugScene can change localStorage while this Player instance is alive.)
    if (this.scene.time && this.scene.time.now - this.lastSettingsPollTime > 500) {
      const settings = LocalStorage.getSettings();
      const configured = settings.controllerFireButton;
      if (typeof configured === 'number' && configured !== this.fireButtonIndex) {
        this.fireButtonIndex = configured;
      }
      this.lastSettingsPollTime = this.scene.time.now;
    }

    // Lazy acquisition: if no gamepad yet, check if one is available
    if (!this.gamepad && this.scene.input.gamepad && this.scene.input.gamepad.total > 0) {
      this.gamepad = this.scene.input.gamepad.getPad(0);
      if (this.gamepad) console.log('Player: Lazy acquired gamepad:', this.gamepad.id);
    }

    // Handle gamepad disconnect
    if (this.gamepad && !this.gamepad.connected) {
      this.gamepad = null;
      console.log('Player: Gamepad disconnected check');
    }

    // Handle movement
    const body = this.body as Phaser.Physics.Arcade.Body;
    let moveX = 0;

    // Keyboard input
    if (this.cursors.left.isDown) moveX = -1;
    else if (this.cursors.right.isDown) moveX = 1;

    // Gamepad input (overrides keyboard)
    if (this.gamepad) {
      const axisX = this.gamepad.axes.length > 0 ? this.gamepad.axes[0].getValue() : 0;
      if (Math.abs(axisX) > 0.15) {
        moveX = axisX;
      } else {
        if (this.gamepad.left) moveX = -1;
        else if (this.gamepad.right) moveX = 1;
      }
    }

    // Touch input (overrides keyboard and gamepad)
    const dragX = this.touchControls && this.touchControls.isEnabled() ? this.touchControls.getDragX() : null;
    if (this.touchControls && this.touchControls.isEnabled()) {
      if (dragX !== null) {
        const clamped = Phaser.Math.Clamp(dragX, PLAYER_WIDTH / 2, GAME_WIDTH - PLAYER_WIDTH / 2);
        this.setX(clamped);
        body.setVelocityX(0);
        moveX = 0;
      } else {
        const touchMove = this.touchControls.getMoveDirection();
        if (touchMove !== 0) {
          moveX = touchMove;
        }
      }
    }

    body.setVelocityX(moveX * PLAYER_SPEED);

    // Handle shooting
    const padShoot = (this.gamepad && this.fireButtonIndex >= 0)
      ? this.gamepad.buttons[this.fireButtonIndex]?.pressed
      : false;
    const touchShoot = this.touchControls ? this.touchControls.consumeShootRequest() : false;

    if (this.spaceKey.isDown && this.canShoot) {
      this.shoot();
    } else if (padShoot && this.canShoot && !this.prevShootPressed) {
      this.shoot();
    } else if (touchShoot && this.canShoot) {
      this.shoot();
    }
    this.prevShootPressed = padShoot || this.spaceKey.isDown;

    // Update shoot cooldown
    if (!this.canShoot && Date.now() - this.lastShotTime > this.shootCooldown) {
      this.canShoot = true;
    }
  }

  /**
   * Fire a bullet from the player's position
   *
   * TODO:
   * 1. Check if player can shoot (cooldown)
   * 2. Create new bullet at player position
   * 3. Reset shoot cooldown
   * 4. Play shoot sound
   */
  shoot(): void {
    if (!this.canShoot || !this.active) return;

    this.canShoot = false;
    this.lastShotTime = Date.now();
    
    // Emit fireBullet event for GameScene to handle
    this.scene.events.emit('fireBullet', this.x, this.y - 20);
  }

  /**
   * Handle player taking damage
   *
   * TODO:
   * 1. Play hit effect/sound
   * 2. Flash sprite or play animation
   * 3. Reduce lives (managed by scene)
   */
  takeDamage(): void {
    if (!this.active) return;

    // Flash effect
    this.setTint(0xff0000);
    this.scene.time.delayedCall(200, () => {
      this.clearTint();
    });

    // Could play sound here
    // this.scene.sound.play('player-hit');
  }

  /**
   * Reset player to initial state
   *
   * TODO:
   * 1. Reset position
   * 2. Reset shooting cooldown
   * 3. Reset visual state
   */
  reset(x: number = GAME_WIDTH / 2, y: number = GAME_HEIGHT - 50): void {
    this.setPosition(x, y);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.canShoot = true;
    this.lastShotTime = 0;
    this.clearTint();
    this.setActive(true);
    this.setVisible(true);
  }

  destroy(fromScene?: boolean): void {
    // Cleanup listeners
    if (this.scene && this.scene.input && this.scene.input.gamepad) {
      this.scene.input.gamepad.off('connected');
      this.scene.input.gamepad.off('disconnected');
    }
    super.destroy(fromScene);
  }
}
