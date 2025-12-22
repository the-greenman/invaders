import Phaser from 'phaser';
import { BULLET_SPEED } from '../constants';

/**
 * Bullet Entity
 *
 * Represents a projectile fired by the player.
 * Moves upward and destroys aliens on contact.
 *
 * Extends Phaser.GameObjects.Sprite with physics body.
 */

export class Bullet extends Phaser.GameObjects.Sprite {
  private speed: number = BULLET_SPEED;
  private isBulletActive: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body as Phaser.Physics.Arcade.Body).setSize(4, 12);
    (this.body as Phaser.Physics.Arcade.Body).setVelocityY(-this.speed);
  }

  /**
   * (Re)activate a bullet from the pool with the correct physics settings.
   */
  launch(x: number, y: number): this {
    this.isBulletActive = true;
    this.setActive(true).setVisible(true);
    this.setPosition(x, y);

    if (!this.body) {
      this.scene.physics.add.existing(this);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(x, y);
    body.setSize(4, 12);
    body.setVelocity(0, -this.speed);
    return this;
  }

  /**
   * Update bullet state
   * @param delta - Time since last frame in ms
   *
   * TODO:
   * 1. Check if bullet is out of bounds
   * 2. Deactivate if out of bounds
   */
  update(delta: number): void {
    if (!this.isBulletActive) return;

    // Deactivate if bullet goes off screen
    if (this.y < -20) {
      this.destroy();
    }
  }

  /**
   * Handle collision with alien
   *
   * TODO:
   * 1. Deactivate bullet
   * 2. Play explosion effect
   * 3. Remove from scene
   */
  hit(): void {
    if (!this.isBulletActive) return;

    this.isBulletActive = false;
    
    // Could play explosion effect here
    // this.scene.sound.play('explosion');
    
    // Create small explosion effect
    const explosion = this.scene.add.circle(this.x, this.y, 8, 0xffff00);
    explosion.setAlpha(0.8);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => explosion.destroy()
    });
    
    this.destroy();
  }

  /**
   * Check if bullet is still active
   * @returns true if bullet is active
   */
  isActive(): boolean {
    return this.isBulletActive;
  }

  /**
   * Deactivate and remove bullet
   */
  destroy(fromScene?: boolean): void {
    this.isBulletActive = false;
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }
    super.destroy(fromScene);
  }
}
