import { LevelConfig } from '../types';
import { ALIEN_ROWS, ALIEN_COLS, ALIEN_START_SPEED } from '../constants';

/**
 * Level Manager
 *
 * Manages game difficulty progression across levels.
 * Each level increases difficulty by:
 * - Adding more alien rows (every 3 levels, max 8)
 * - Increasing alien speed
 * - Increasing bomb drop frequency
 * - Multiplying points earned
 *
 * Create one instance per game session.
 */

export class LevelManager {
  private currentLevel: number = 1;

  constructor(startLevel: number = 1) {
    this.currentLevel = startLevel;
  }

  /**
   * Get the current level number
   * @returns Current level (1-based)
   */
  getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Advance to the next level
   * Call this when all aliens are destroyed
   *
   * TODO: Increment this.currentLevel
   */
  nextLevel(): void {
    this.currentLevel++;
  }

  /**
   * Reset level to 1
   * Call this when starting a new game
   */
  reset(): void {
    this.currentLevel = 1;
  }

  /**
   * Get configuration for the current level
   * @returns LevelConfig object with difficulty settings
   *
   * TODO: Implement level scaling formula:
   * - alienRows: Start with ALIEN_ROWS, add 1 every 3 levels (max 8)
   *   Example: Math.min(ALIEN_ROWS + Math.floor((level - 1) / 3), 8)
   * - alienCols: Always ALIEN_COLS (11)
   * - alienSpeed: Start with ALIEN_START_SPEED, decrease by 50ms per level (min 300ms)
   *   Example: Math.max(ALIEN_START_SPEED - (level - 1) * 50, 300)
   * - bombFrequency: Start at 0.3, increase by 0.1 per level
   *   Example: 0.3 + (level - 1) * 0.1
   * - alienPointsMultiplier: Start at 1, increase by 0.5 per level
   *   Example: 1 + (level - 1) * 0.5
   *
   * Return LevelConfig object with these calculated values
   */
  getLevelConfig(): LevelConfig {
    const level = this.currentLevel;

    return {
      level,
      alienRows: Math.min(ALIEN_ROWS + Math.floor((level - 1) / 3), 8),
      alienCols: ALIEN_COLS,
      alienSpeed: Math.max(ALIEN_START_SPEED - (level - 1) * 50, 300),
      bombFrequency: 0.3 + (level - 1) * 0.1,
      alienPointsMultiplier: 1 + (level - 1) * 0.5
    };
  }

  /**
   * Calculate alien speed for current level
   * @returns Movement interval in milliseconds
   *
   * Formula: Start at 1000ms, decrease by 50ms per level, minimum 300ms
   */
  getAlienSpeed(): number {
    const config = this.getLevelConfig();
    return config.alienSpeed;
  }

  /**
   * Calculate number of alien rows for current level
   * @returns Number of rows (5-8)
   *
   * Formula: Start at 5, add 1 every 3 levels, max 8
   */
  getAlienRows(): number {
    const config = this.getLevelConfig();
    return config.alienRows;
  }

  /**
   * Calculate bomb drop frequency for current level
   * @returns Bombs per second
   *
   * Formula: Start at 0.3, increase by 0.1 per level
   */
  getBombFrequency(): number {
    const config = this.getLevelConfig();
    return config.bombFrequency;
  }

  /**
   * Get points multiplier for current level
   * @returns Multiplier value
   *
   * Formula: Start at 1.0, increase by 0.5 per level
   */
  getPointsMultiplier(): number {
    const config = this.getLevelConfig();
    return config.alienPointsMultiplier;
  }
}
