import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorage } from '../../../src/utils/localStorage';
import {
  MAX_STORED_FACES,
  DEFAULT_CONTROLLER_FIRE_BUTTON,
  DEFAULT_CONTROLLER_BACK_BUTTON,
  DEFAULT_CONTROLLER_START_BUTTON
} from '../../../src/constants';

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
        controllerFireButton: DEFAULT_CONTROLLER_FIRE_BUTTON,
        controllerBackButton: DEFAULT_CONTROLLER_BACK_BUTTON,
        controllerStartButton: DEFAULT_CONTROLLER_START_BUTTON
      });
    });

    it('should use constants for default button values', () => {
      const settings = LocalStorage.getSettings();
      expect(settings.controllerFireButton).toBe(DEFAULT_CONTROLLER_FIRE_BUTTON);
      expect(settings.controllerBackButton).toBe(DEFAULT_CONTROLLER_BACK_BUTTON);
      expect(settings.controllerStartButton).toBe(DEFAULT_CONTROLLER_START_BUTTON);
    });

    it('should ensure default values are correct', () => {
      expect(DEFAULT_CONTROLLER_FIRE_BUTTON).toBe(0);
      expect(DEFAULT_CONTROLLER_BACK_BUTTON).toBe(1);
      expect(DEFAULT_CONTROLLER_START_BUTTON).toBe(11);
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

    it('should merge saved settings with defaults', () => {
      // Save partial settings (missing button configs)
      const partialSettings = {
        muted: true,
        difficulty: 'easy' as const
      };
      localStorage.setItem('classinvaders_settings', JSON.stringify(partialSettings));

      const settings = LocalStorage.getSettings();
      // Should have saved values
      expect(settings.muted).toBe(true);
      expect(settings.difficulty).toBe('easy');
      // Should have default button values
      expect(settings.controllerFireButton).toBe(DEFAULT_CONTROLLER_FIRE_BUTTON);
      expect(settings.controllerBackButton).toBe(DEFAULT_CONTROLLER_BACK_BUTTON);
      expect(settings.controllerStartButton).toBe(DEFAULT_CONTROLLER_START_BUTTON);
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

  describe('Storage Quota Errors', () => {
    it('should handle QuotaExceededError when setting current face', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create an error with QuotaExceededError name
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      // Mock setItem to throw on CURRENT_FACE key (both initial and retry)
      const setItemMock = vi.fn((key: string, value: string) => {
        if (key === 'classinvaders_current_face') {
          throw quotaError;
        }
      });

      const removeItemMock = vi.fn();

      // Replace localStorage methods
      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      localStorage.setItem = setItemMock;
      localStorage.removeItem = removeItemMock;

      const largeImageData = 'data:image/png;base64,' + 'x'.repeat(10000);

      // Should not throw
      expect(() => LocalStorage.setCurrentFace(largeImageData)).not.toThrow();

      // setItem should have been called with the current face key (initial + retry = 2 times)
      expect(setItemMock).toHaveBeenCalledWith('classinvaders_current_face', largeImageData);
      expect(setItemMock).toHaveBeenCalledTimes(2);

      // Error should have been logged (initial quota error + retry failure)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Storage quota exceeded. Clearing old faces and retrying...');

      // clearFaces should have been called (removeItem for both keys)
      expect(removeItemMock).toHaveBeenCalledWith('classinvaders_current_face');
      expect(removeItemMock).toHaveBeenCalledWith('classinvaders_face_history');

      // Restore
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
      consoleErrorSpy.mockRestore();
    });

    it('should handle QuotaExceededError when adding to face history', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      // Let first face succeed, then fail on second
      let callCount = 0;
      const setItemMock = vi.fn((key: string, value: string) => {
        callCount++;
        if (callCount > 1 && key === 'classinvaders_face_history') {
          throw quotaError;
        }
        // Actually store the first one
        if (key === 'classinvaders_face_history' && callCount === 1) {
          localStorage['classinvaders_face_history'] = value;
        }
      });

      const removeItemMock = vi.fn((key: string) => {
        delete localStorage[key];
      });

      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      localStorage.setItem = setItemMock;
      localStorage.removeItem = removeItemMock;

      const face1 = 'data:image/png;base64,face1';
      const face2 = 'data:image/png;base64,' + 'x'.repeat(10000);

      // First should succeed
      expect(() => LocalStorage.addToFaceHistory(face1)).not.toThrow();

      // Second should not throw - it will clear faces due to quota error
      expect(() => LocalStorage.addToFaceHistory(face2)).not.toThrow();

      // Error should have been logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should retry saving current face after clearing quota', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      // Mock to fail first setItem for current_face, then succeed on retry
      let setItemCallCount = 0;
      const originalSetItem = localStorage.setItem.bind(localStorage);
      const setItemMock = vi.fn((key: string, value: string) => {
        if (key === 'classinvaders_current_face') {
          setItemCallCount++;
          if (setItemCallCount === 1) {
            // First attempt fails with quota
            throw quotaError;
          }
          // Second attempt (after clear) succeeds
          originalSetItem(key, value);
        } else {
          originalSetItem(key, value);
        }
      });

      localStorage.setItem = setItemMock;

      const newFace = 'data:image/png;base64,newface';

      // Should not throw and should save the new face after clearing
      expect(() => LocalStorage.setCurrentFace(newFace)).not.toThrow();

      // The new face should be saved (after retry)
      expect(LocalStorage.getCurrentFace()).toBe(newFace);

      // setItem should have been called twice (fail, then succeed)
      expect(setItemCallCount).toBe(2);

      // Restore
      localStorage.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });
  });
});
