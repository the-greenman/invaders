import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorage } from '../../../src/utils/localStorage';
import { MAX_STORED_FACES } from '../../../src/constants';

describe('LocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Current Face', () => {
    it('should set and get current face', () => {
      const faceData = 'data:image/png;base64,fakeface';
      LocalStorage.setCurrentFace(faceData);
      expect(LocalStorage.getCurrentFace()).toBe(faceData);
    });

    it('should remove current face', () => {
      LocalStorage.setCurrentFace('data:image/png;base64,face');
      LocalStorage.removeCurrentFace();
      expect(LocalStorage.getCurrentFace()).toBeNull();
    });
  });

  describe('Face History', () => {
    it('should add to face history', () => {
      const face1 = 'data:image/png;base64,face1';
      LocalStorage.addToFaceHistory(face1);
      const history = LocalStorage.getFaceHistory();
      expect(history).toHaveLength(1);
      expect(history[0].imageData).toBe(face1);
    });

    it('should respect MAX_STORED_FACES limit (FIFO)', () => {
      // Add more than max faces
      const limit = Number(MAX_STORED_FACES) || 20; // Default to 20 if constant not loaded correctly in test context
      
      for (let i = 0; i < limit + 5; i++) {
        LocalStorage.addToFaceHistory(`face${i}`);
      }

      const history = LocalStorage.getFaceHistory();
      expect(history).toHaveLength(limit);
      // Should have dropped the first 5 (face0..face4), so first one should be face5
      expect(history[0].imageData).toBe('face5');
      expect(history[history.length - 1].imageData).toBe(`face${limit + 4}`);
    });

    it('should handle corrupted history data', () => {
      localStorage.setItem('classinvaders_face_history', '{invalid-json}');
      const history = LocalStorage.getFaceHistory();
      expect(history).toEqual([]);
    });
  });

  describe('High Scores', () => {
    it('should add and retrieve high scores sorted descending', () => {
      const score1 = { name: 'Player1', score: 100, level: 1, date: Date.now() };
      const score2 = { name: 'Player2', score: 200, level: 2, date: Date.now() };
      
      LocalStorage.addHighScore(score1);
      LocalStorage.addHighScore(score2);
      
      const scores = LocalStorage.getHighScores();
      expect(scores).toHaveLength(2);
      expect(scores[0].score).toBe(200);
      expect(scores[1].score).toBe(100);
    });

    it('should keep only top 10 scores', () => {
      for (let i = 1; i <= 15; i++) {
        LocalStorage.addHighScore({ 
          name: `P${i}`, 
          score: i * 100, 
          level: 1, 
          date: Date.now() 
        });
      }

      const scores = LocalStorage.getHighScores();
      expect(scores).toHaveLength(10);
      expect(scores[0].score).toBe(1500); // Highest score
      expect(scores[9].score).toBe(600);  // 10th highest score
    });

    it('should correctly identify qualifying high scores', () => {
      // Fill with 10 scores: 100...1000
      for (let i = 1; i <= 10; i++) {
        LocalStorage.addHighScore({ 
          name: `P${i}`, 
          score: i * 100, 
          level: 1, 
          date: Date.now() 
        });
      }

      // 50 is lower than lowest (100) -> false
      expect(LocalStorage.isHighScore(50)).toBe(false);
      // 150 is higher than lowest (100) -> true
      expect(LocalStorage.isHighScore(150)).toBe(true);
    });

    it('should return empty array for missing scores', () => {
      expect(LocalStorage.getHighScores()).toEqual([]);
    });
  });

  describe('Settings', () => {
    it('should return default settings if none saved', () => {
      const settings = LocalStorage.getSettings();
      expect(settings).toEqual({
        muted: false,
        difficulty: 'normal',
        controllerFireButton: 0,
        controllerBackButton: 1,
        controllerStartButton: 11
      });
    });

    it('should save and retrieve settings', () => {
      const newSettings = {
        muted: true,
        difficulty: 'hard' as const,
        controllerFireButton: 1,
        controllerBackButton: 2,
        controllerStartButton: 9
      };
      LocalStorage.saveSettings(newSettings);
      expect(LocalStorage.getSettings()).toEqual(newSettings);
    });
  });

  describe('Clear', () => {
    it('should clear all data', () => {
      LocalStorage.setCurrentFace('face');
      LocalStorage.addHighScore({ name: 'P', score: 100, level: 1, date: 0 });
      
      LocalStorage.clearAll();
      
      expect(LocalStorage.getCurrentFace()).toBeNull();
      expect(LocalStorage.getHighScores()).toEqual([]);
    });
  });
});
