import Phaser from 'phaser';
import { POINTS } from '../constants';
import { Bomb } from './Bomb';

/**
 * Alien Entity
 *
 * Represents an individual alien sprite in the formation.
 * Handles movement, animation, and collision detection.
 *
 * Extends Phaser.GameObjects.Sprite with physics body.
 */

export class Alien extends Phaser.GameObjects.Sprite {
  private points: number;
  private alienType: number; // 0, 1, or 2 for different alien types
  private gridPosition: { row: number; col: number };
  private alive: boolean = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: number = 0,
    gridPosition: { row: number; col: number }
  ) {
    super(scene, x, y, `alien-${type}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.alienType = type;
    this.gridPosition = gridPosition;
    
    // Set points based on alien type
    this.points = [POINTS.ALIEN_BOTTOM, POINTS.ALIEN_MIDDLE, POINTS.ALIEN_TOP][type] || POINTS.ALIEN_BOTTOM;

    (this.body as Phaser.Physics.Arcade.Body).setSize(32, 24);
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    // Play animation if available
    if (this.scene.anims.exists(`alien-${type}-anim`)) {
      this.play(`alien-${type}-anim`);
    }
  }

  /**
   * Update alien state
   * @param delta - Time since last frame in ms
   *
   * TODO:
   * 1. Update animation if needed
   * 2. Handle state changes
   */
  update(delta: number): void {
    if (!this.alive) return;

    // Aliens are primarily controlled by AlienGrid
    // Individual update logic can be added here if needed
  }

  /**
   * Move alien by specified offset
   * @param dx - Horizontal movement
   * @param dy - Vertical movement
   *
   * TODO:
   * 1. Update position
   * 2. Update physics body
   */
  move(dx: number, dy: number): void {
    if (!this.alive) return;
    
    this.x += dx;
    this.y += dy;
    (this.body as Phaser.Physics.Arcade.Body).reset(this.x, this.y);
  }

  /**
   * Handle alien being destroyed
   *
   * TODO:
   * 1. Mark as not alive
   * 2. Play explosion animation
   * 3. Play sound effect
   * 4. Return points value
   */
  destroy(): number {
    if (!this.alive) return 0;

    this.alive = false;
    
    // Play explosion effect
    const explosion = this.scene.add.circle(this.x, this.y, 16, 0xff0000);
    explosion.setAlpha(0.8);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 3,
      duration: 300,
      onComplete: () => explosion.destroy()
    });
    
    // Could play sound here
    // this.scene.sound.play('explosion');
    
    super.destroy();
    return this.points;
  }

  /**
   * Fire a bomb from this alien
   * @returns Bomb object or null if can't fire
   *
   * TODO:
   * 1. Check if alien can fire (based on position or random chance)
   * 2. Create new Bomb at alien position
   * 3. Return the bomb
   */
  fireBomb(): Bomb | null {
    if (!this.alive) return null;
    
    // Bomb firing is controlled by AlienGrid for better difficulty tuning
    // This method just creates the bomb when called
    const bomb = new Bomb(this.scene, this.x, this.y + 20);
    return bomb;
  }

  /**
   * Check if alien is still alive
   * @returns true if alien is alive
   */
  isAlive(): boolean {
    return this.alive;
  }

  /**
   * Get alien's point value
   * @returns Points awarded for destroying this alien
   */
  getPoints(): number {
    return this.points;
  }

  /**
   * Get alien's grid position
   * @returns Grid coordinates {row, col}
   */
  getGridPosition(): { row: number; col: number } {
    return this.gridPosition;
  }
}
