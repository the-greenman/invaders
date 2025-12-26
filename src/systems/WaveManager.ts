import { GalagaGrid } from '../entities/GalagaGrid';
import { Alien, AlienState } from '../entities/Alien';
import { AttackPath, createRandomAttackPath } from './AttackPath';
import {
  GALAGA_WAVE_MIN_INTERVAL,
  GALAGA_WAVE_MAX_INTERVAL,
  GALAGA_WAVE_MIN_SIZE,
  GALAGA_WAVE_MAX_SIZE,
  GALAGA_MAX_SIMULTANEOUS_WAVES,
  GALAGA_RETURN_SPEED
} from '../constants';

/**
 * Wave Manager - Coordinates alien attack waves
 *
 * TODO FOR CODING AGENT:
 * 1. Implement wave launching logic:
 *    - Select N aliens from bottom row (random selection)
 *    - Assign attack paths to each alien
 *    - Track wave state (active, launching, completed)
 * 2. Implement wave updates:
 *    - Update aliens in ATTACKING state (follow their paths)
 *    - Detect path completion, trigger RETURNING state
 *    - Update aliens in RETURNING state (navigate back to formation)
 *    - Clean up completed waves
 * 3. Implement wave timing:
 *    - Random intervals between waves (GALAGA_WAVE_MIN/MAX_INTERVAL)
 *    - Don't exceed max simultaneous waves limit
 *    - Scale frequency with level
 * 4. Implement return-to-formation:
 *    - Calculate vector from current position to formationPosition
 *    - Move at GALAGA_RETURN_SPEED toward formation slot
 *    - When close enough (< 5 pixels), snap to position and set IN_FORMATION
 *
 * WAVE LIFECYCLE:
 * 1. shouldLaunchWave() checks timing and limits
 * 2. launchWave() selects aliens, creates paths, sets ATTACKING
 * 3. update() moves aliens along paths
 * 4. Path complete → startReturnToFormation() sets RETURNING
 * 5. updateReturnToFormation() navigates back
 * 6. Arrival → set IN_FORMATION, remove from active waves
 */

export interface Wave {
  aliens: Alien[];
  launchTime: number;
  active: boolean;
}

export class WaveManager {
  private grid: GalagaGrid;
  private scene: Phaser.Scene;
  private activeWaves: Wave[] = [];
  private lastWaveTime: number = 0;

  constructor(grid: GalagaGrid, scene: Phaser.Scene) {
    this.grid = grid;
    this.scene = scene;
  }

  /**
   * Main update loop - called every frame by GalagaGrid
   */
  update(delta: number): void {
    // TODO: Update all active waves
    // for (const wave of this.activeWaves) {
    //   for (const alien of wave.aliens) {
    //     if (alien.getState() === AlienState.ATTACKING) {
    //       alien.followPath(delta);
    //       if (alien.getAttackPath()?.isComplete()) {
    //         this.startReturnToFormation(alien);
    //       }
    //     } else if (alien.getState() === AlienState.RETURNING) {
    //       this.updateReturnToFormation(alien, delta);
    //     }
    //   }
    // }

    // // Launch new wave if ready
    // if (this.shouldLaunchWave()) {
    //   this.launchWave();
    // }

    // // Clean up completed waves
    // this.cleanupCompletedWaves();

    throw new Error('TODO: Implement WaveManager.update()');
  }

  /**
   * Check if we should launch a new wave
   */
  private shouldLaunchWave(): boolean {
    // TODO: Check conditions:
    // 1. Not too many active waves (< GALAGA_MAX_SIMULTANEOUS_WAVES)
    // 2. Enough time since last wave
    // 3. Aliens available in bottom row

    // const now = Date.now();
    // const timeSinceLastWave = now - this.lastWaveTime;
    // const interval = Phaser.Math.Between(
    //   GALAGA_WAVE_MIN_INTERVAL,
    //   GALAGA_WAVE_MAX_INTERVAL
    // );

    // return this.activeWaves.length < GALAGA_MAX_SIMULTANEOUS_WAVES &&
    //        timeSinceLastWave > interval &&
    //        this.getBottomRowAliens().length > 0;

    return false;
  }

