import Phaser from 'phaser';
import { Alien } from './Alien';
import {
  ALIEN_SPACING_X,
  ALIEN_SPACING_Y,
  GAME_WIDTH,
  ALIEN_WIDTH,
  ABDUCTION_THRESHOLD_Y,
  BOMB_DROP_ENABLED,
  BOMB_DROP_BASE_CHANCE,
  BOMB_DROP_LEVEL_INCREASE
} from '../constants';

/**
 * Base Alien Grid - Abstract Base Class
 *
 * This is the shared foundation for both SpaceInvadersGrid and GalagaGrid.
 */

export abstract class BaseAlienGrid extends Phaser.GameObjects.Container {
  protected aliens: (Alien | null)[][] = [];
  protected direction: number = 1; // 1 for right, -1 for left
  protected level: number = 1;
  protected rows: number;
  protected cols: number;
  protected faceTextures: string[];
  protected debugging: boolean = false;
  protected faceTextureIndex: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rows: number,
    cols: number,
    faceTextures: string[] = [],
    level: number = 1
  ) {
    super(scene, x, y);
    scene.add.existing(this);

    this.rows = rows;
    this.cols = cols;
    this.faceTextures = faceTextures;
    this.level = level;
  }

  public setDebug(enabled: boolean): void {
    this.debugging = enabled;
    this.debugLog('debugging set to', enabled);
  }

  protected debugLog(...args: any[]): void {
    if (this.debugging) console.log('[AlienGrid]', ...args);
  }

  /**
   * Creates the 2D grid of aliens
   */
  protected createAlienGrid(rows: number, cols: number): void {
    this.aliens = [];
    
    for (let row = 0; row < rows; row++) {
      this.aliens[row] = [];
      for (let col = 0; col < cols; col++) {
        const localX = col * ALIEN_SPACING_X;
        const localY = row * ALIEN_SPACING_Y;

        // Different alien types for different rows
        let type = 0; // bottom rows
        if (row < 1) type = 2; // top row
        else if (row < 3) type = 1; // middle rows

        const texKey = this.faceTextures.length > 0
          ? this.faceTextures[this.faceTextureIndex++ % this.faceTextures.length]
          : undefined;

        // Place in world space relative to grid origin
        const alien = new Alien(this.scene, this.x + localX, this.y + localY, type, { row, col }, texKey);
        this.aliens[row][col] = alien;
      }
    }
  }

  /**
   * Returns all aliens that are alive
   */
  getAliveAliens(): Alien[] {
    const aliveAliens: Alien[] = [];
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          aliveAliens.push(alien);
        }
      }
    }
    return aliveAliens;
  }

  /**
   * Check if all aliens destroyed (level complete)
   */
  isAllDestroyed(): boolean {
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if aliens reached player (game over)
   */
  reachedPlayer(): boolean {
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (!alien || !alien.isAlive()) continue;
        const bottom = alien.y + alien.displayHeight * 0.5;
        if (bottom >= ABDUCTION_THRESHOLD_Y) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Remove an alien from the grid
   */
  removeAlien(alien: Alien): void {
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        if (this.aliens[row][col] === alien) {
          this.aliens[row][col] = null;
          return;
        }
      }
    }
  }

  /**
   * Handles bomb dropping logic (same for both modes)
   */
  protected dropBombs(): void {
    const dropChance = this.calculateBombDropChance();

    // Check each alien for bomb drop (per frame, like BombTestScene)
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const alien = this.aliens[row][col];
        if (!alien || !alien.isAlive()) continue;

        // Random chance to drop bomb
        if (Math.random() < dropChance) {
          // Find bottom-most alien in this column
          let bottomAlien: Alien | null = null;
          for (let r = this.rows - 1; r >= 0; r--) {
            const a = this.aliens[r][col];
            if (a && a.isAlive()) {
              bottomAlien = a;
              break;
            }
          }

          if (bottomAlien) {
            // Emit dropBomb event for GameScene to handle (aliens are world-space)
            const wx = bottomAlien.x;
            const wy = bottomAlien.y + 20;
            this.debugLog('bombDrop', { col, wx: Math.round(wx), wy: Math.round(wy) });
            this.scene.events.emit('dropBomb', wx, wy);
            return; // Only one bomb per frame max
          }
        }
      }
    }
  }

  /**
   * Calculate bomb drop chance based on level
   */
  protected calculateBombDropChance(): number {
    return BOMB_DROP_BASE_CHANCE + (BOMB_DROP_LEVEL_INCREASE * (this.level - 1));
  }

  /**
   * Detects if grid hit screen edges
   */
  protected checkEdgeCollision(): boolean {
    const margin = 50;
    const leftmost = this.getLeftmostAliveAlien();
    const rightmost = this.getRightmostAliveAlien();
    if (!leftmost || !rightmost) return false;

    // Aliens are in world space now
    const leftEdge = leftmost.x - ALIEN_WIDTH * 0.5;
    const rightEdge = rightmost.x + ALIEN_WIDTH * 0.5;
    const atEdge = (leftEdge <= margin && this.direction === -1) ||
                   (rightEdge >= GAME_WIDTH - margin && this.direction === 1);
    
    return atEdge;
  }

  /**
   * Get leftmost alive alien for boundary detection
   */
  protected getLeftmostAliveAlien(): Alien | null {
    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          return alien;
        }
      }
    }
    return null;
  }

  /**
   * Get rightmost alive alien for boundary detection
   */
  protected getRightmostAliveAlien(): Alien | null {
    for (let col = this.cols - 1; col >= 0; col--) {
      for (let row = 0; row < this.rows; row++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          return alien;
        }
      }
    }
    return null;
  }

  /**
   * Get number of alive aliens
   */
  getAliveCount(): number {
    let count = 0;
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Abstract method - each mode implements differently
   * SpaceInvaders: Step-based timer movement
   * Galaga: Smooth velocity-based movement + wave attacks
   */
  abstract update(delta: number): void;

  /**
   * Abstract method - each mode scales difficulty differently
   */
  abstract increaseDifficulty(newSpeed: number, newLevel: number): void;

  /**
   * Clean up resources
   */
  destroy(fromScene?: boolean): void {
    super.destroy(fromScene);
  }
}
