import { LevelConfig } from '../types';
import { ALIEN_ROWS, ALIEN_COLS, ALIEN_START_SPEED, GALAGA_FORMATION_SPEED } from '../constants';
import { DifficultyPreset } from '../types/DifficultyPreset';
import { DIFFICULTY_CONFIGS } from '../types/DifficultyConfig';

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
  private difficulty: DifficultyPreset;
  private config = DIFFICULTY_CONFIGS;

  constructor(startLevel: number = 1, difficulty: DifficultyPreset = DifficultyPreset.MEDIUM) {
    this.currentLevel = startLevel;
    this.difficulty = difficulty;
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
   * Level scaling formula with difficulty multipliers applied:
   * - alienRows: Start with ALIEN_ROWS, add 1 every 3 levels (max 8), apply rowCountMultiplier
   * - alienCols: Always ALIEN_COLS (11)
   * - alienSpeed: Start with ALIEN_START_SPEED, decrease by level scaling, apply speedMultiplier
   * - bombFrequency: Start at 0.3, increase by level scaling, apply bombFrequencyMultiplier
   * - alienPointsMultiplier: Start at 1, increase by level scaling, apply pointsMultiplier
   */
  getLevelConfig(): LevelConfig {
    const level = this.currentLevel;
    const multipliers = this.config[this.difficulty];
    
    // Base calculations without difficulty
    const baseRows = Math.min(ALIEN_ROWS + Math.floor((level - 1) / 3), 8);
    const baseSpeed = Math.max(ALIEN_START_SPEED - (level - 1) * 50, 300);
    const baseBombFreq = 0.3 + (level - 1) * 0.1;
    const basePointsMultiplier = 1 + (level - 1) * 0.5;
    
    // Apply difficulty multipliers
    const adjustedSpeed = baseSpeed / multipliers.speedMultiplier;
    const adjustedBombFreq = baseBombFreq * multipliers.bombFrequencyMultiplier;
    const adjustedPoints = basePointsMultiplier * multipliers.pointsMultiplier;
    let adjustedRows = Math.floor(baseRows * multipliers.rowCountMultiplier);

    // Apply minimum row count from difficulty config
    adjustedRows = Math.max(adjustedRows, multipliers.minRows);
    
    // Galaga-specific calculations with difficulty
    const baseFormationSpeed = Math.min(GALAGA_FORMATION_SPEED + (level - 1) * 10, 150);
    const baseWaveFreq = Math.min(0.3 + (level - 1) * 0.05, 0.8);
    const baseWaveMinSize = 3;
    const baseWaveMaxSize = 8;
    
    const adjustedFormationSpeed = baseFormationSpeed / multipliers.speedMultiplier;
    const adjustedWaveFreq = 1 / ((1 / baseWaveFreq) * multipliers.waveIntervalMultiplier);
    const adjustedWaveMinSize = Math.floor(baseWaveMinSize * multipliers.waveSizeMultiplier);
    const adjustedWaveMaxSize = Math.floor(baseWaveMaxSize * multipliers.waveSizeMultiplier);

    return {
      level,
      alienRows: adjustedRows,
      alienCols: ALIEN_COLS,
      alienSpeed: adjustedSpeed,
      bombFrequency: adjustedBombFreq,
      alienPointsMultiplier: adjustedPoints,

      // Galaga Mode parameters with difficulty scaling
      galagaFormationSpeed: adjustedFormationSpeed,
      galagaWaveFrequency: adjustedWaveFreq,
      galagaHomingStrength: Math.min((level - 1) * 0.05, 0.35),
      galagaWaveMinSize: adjustedWaveMinSize,
      galagaWaveMaxSize: adjustedWaveMaxSize,
      galagaMaxSimultaneousWaves: multipliers.maxSimultaneousWaves
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

  /**
   * Get the current difficulty preset
   * @returns Current DifficultyPreset
   */
  getDifficulty(): DifficultyPreset {
    return this.difficulty;
  }

  /**
   * Set a new difficulty preset
   * @param difficulty The new difficulty preset
   */
  setDifficulty(difficulty: DifficultyPreset): void {
    this.difficulty = difficulty;
  }
}
