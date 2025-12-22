import { StoredFace, HighScore, GameSettings } from '../types';

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
    localStorage.setItem(KEYS.CURRENT_FACE, imageData);
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
   * Maintains a maximum of 10 faces (FIFO queue)
   * @param imageData - Base64 encoded image string
   *
   * TODO:
   * 1. Get current history using getFaceHistory()
   * 2. Create new StoredFace object with id, imageData, timestamp
   * 3. Add to history array
   * 4. If length > 10, remove oldest (shift)
   * 5. Save back to localStorage as JSON string
   */
  static addToFaceHistory(imageData: string): void {
    const history = this.getFaceHistory();
    const newFace: StoredFace = {
      id: Date.now().toString(),
      imageData,
      timestamp: Date.now()
    };
    history.push(newFace);
    if (history.length > 10) history.shift();
    localStorage.setItem(KEYS.FACE_HISTORY, JSON.stringify(history));
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
    localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(topScores));
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
      if (!data) return { muted: false, difficulty: 'normal' };
      const parsed = JSON.parse(data);
      return { muted: false, difficulty: 'normal', ...parsed };
    } catch (error) {
      console.error('Error parsing settings:', error);
      return { muted: false, difficulty: 'normal' };
    }
  }

  /**
   * Save game settings
   * @param settings - GameSettings object to save
   *
   * TODO: Save settings as JSON string to localStorage
   */
  static saveSettings(settings: GameSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
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
}
