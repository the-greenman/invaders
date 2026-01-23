import { StoredFace, HighScore, GameSettings } from '../types';
import {
  MAX_STORED_FACES,
  DEFAULT_CONTROLLER_FIRE_BUTTON,
  DEFAULT_CONTROLLER_BACK_BUTTON,
  DEFAULT_CONTROLLER_START_BUTTON
} from '../constants';

/**
 * localStorage Utility Module
 *
 * Handles all browser localStorage operations for the game including:
 * - Face image storage (current and history)
 * - High score management
 * - Game settings persistence
 *
 * Storage Schema:
 * - 'classinvaders_current_face': string (base64 image data)
 * - 'classinvaders_face_history': StoredFace[] (array of previous face captures)
 * - 'classinvaders_high_scores': HighScore[] (top 10 scores)
 * - 'classinvaders_settings': GameSettings (muted, difficulty)
 */

const KEYS = {
  CURRENT_FACE: 'classinvaders_current_face',
  FACE_HISTORY: 'classinvaders_face_history',
  HIGH_SCORES: 'classinvaders_high_scores',
  SETTINGS: 'classinvaders_settings'
};

// Maximum storage budget in bytes (aim for ~2MB to stay well under 5MB limit)
const MAX_STORAGE_BYTES = 2 * 1024 * 1024;

export class LocalStorage {
  /**
   * Get the current player's face image
   * @returns Base64 image data string or null if not set
   *
   * TODO: Implement localStorage.getItem for CURRENT_FACE key
   */
  static getCurrentFace(): string | null {
    return localStorage.getItem(KEYS.CURRENT_FACE);
  }

  /**
   * Save a new face image as the current player face
   * @param imageData - Base64 encoded image string
   *
   * TODO: Implement localStorage.setItem for CURRENT_FACE key
   */
  static setCurrentFace(imageData: string): void {
    try {
      localStorage.setItem(KEYS.CURRENT_FACE, imageData);
    } catch (error) {
      const isQuotaError = error instanceof Error &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      if (isQuotaError) {
        console.error('Storage quota exceeded. Clearing old faces and retrying...');
        // Clear old data to make room
        this.clearFaces();
        // Retry saving after clearing
        try {
          localStorage.setItem(KEYS.CURRENT_FACE, imageData);
        } catch (retryError) {
          console.error('Failed to save face even after clearing storage:', retryError);
        }
      } else {
        console.error('Error saving face:', error);
      }
    }
  }

  /**
   * Remove the current player's face
   */
  static removeCurrentFace(): void {
    localStorage.removeItem(KEYS.CURRENT_FACE);
  }

