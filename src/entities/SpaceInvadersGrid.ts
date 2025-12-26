import Phaser from 'phaser';
import { BaseAlienGrid } from './BaseAlienGrid';
import {
  ALIEN_WIDTH,
  GAME_WIDTH,
  BOMB_DROP_ENABLED
} from '../constants';

/**
 * Space Invaders Grid Entity (Game 1)
 *
 * Manages the formation of all aliens in classic Space Invaders mode.
 * Handles step-based grid movement, direction changes, and bomb dropping.
 *
 * This is the original AlienGrid renamed for Game Mode system.
 * NO LOGIC CHANGES - Game 1 behavior preserved exactly.
 *
 * Extends BaseAlienGrid to share common logic with GalagaGrid.
 */

export class SpaceInvadersGrid extends BaseAlienGrid {
  private speed: number;
  private moveTimer: Phaser.Time.TimerEvent | null = null;
  private stepIndex: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rows: number,
    cols: number,
    speed: number,
    faceTextures: string[] = [],
    level: number = 1
  ) {
    super(scene, x, y, rows, cols, faceTextures, level);

    this.speed = speed;

    this.createAlienGrid(rows, cols);
    this.startMovement();

    // Initial debug info
    this.debugLog('created', {
      x: this.x,
      y: this.y,
      rows,
      cols,
      speed,
      level,
      bombDropChance: this.calculateBombDropChance()
    });
    const b = this.getBounds();
    this.debugLog('bounds', { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom) });
  }

  public dumpState(label: string = 'dump'): void {
    const leftmost = this.getLeftmostAliveAlien();
    const rightmost = this.getRightmostAliveAlien();
    const mode = leftmost && (leftmost as any).parentContainer ? 'IN_CONTAINER' : 'WORLD_SPACE';
    const leftEdge = leftmost ? leftmost.x - leftmost.displayWidth * 0.5 : NaN;
    const rightEdge = rightmost ? rightmost.x + rightmost.displayWidth * 0.5 : NaN;
    this.debugLog(label, { mode, gridX: Math.round(this.x), gridY: Math.round(this.y),
      leftmostX: leftmost ? Math.round(leftmost.x) : null,
      rightmostX: rightmost ? Math.round(rightmost.x) : null,
      leftEdge: isNaN(leftEdge) ? null : Math.round(leftEdge),
      rightEdge: isNaN(rightEdge) ? null : Math.round(rightEdge), dir: this.direction });
  }

  /**
   * Update alien grid movement and bomb dropping
   * @param delta - Time since last frame in ms
   *
   * 1. Move all aliens horizontally
   * 2. Check for edge collision and change direction
   * 3. Move down if direction changed
   * 4. Randomly drop bombs from aliens
   */
  private startMovement(): void {
    this.moveTimer = this.scene.time.addEvent({
      delay: this.speed,
      callback: this.moveStep,
      callbackScope: this,
      loop: true
    });
    this.debugLog('timer started', { delay: this.speed });
  }

  update(delta: number): void {
    // Intentionally light. Physics bodies are synced when aliens actually move
    // via Alien.move(), avoiding jumpy movement from per-frame resets.

    // Try to drop bombs every frame (using per-frame probability)
    if (BOMB_DROP_ENABLED) {
      this.dropBombs();
    }
  }

  /**
   * Move all aliens horizontally
   *
   * 1. Calculate movement offset based on direction and speed
   * 2. Move each alive alien
   */
  private moveAliens(): void {
    const dx = 20 * this.direction; // Move 20 pixels per step
    this.debugLog('moveAliens', { step: this.stepIndex, dx });
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          alien.move(dx, 0);
        }
      }
    }
  }
  private moveStep(): void {
    this.stepIndex++;
    this.debugLog('moveStep', { step: this.stepIndex, dir: this.direction });
    // Check for edge collision first
    if (this.checkEdgeCollision()) {
      this.moveDownAndReverse();
    } else {
      this.moveAliens();
    }

    // Note: Bomb dropping now happens in update() every frame
  }

  /**
   * Move all aliens down and reverse direction
   *
   * 1. Reverse direction
   * 2. Move all aliens down by one row height
   */
  private moveDownAndReverse(): void {
    this.direction *= -1;
    this.debugLog('moveDownAndReverse', { newDir: this.direction });
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          alien.move(0, 20);
        }
      }
    }
  }

  /**
   * Sync all alive alien physics bodies to their world positions.
   * Called after container moves to keep Arcade bodies aligned.
   */
  private syncBodiesToWorld(): void {
    let count = 0;
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (!alien || !alien.isAlive()) continue;
        const world = alien.getWorldTransformMatrix();
        const body = alien.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.reset(world.tx, world.ty);
          count++;
        }
      }
    }
    this.debugLog('syncBodiesToWorld', { synced: count });
  }

  /**
   * Increase difficulty (speed and level-based bomb frequency)
   * @param newSpeed - New movement speed
   * @param newLevel - New game level (used to calculate bomb drop chance)
   */
  increaseDifficulty(newSpeed: number, newLevel: number): void {
    this.speed = newSpeed;
    this.level = newLevel;

    // Restart timer with new speed
    if (this.moveTimer) {
      this.moveTimer.remove();
    }
    this.startMovement();

    this.debugLog('difficulty increased', {
      speed: this.speed,
      level: this.level,
      bombDropChance: this.calculateBombDropChance()
    });
  }

  destroy(fromScene?: boolean): void {
    if (this.moveTimer) {
      this.moveTimer.remove();
    }
    super.destroy(fromScene);
  }
}
