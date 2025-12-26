import Phaser from 'phaser';
import { Alien } from './Alien';

/**
 * Base Alien Grid - Abstract Base Class
 *
 * This is the shared foundation for both SpaceInvadersGrid and GalagaGrid.
 *
 * TODO FOR CODING AGENT:
 * 1. Extract shared logic from SpaceInvadersGrid.ts
 * 2. Move these methods here (protected so subclasses can access):
 *    - createAlienGrid(rows, cols) - Creates the 2D alien array
 *    - getAliveAliens() - Returns array of alive aliens
 *    - getLeftmostAliveAlien() - For edge detection
 *    - getRightmostAliveAlien() - For edge detection
 *    - isAllDestroyed() - Check if grid is empty
 *    - reachedPlayer() - Check if any alien crossed threshold
 *    - removeAlien(alien) - Remove alien from grid
 *    - dropBombs() - Bomb dropping logic (same for both modes)
 *    - calculateBombDropChance() - Based on level
 *    - checkEdgeCollision() - Detect screen boundaries
 *
 * 3. Define abstract methods that subclasses MUST implement:
 *    - update(delta: number): void - Movement logic differs per mode
 *    - increaseDifficulty(newSpeed, newLevel): void - Speed changes differ
 *
 * 4. Keep these as protected properties:
 *    - aliens: (Alien | null)[][]
 *    - direction: number
 *    - level: number
 *    - rows: number
 *    - cols: number
 *    - faceTextures: string[]
 *
 * IMPORTANT: Do NOT change any logic - just extract and organize.
 * This is pure refactoring for code reuse.
 */

export abstract class BaseAlienGrid extends Phaser.GameObjects.Container {
  protected aliens: (Alien | null)[][] = [];
  protected direction: number = 1; // 1 for right, -1 for left
  protected level: number = 1;
  protected rows: number;
  protected cols: number;
  protected faceTextures: string[];
  protected debugging: boolean = false;

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

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Creates the 2D grid of aliens
   */
  protected createAlienGrid(rows: number, cols: number): void {
    // COPY LOGIC FROM SpaceInvadersGrid.createAlienGrid()
    throw new Error('TODO: Implement createAlienGrid in BaseAlienGrid');
  }

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Returns all aliens that are alive
   */
  getAliveAliens(): Alien[] {
    // COPY LOGIC FROM SpaceInvadersGrid.getAliveAliens()
    throw new Error('TODO: Implement getAliveAliens in BaseAlienGrid');
  }

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Check if all aliens destroyed (level complete)
   */
  isAllDestroyed(): boolean {
    // COPY LOGIC FROM SpaceInvadersGrid.isAllDestroyed()
    throw new Error('TODO: Implement isAllDestroyed in BaseAlienGrid');
  }

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Check if aliens reached player (game over)
   */
  reachedPlayer(): boolean {
    // COPY LOGIC FROM SpaceInvadersGrid.reachedPlayer()
    throw new Error('TODO: Implement reachedPlayer in BaseAlienGrid');
  }

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Remove an alien from the grid
   */
  removeAlien(alien: Alien): void {
    // COPY LOGIC FROM SpaceInvadersGrid.removeAlien()
    throw new Error('TODO: Implement removeAlien in BaseAlienGrid');
  }

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Handles bomb dropping logic (same for both modes)
   */
  protected dropBombs(): void {
    // COPY LOGIC FROM SpaceInvadersGrid.dropBombs()
    throw new Error('TODO: Implement dropBombs in BaseAlienGrid');
  }

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Calculate bomb drop chance based on level
   */
  protected calculateBombDropChance(): number {
    // COPY LOGIC FROM SpaceInvadersGrid.calculateBombDropChance()
    throw new Error('TODO: Implement calculateBombDropChance in BaseAlienGrid');
  }

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Detects if grid hit screen edges
   */
  protected checkEdgeCollision(): boolean {
    // COPY LOGIC FROM SpaceInvadersGrid.checkEdgeCollision()
    throw new Error('TODO: Implement checkEdgeCollision in BaseAlienGrid');
  }

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Get leftmost alive alien for boundary detection
   */
  protected getLeftmostAliveAlien(): Alien | null {
    // COPY LOGIC FROM SpaceInvadersGrid.getLeftmostAliveAlien()
    throw new Error('TODO: Implement getLeftmostAliveAlien in BaseAlienGrid');
  }

  /**
   * TODO: Extract from SpaceInvadersGrid.ts
   * Get rightmost alive alien for boundary detection
   */
  protected getRightmostAliveAlien(): Alien | null {
    // COPY LOGIC FROM SpaceInvadersGrid.getRightmostAliveAlien()
    throw new Error('TODO: Implement getRightmostAliveAlien in BaseAlienGrid');
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
    // TODO: Copy cleanup logic from SpaceInvadersGrid
    super.destroy(fromScene);
  }
}
