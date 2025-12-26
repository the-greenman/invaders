import { BaseAlienGrid } from './BaseAlienGrid';
import { WaveManager } from '../systems/WaveManager';
import { Alien } from './Alien';
import { GAME_WIDTH, GALAGA_FORMATION_SPEED } from '../constants';

/**
 * Galaga Grid (Game 2)
 *
 * Manages alien formation with smooth velocity-based movement and wave attacks.
 *
 * TODO FOR CODING AGENT:
 * 1. Make this extend BaseAlienGrid
 * 2. Add constructor that calls super() and creates WaveManager
 * 3. Implement smooth side-to-side movement (velocity-based, NOT step-based)
 * 4. Integrate WaveManager for wave attack coordination
 * 5. Override update() to:
 *    - Calculate smooth movement based on delta time
 *    - Apply velocity: movement = formationSpeed * direction * (delta / 1000)
 *    - Reverse direction at edges (checkEdgeCollision from base)
 *    - Only move aliens IN_FORMATION state (skip attacking/returning aliens)
 *    - Call waveManager.update(delta)
 *    - Call dropBombs() from base
 * 6. Implement increaseDifficulty() to adjust formationSpeed
 *
 * MOVEMENT FORMULA:
 * movement = GALAGA_FORMATION_SPEED * direction * (delta / 1000)
 * This gives smooth pixels-per-second movement instead of discrete steps.
 */

export class GalagaGrid extends BaseAlienGrid {
  private formationSpeed: number = GALAGA_FORMATION_SPEED;
  private waveManager: WaveManager;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rows: number,
    cols: number,
    formationSpeed: number,
    faceTextures: string[] = [],
    level: number = 1
  ) {
    super(scene, x, y, rows, cols, faceTextures, level);

    this.formationSpeed = formationSpeed;

    // TODO: Create WaveManager instance
    // this.waveManager = new WaveManager(this, scene);

    // TODO: Create alien grid using base class method
    // this.createAlienGrid(rows, cols);

    throw new Error('TODO: Implement GalagaGrid constructor');
  }

  /**
   * TODO: Implement smooth velocity-based movement
   *
   * ALGORITHM:
   * 1. Calculate movement distance: formationSpeed * direction * (delta / 1000)
   * 2. Check edge collision (use base.checkEdgeCollision())
   * 3. If hit edge: reverse direction (this.direction *= -1)
   * 4. Move only aliens with state === AlienState.IN_FORMATION
   * 5. Call waveManager.update(delta) to handle waves
   * 6. Call dropBombs() for formation bombing
   *
   * IMPORTANT: Use delta for frame-independent movement!
   */
  update(delta: number): void {
    // TODO: Implement smooth movement
    // const movement = this.formationSpeed * this.direction * (delta / 1000);

    // if (this.checkEdgeCollision()) {
    //   this.direction *= -1;
    // }

    // for (const alien of this.getAliensInFormation()) {
    //   alien.move(movement, 0);
    // }

    // this.waveManager.update(delta);
    // this.dropBombs();

    throw new Error('TODO: Implement GalagaGrid.update()');
  }

  /**
   * Get aliens currently in formation (not attacking or returning)
   */
  private getAliensInFormation(): Alien[] {
    // TODO: Filter aliens by state === AlienState.IN_FORMATION
    // Return array of aliens in formation
    return [];
  }

  /**
   * TODO: Adjust formation speed for difficulty scaling
   */
  increaseDifficulty(newSpeed: number, newLevel: number): void {
    this.formationSpeed = newSpeed;
    this.level = newLevel;
    // WaveManager will scale wave frequency based on level
  }

  /**
   * Clean up wave manager
   */
  destroy(fromScene?: boolean): void {
    this.waveManager?.destroy();
    super.destroy(fromScene);
  }
}
