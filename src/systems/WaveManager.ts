import Phaser from 'phaser';
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
    // Update all active waves
    for (const wave of this.activeWaves) {
      for (const alien of wave.aliens) {
        const state = alien.getState();
        if (state === AlienState.ATTACKING) {
          alien.followPath(delta);
          if (alien.getAttackPath()?.isComplete()) {
            this.startReturnToFormation(alien);
          }
        } else if (state === AlienState.RETURNING) {
          this.updateReturnToFormation(alien, delta);
        }
      }
    }

    // Launch new wave if ready
    if (this.shouldLaunchWave()) {
      this.launchWave();
    }

    // Clean up completed waves
    this.cleanupCompletedWaves();
  }

  /**
   * Check if we should launch a new wave
   */
  private shouldLaunchWave(): boolean {
    // Check conditions:
    // 1. Not too many active waves (< GALAGA_MAX_SIMULTANEOUS_WAVES)
    // 2. Enough time since last wave
    // 3. Aliens available in bottom row

    const now = Date.now();
    const timeSinceLastWave = now - this.lastWaveTime;
    const interval = Phaser.Math.Between(
      GALAGA_WAVE_MIN_INTERVAL,
      GALAGA_WAVE_MAX_INTERVAL
    );

    return this.activeWaves.length < GALAGA_MAX_SIMULTANEOUS_WAVES &&
           timeSinceLastWave > interval &&
           this.getBottomRowAliens().length > 0;
  }

  /**
   * Launch a new attack wave
   */
  private launchWave(): void {
    // 1. Determine wave size (random between MIN/MAX)
    const waveSize = Phaser.Math.Between(
      GALAGA_WAVE_MIN_SIZE,
      GALAGA_WAVE_MAX_SIZE
    );

    // 2. Select aliens from bottom row
    const selectedAliens = this.selectBottomRowAliens(waveSize);
    if (selectedAliens.length === 0) {
      return;
    }

    // 3. For each alien, assign path and set state
    for (const alien of selectedAliens) {
      alien.setFormationPosition(alien.x, alien.y);
      const path = createRandomAttackPath();
      path.start(alien.x, alien.y);
      alien.setAttackPath(path);
      alien.setAlienState(AlienState.ATTACKING);
    }

    // 4. Track wave
    this.activeWaves.push({
      aliens: selectedAliens,
      launchTime: Date.now(),
      active: true
    });
    this.lastWaveTime = Date.now();
  }

  /**
   * Get aliens from bottom row available for waves
   */
  private getBottomRowAliens(): Alien[] {
    // Get all alive aliens in formation
    const alive = this.grid.getAliveAliens().filter(a => a.getState() === AlienState.IN_FORMATION);
    if (alive.length === 0) return [];

    // Determine the bottom-most occupied row index among alive in-formation aliens
    const maxRow = alive.reduce((acc, a) => {
      const r = a.getGridPosition().row;
      return r > acc ? r : acc;
    }, 0);

    // Return only aliens from that bottom row
    return alive.filter(a => a.getGridPosition().row === maxRow);
  }

  /**
   * Randomly select N aliens from bottom row
   */
  private selectBottomRowAliens(count: number): Alien[] {
    const available = this.getBottomRowAliens().slice();
    const selected: Alien[] = [];
    const n = Math.min(count, available.length);
    for (let i = 0; i < n; i++) {
      const randomIndex = Phaser.Math.Between(0, available.length - 1);
      selected.push(available.splice(randomIndex, 1)[0]);
    }
    return selected;
  }

  /**
   * Transition alien from ATTACKING to RETURNING
   */
  private startReturnToFormation(alien: Alien): void {
    // Change state to returning
    alien.setAlienState(AlienState.RETURNING);
  }

  /**
   * Update alien returning to formation
   */
  private updateReturnToFormation(alien: Alien, delta: number): void {
    // Navigate back to formation position
    const target = alien.getFormationPosition();
    const speed = GALAGA_RETURN_SPEED * (delta / 1000);

    const dx = target.x - alien.x;
    const dy = target.y - alien.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      // Arrived - snap to exact position
      alien.setPosition(target.x, target.y);
      alien.setAlienState(AlienState.IN_FORMATION);
    } else {
      // Move toward formation
      const nx = dx / distance; // Normalize
      const ny = dy / distance;
      alien.move(nx * speed, ny * speed);
    }
  }

  /**
   * Remove waves where all aliens returned or destroyed
   */
  private cleanupCompletedWaves(): void {
    // Filter out completed waves
    this.activeWaves = this.activeWaves.filter(wave => {
      const hasActive = wave.aliens.some(alien =>
        alien.isAlive() &&
        (alien.getState() === AlienState.ATTACKING ||
         alien.getState() === AlienState.RETURNING)
      );
      return hasActive;
    });
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