  /**
   * Launch a new attack wave
   */
  private launchWave(): void {
    // TODO: Implementation
    // 1. Determine wave size (random between MIN/MAX)
    // const waveSize = Phaser.Math.Between(
    //   GALAGA_WAVE_MIN_SIZE,
    //   GALAGA_WAVE_MAX_SIZE
    // );

    // 2. Select aliens from bottom row
    // const selectedAliens = this.selectBottomRowAliens(waveSize);

    // 3. For each alien:
    //    - Record formation position: alien.setFormationPosition(alien.x, alien.y)
    //    - Create attack path: const path = createRandomAttackPath()
    //    - Start path: path.start(alien.x, alien.y)
    //    - Assign to alien: alien.setAttackPath(path)
    //    - Set state: alien.setState(AlienState.ATTACKING)

    // 4. Track wave
    // this.activeWaves.push({
    //   aliens: selectedAliens,
    //   launchTime: Date.now(),
    //   active: true
    // });
    // this.lastWaveTime = Date.now();

    throw new Error('TODO: Implement WaveManager.launchWave()');
  }

  /**
   * Get aliens from bottom row available for waves
   */
  private getBottomRowAliens(): Alien[] {
    // TODO: Get all alive aliens from bottom row with state IN_FORMATION
    // const bottomRow = this.grid.getAliveAliens().filter(alien =>
    //   alien.getGridPosition().row === this.grid.rows - 1 &&
    //   alien.getState() === AlienState.IN_FORMATION
    // );
    // return bottomRow;

    return [];
  }

  /**
   * Randomly select N aliens from bottom row
   */
  private selectBottomRowAliens(count: number): Alien[] {
    // TODO: Random selection without duplicates
    // const available = this.getBottomRowAliens();
    // const selected: Alien[] = [];
    // for (let i = 0; i < Math.min(count, available.length); i++) {
    //   const randomIndex = Phaser.Math.Between(0, available.length - 1);
    //   selected.push(available.splice(randomIndex, 1)[0]);
    // }
    // return selected;

    return [];
  }

  /**
   * Transition alien from ATTACKING to RETURNING
   */
  private startReturnToFormation(alien: Alien): void {
    // TODO: Change state
    // alien.setState(AlienState.RETURNING);
    // console.log('[WaveManager] Alien starting return to formation');
  }

  /**
   * Update alien returning to formation
   */
  private updateReturnToFormation(alien: Alien, delta: number): void {
    // TODO: Navigate back to formation position
    // const target = alien.getFormationPosition();
    // const speed = GALAGA_RETURN_SPEED * (delta / 1000);

    // const dx = target.x - alien.x;
    // const dy = target.y - alien.y;
    // const distance = Math.sqrt(dx * dx + dy * dy);

    // if (distance < 5) {
    //   // Arrived - snap to exact position
    //   alien.setPosition(target.x, target.y);
    //   alien.setState(AlienState.IN_FORMATION);
    //   console.log('[WaveManager] Alien returned to formation');
    // } else {
    //   // Move toward formation
    //   const nx = dx / distance; // Normalize
    //   const ny = dy / distance;
    //   alien.move(nx * speed, ny * speed);
    // }
  }

  /**
   * Remove waves where all aliens returned or destroyed
   */
  private cleanupCompletedWaves(): void {
    // TODO: Filter out completed waves
    // this.activeWaves = this.activeWaves.filter(wave => {
    //   const hasActive = wave.aliens.some(alien =>
    //     alien.isAlive() &&
    //     (alien.getState() === AlienState.ATTACKING ||
    //      alien.getState() === AlienState.RETURNING)
    //   );
    //   return hasActive;
    // });
  }

  /**
   * Get count of active waves
   */
  getActiveWaveCount(): number {
    return this.activeWaves.length;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.activeWaves = [];
  }
}
