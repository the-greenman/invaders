import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreManager } from '../../../src/managers/ScoreManager';
import { LocalStorage } from '../../../src/utils/localStorage';

// Mock LocalStorage calls
vi.mock('../../../src/utils/localStorage', () => ({
  LocalStorage: {
    isHighScore: vi.fn(),
    addHighScore: vi.fn(),
    getHighScores: vi.fn(),
    getFaceHistory: vi.fn().mockReturnValue([]),
    getCurrentFace: vi.fn().mockReturnValue(null)
  }
}));

describe('ScoreManager', () => {
  let scoreManager: ScoreManager;

  beforeEach(() => {
    scoreManager = new ScoreManager();
    vi.clearAllMocks();
  });

  it('should initialize with 0 score', () => {
    expect(scoreManager.getScore()).toBe(0);
  });

  it('should add points correctly', () => {
    scoreManager.addPoints(100);
    expect(scoreManager.getScore()).toBe(100);
    scoreManager.addPoints(50);
    expect(scoreManager.getScore()).toBe(150);
  });

  it('should reset score', () => {
    scoreManager.addPoints(100);
    scoreManager.reset();
    expect(scoreManager.getScore()).toBe(0);
  });

  it('should check for high score via LocalStorage', () => {
    vi.mocked(LocalStorage.isHighScore).mockReturnValue(true);
    scoreManager.addPoints(1000);
    
    expect(scoreManager.isHighScore()).toBe(true);
    expect(LocalStorage.isHighScore).toHaveBeenCalledWith(1000);
  });

  it('should save high score via LocalStorage', () => {
    const now = 1234567890;
    vi.setSystemTime(now);
    
    scoreManager.addPoints(500);
    scoreManager.saveHighScore('Player1', 5);

    expect(LocalStorage.addHighScore).toHaveBeenCalledWith({
      name: 'Player1',
      score: 500,
      level: 5,
      date: now,
      faceImage: undefined
    });
  });

  it('should retrieve high scores from LocalStorage', () => {
    const mockScores = [{ name: 'P1', score: 100, level: 1, date: 0 }];
    vi.mocked(LocalStorage.getHighScores).mockReturnValue(mockScores);

    expect(scoreManager.getHighScores()).toBe(mockScores);
    expect(LocalStorage.getHighScores).toHaveBeenCalled();
  });

  it('should format score with leading zeros', () => {
    expect(ScoreManager.formatScore(0)).toBe('000000');
    expect(ScoreManager.formatScore(10)).toBe('000010');
    expect(ScoreManager.formatScore(123456)).toBe('123456');
    expect(ScoreManager.formatScore(99, 3)).toBe('099');
  });
});
