import Phaser from 'phaser';
import { BOMB_SPEED } from '../constants';

/**
 * Bomb Entity
 *
 * Represents a projectile fired by aliens.
 * Moves downward and can destroy the player or shields.
 *
 * Extends Phaser.GameObjects.Sprite with physics body.
 */

export class Bomb extends Phaser.GameObjects.Sprite {
  private speed: number = BOMB_SPEED;
  private isBombActive: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bomb');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body as Phaser.Physics.Arcade.Body).setSize(4, 12);
    (this.body as Phaser.Physics.Arcade.Body).setVelocityY(this.speed);
  }

  /**
   * Update bomb state
   * @param delta - Time since last frame in ms
   *
   * TODO:
   * 1. Check if bomb is out of bounds
   * 2. Deactivate if out of bounds
   */
  update(delta: number): void {
    if (!this.isBombActive) return;

    // Deactivate if bomb goes off screen
    if (this.y > 620) {
      this.destroy();
    }
  }

  /**
   * Handle collision with player or shield
   *
   * TODO:
   * 1. Deactivate bomb
   * 2. Play explosion effect
   * 3. Remove from scene
   */
  hit(): void {
    if (!this.isBombActive) return;

    this.isBombActive = false;
    
    // Could play explosion effect here
    // this.scene.sound.play('explosion');
    
    // Create small explosion effect (magenta for bombs)
    const explosion = this.scene.add.circle(this.x, this.y, 8, 0xff00ff);
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
   * Check if bomb is still active
   * @returns true if bomb is active
   */
  isActive(): boolean {
    return this.isBombActive;
  }

  /**
   * Deactivate and remove bomb
   */
  destroy(): void {
    this.isBombActive = false;
    super.destroy();
  }
}
