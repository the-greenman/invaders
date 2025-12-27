import { BaseAlienGrid } from './BaseAlienGrid';
import { WaveManager } from '../systems/WaveManager';
import { Alien, AlienState } from './Alien';
import { GAME_WIDTH, GALAGA_FORMATION_SPEED } from '../constants';

/**
 * Galaga Grid (Game 2)
 *
 * Manages alien formation with smooth velocity-based movement and wave attacks.
 *
 * Features:
 * - Smooth velocity-based movement (pixels per second)
 * - Wave attack system via WaveManager
 * - State-based alien filtering (only IN_FORMATION aliens move with grid)
 * - Delta-based frame-independent physics
 */

export class GalagaGrid extends BaseAlienGrid {
  private formationSpeed: number = GALAGA_FORMATION_SPEED;
  private waveManager: WaveManager;
  private homingStrength: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rows: number,
    cols: number,
    formationSpeed: number,
    homingStrength: number,
    faceTextures: string[] = [],
    level: number = 1
  ) {
    super(scene, x, y, rows, cols, faceTextures, level);

    this.formationSpeed = formationSpeed;
    this.homingStrength = homingStrength;

    // Create WaveManager instance
    this.waveManager = new WaveManager(this, scene, this.homingStrength);

    // Create alien grid using base class method
    this.createAlienGrid(rows, cols);
  }

  /**
   * Update Galaga grid with smooth velocity-based movement
   *
   * Moves formation aliens left/right smoothly, updates wave attacks,
   * and handles bomb dropping. Uses delta for frame-independent movement.
   */
  update(delta: number): void {
    // Smooth movement using pixels-per-second
    const movement = this.formationSpeed * this.direction * (delta / 1000);

    if (this.checkEdgeCollision()) {
      this.direction *= -1;
    }

    for (const alien of this.getAliensInFormation()) {
      alien.move(movement, 0);
    }

    this.waveManager.update(delta);
    this.dropBombs();
  }

  /**
   * Get aliens currently in formation (not attacking or returning)
   */
  private getAliensInFormation(): Alien[] {
    const inFormation: Alien[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive() && alien.getState() === AlienState.IN_FORMATION) {
          inFormation.push(alien);
        }
      }
    }
    return inFormation;
  }

  /**
   * Adjust formation speed for difficulty scaling
   */
  increaseDifficulty(newSpeed: number, newLevel: number): void {
    this.formationSpeed = newSpeed;
    this.level = newLevel;
    // WaveManager will scale wave frequency based on level
  }

  /**
   * Get the number of active attack waves (for UI display)
   */
  getActiveWaveCount(): number {
    return this.waveManager.getActiveWaveCount();
  }

  /**
   * Clean up wave manager
   */
  destroy(fromScene?: boolean): void {
    this.waveManager?.destroy();
    super.destroy(fromScene);
  }
}
