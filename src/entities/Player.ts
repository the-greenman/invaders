import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_SHOOT_COOLDOWN, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_CORE_RADIUS } from '../constants';
import { Bullet } from './Bullet';

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
  private coreCircle?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string = 'player') {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT, true); // center body to sprite
    body.setCollideWorldBounds(true);
    body.setImmovable(true);

    this.cursors = scene.input.keyboard?.createCursorKeys()!;
    this.spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)!;

    // Core circle placeholder for future face texture
    this.coreCircle = this.scene.add.circle(this.x, this.y, PLAYER_CORE_RADIUS, 0x000000, 0.8);
    this.coreCircle.setStrokeStyle(2, 0xffffff, 0.5);
    this.coreCircle.setDepth(this.depth + 1);
    this.syncCorePosition();
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

    // Handle movement
    if (this.cursors.left.isDown) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(-PLAYER_SPEED);
    } else if (this.cursors.right.isDown) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(PLAYER_SPEED);
    } else {
      (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    }

    // Handle shooting
    if (this.spaceKey.isDown && this.canShoot) {
      this.shoot();
    }

    // Update shoot cooldown
    if (!this.canShoot && Date.now() - this.lastShotTime > this.shootCooldown) {
      this.canShoot = true;
    }

    this.syncCorePosition();
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
  reset(): void {
    this.setPosition(400, 550);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.canShoot = true;
    this.lastShotTime = 0;
    this.clearTint();
    this.setActive(true);
    this.setVisible(true);
    this.syncCorePosition();
  }

  destroy(fromScene?: boolean): void {
    if (this.coreCircle) {
      this.coreCircle.destroy();
      this.coreCircle = undefined;
    }
    super.destroy(fromScene);
  }

  private syncCorePosition(): void {
    if (this.coreCircle) {
      this.coreCircle.setPosition(this.x, this.y);
    }
  }
}
