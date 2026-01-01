import { describe, it, expect, beforeEach } from 'vitest';
import { LevelManager } from '../../../src/managers/LevelManager';
import { DifficultyPreset } from '../../../src/types/DifficultyPreset';
import { ALIEN_ROWS, ALIEN_COLS, ALIEN_START_SPEED, GALAGA_FORMATION_SPEED } from '../../../src/constants';

describe('LevelManager', () => {
  let levelManager: LevelManager;

  beforeEach(() => {
    levelManager = new LevelManager();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(levelManager.getCurrentLevel()).toBe(1);
      expect(levelManager.getDifficulty()).toBe(DifficultyPreset.MEDIUM);
    });

    it('should initialize with custom values', () => {
      levelManager = new LevelManager(5, DifficultyPreset.HARD);
      expect(levelManager.getCurrentLevel()).toBe(5);
      expect(levelManager.getDifficulty()).toBe(DifficultyPreset.HARD);
    });
  });

  describe('Progression', () => {
    it('should advance level', () => {
      levelManager.nextLevel();
      expect(levelManager.getCurrentLevel()).toBe(2);
    });

    it('should reset level', () => {
      levelManager.nextLevel();
      levelManager.reset();
      expect(levelManager.getCurrentLevel()).toBe(1);
    });
  });

  describe('Configuration Scaling', () => {
    it('should calculate base configuration correctly for level 1 (Medium)', () => {
      const config = levelManager.getLevelConfig();
      
      expect(config.level).toBe(1);
      expect(config.alienRows).toBe(ALIEN_ROWS); // 5
      expect(config.alienCols).toBe(ALIEN_COLS); // 11
      expect(config.alienSpeed).toBe(ALIEN_START_SPEED); // 1000
      expect(config.bombFrequency).toBeCloseTo(0.3);
      expect(config.alienPointsMultiplier).toBe(1);
    });

    it('should scale difficulty with levels', () => {
      // Advance to level 4 (should add 1 row: 5 + floor((4-1)/3) = 6)
      levelManager = new LevelManager(4, DifficultyPreset.MEDIUM);
      const config = levelManager.getLevelConfig();
      
      expect(config.alienRows).toBe(ALIEN_ROWS + 1);
      expect(config.alienSpeed).toBeLessThan(ALIEN_START_SPEED);
      expect(config.bombFrequency).toBeGreaterThan(0.3);
      expect(config.alienPointsMultiplier).toBeGreaterThan(1);
    });

    it('should apply difficulty presets', () => {
      // HARD mode
      levelManager.setDifficulty(DifficultyPreset.HARD);
      const hardConfig = levelManager.getLevelConfig();
      
      // EASY mode
      levelManager.setDifficulty(DifficultyPreset.EASY);
      const easyConfig = levelManager.getLevelConfig();
      
      // Hard should be faster and have more bombs than Easy
      expect(hardConfig.alienSpeed).toBeLessThan(easyConfig.alienSpeed); // Lower interval = faster
      expect(hardConfig.bombFrequency).toBeGreaterThan(easyConfig.bombFrequency);
      expect(hardConfig.alienPointsMultiplier).toBeGreaterThan(easyConfig.alienPointsMultiplier);
    });

    it('should cap maximum values', () => {
      // Level 100
      levelManager = new LevelManager(100, DifficultyPreset.MEDIUM);
      const config = levelManager.getLevelConfig();
      
      expect(config.alienRows).toBeLessThanOrEqual(8); // Max rows cap
      expect(config.alienSpeed).toBeGreaterThanOrEqual(300); // Min speed cap (300ms)
    });
  });

  describe('Getters', () => {
    it('should return individual config values', () => {
      expect(levelManager.getAlienSpeed()).toBe(ALIEN_START_SPEED);
      expect(levelManager.getAlienRows()).toBe(ALIEN_ROWS);
      expect(levelManager.getBombFrequency()).toBeCloseTo(0.3);
      expect(levelManager.getPointsMultiplier()).toBe(1);
    });
  });
});