  /**
   * Get array of previously captured faces
   * @returns Array of StoredFace objects, or empty array if none exist
   *
   * TODO:
   * 1. Get data from localStorage using KEYS.FACE_HISTORY
   * 2. Parse JSON if exists, return empty array if not
   * 3. Handle JSON parse errors gracefully
   */
  static getFaceHistory(): StoredFace[] {
    try {
      const data = localStorage.getItem(KEYS.FACE_HISTORY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing face history:', error);
      return [];
    }
  }

  /**
   * Add a face image to the history
   * Maintains a maximum of MAX_STORED_FACES faces (FIFO queue)
   * Oldest faces are automatically removed when limit is reached
   * @param imageData - Base64 encoded image string
   */
  static addToFaceHistory(imageData: string): void {
    const history = this.getFaceHistory();
    const newFace: StoredFace = {
      id: Date.now().toString(),
      imageData,
      timestamp: Date.now()
    };
    history.push(newFace);

    // FIFO: Remove oldest faces if we exceed the limit
    while (history.length > MAX_STORED_FACES) {
      history.shift();
    }

    try {
      localStorage.setItem(KEYS.FACE_HISTORY, JSON.stringify(history));
    } catch (error) {
      const isQuotaError = error instanceof Error &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      if (isQuotaError) {
        console.error('Storage quota exceeded. Unable to save face history.');
        // Try to make room by removing more old faces
        while (history.length > 1) {
          history.shift();
          try {
            localStorage.setItem(KEYS.FACE_HISTORY, JSON.stringify(history));
            return; // Successfully saved with fewer faces
          } catch (retryError) {
            // Continue removing faces
          }
        }
        // If still failing, clear face history entirely
        console.warn('Clearing all face history due to storage quota');
        this.clearFaces();
      } else {
        console.error('Error saving face history:', error);
      }
    }
  }

  /**
   * Remove a face from history by id.
   */
  static removeFaceById(id: string): void {
    const history = this.getFaceHistory().filter(face => face.id !== id);
    try {
      localStorage.setItem(KEYS.FACE_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error removing face from history:', error);
    }
  }

  /**
   * Get all high scores, sorted by score descending
   * @returns Array of top 10 high scores
   *
   * TODO:
   * 1. Get data from localStorage using KEYS.HIGH_SCORES
   * 2. Parse JSON, return empty array if not exists
   * 3. Sort by score (descending)
   * 4. Return top 10 only
   */
  static getHighScores(): HighScore[] {
    try {
      const data = localStorage.getItem(KEYS.HIGH_SCORES);
      if (!data) return [];
      const parsed = JSON.parse(data);
      const scores = Array.isArray(parsed) ? parsed : [];
      return scores.sort((a, b) => b.score - a.score).slice(0, 10);
    } catch (error) {
      console.error('Error parsing high scores:', error);
      return [];
    }
  }

  /**
   * Add a new high score to the list
   * @param score - HighScore object to add
   *
   * TODO:
   * 1. Get current high scores
   * 2. Add new score to array
   * 3. Sort by score descending
   * 4. Keep only top 10
   * 5. Save to localStorage
   */
  static addHighScore(score: HighScore): void {
    const scores = this.getHighScores();
    scores.push(score);
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 10);
    
    try {
      localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(topScores));
    } catch (error) {
      const isQuotaError = error instanceof Error &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      if (isQuotaError) {
        console.warn('Storage quota exceeded when saving high score. Running garbage collection...');
        this.runGarbageCollection();
        // Retry without face image if still failing
        try {
          localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(topScores));
        } catch (retryError) {
          // Strip face images from older scores and retry
          const strippedScores = topScores.map((s, i) => 
            i >= 5 ? { ...s, faceImage: undefined } : s
          );
          try {
            localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(strippedScores));
          } catch (finalError) {
            console.error('Failed to save high score even after GC:', finalError);
          }
        }
      } else {
        console.error('Error saving high score:', error);
      }
    }
  }

  /**
   * Check if a score qualifies as a high score
   * @param score - Score value to check
   * @returns true if score is in top 10 or less than 10 scores exist
   *
   * TODO:
   * 1. Get current high scores
   * 2. If less than 10 scores exist, return true
   * 3. If score > lowest high score, return true
   * 4. Otherwise return false
   */
  static isHighScore(score: number): boolean {
    const scores = this.getHighScores();
    if (scores.length < 10) return true;
    const lowestScore = scores[scores.length - 1]?.score || 0;
    return score > lowestScore;
  }

  /**
   * Get game settings
   * @returns GameSettings object with defaults if not set
   *
   * TODO:
   * 1. Get data from localStorage using KEYS.SETTINGS
   * 2. Parse JSON if exists
   * 3. Return default settings if not exists: { muted: false, difficulty: 'normal' }
   */
  static getSettings(): GameSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      const defaults: GameSettings = {
        muted: false,
        difficulty: 'normal',
        controllerFireButton: DEFAULT_CONTROLLER_FIRE_BUTTON,
        controllerBackButton: DEFAULT_CONTROLLER_BACK_BUTTON,
        controllerStartButton: DEFAULT_CONTROLLER_START_BUTTON
      };
      if (!data) return defaults;
      const parsed = JSON.parse(data);
      return { ...defaults, ...parsed };
    } catch (error) {
      console.error('Error parsing settings:', error);
      return {
        muted: false,
        difficulty: 'normal',
        controllerFireButton: DEFAULT_CONTROLLER_FIRE_BUTTON,
        controllerBackButton: DEFAULT_CONTROLLER_BACK_BUTTON,
        controllerStartButton: DEFAULT_CONTROLLER_START_BUTTON
      };
    }
  }

  /**
   * Save game settings
   * @param settings - GameSettings object to save
   *
   * TODO: Save settings as JSON string to localStorage
   */
  static saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Clear all game data from localStorage
   * Useful for debugging or reset functionality
   *
   * TODO: Remove all items using Object.values(KEYS).forEach
   */
  static clearAll(): void {
    Object.values(KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Clear only face data (current + history)
   */
  static clearFaces(): void {
    localStorage.removeItem(KEYS.CURRENT_FACE);
    localStorage.removeItem(KEYS.FACE_HISTORY);
  }

  /**
   * Get estimated storage usage in bytes for our keys
   */
  static getStorageUsage(): { total: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let total = 0;
    
    for (const [name, key] of Object.entries(KEYS)) {
      const value = localStorage.getItem(key);
      const size = value ? new Blob([value]).size : 0;
      breakdown[name] = size;
      total += size;
    }
    
    return { total, breakdown };
  }

  /**
   * Run garbage collection to free up storage space
   * Priority: 
   * 1. Strip face images from older high scores (keep top 3)
   * 2. Reduce face history
   * 3. Clear old face history entries
   */
  static runGarbageCollection(): void {
    console.log('[LocalStorage] Running garbage collection...');
    const before = this.getStorageUsage();
    console.log('[LocalStorage] Before GC:', before);

    // Step 1: Strip face images from high scores beyond top 3
    const scores = this.getHighScores();
    let modified = false;
    const cleanedScores = scores.map((score, index) => {
      if (index >= 3 && score.faceImage) {
        modified = true;
        return { ...score, faceImage: undefined };
      }
      return score;
    });
    
    if (modified) {
      try {
        localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(cleanedScores));
        console.log('[LocalStorage] Stripped face images from older high scores');
      } catch (e) {
        console.warn('[LocalStorage] Failed to save cleaned scores');
      }
    }

    // Step 2: Reduce face history to half if over limit
    const history = this.getFaceHistory();
    if (history.length > MAX_STORED_FACES / 2) {
      const reducedHistory = history.slice(-Math.floor(MAX_STORED_FACES / 2));
      try {
        localStorage.setItem(KEYS.FACE_HISTORY, JSON.stringify(reducedHistory));
        console.log(`[LocalStorage] Reduced face history from ${history.length} to ${reducedHistory.length}`);
      } catch (e) {
        // If still failing, clear it entirely
        localStorage.removeItem(KEYS.FACE_HISTORY);
        console.log('[LocalStorage] Cleared face history entirely');
      }
    }

    const after = this.getStorageUsage();
    console.log('[LocalStorage] After GC:', after);
    console.log(`[LocalStorage] Freed ${before.total - after.total} bytes`);
  }

  /**
   * Check storage health and run GC if needed
   * Call this periodically (e.g., on game start)
   */
  static checkStorageHealth(): void {
    const { total } = this.getStorageUsage();
    if (total > MAX_STORAGE_BYTES) {
      console.warn(`[LocalStorage] Storage usage (${total} bytes) exceeds budget (${MAX_STORAGE_BYTES} bytes). Running GC...`);
      this.runGarbageCollection();
    }
  }
}
