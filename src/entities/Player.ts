import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_SHOOT_COOLDOWN } from '../constants';
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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body as Phaser.Physics.Arcade.Body).setSize(32, 24);
    (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    this.cursors = scene.input.keyboard?.createCursorKeys()!;
    this.spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)!;
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
  shoot(): Bullet | null {
    if (!this.canShoot || !this.active) return null;

    this.canShoot = false;
    this.lastShotTime = Date.now();
    
    // Create bullet above player
    const bullet = (this.scene as any).fireBullet?.(this.x, this.y - 20);
    
    return bullet;
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
  }
}
