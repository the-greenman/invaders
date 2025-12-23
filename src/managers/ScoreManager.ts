import { LocalStorage } from '../utils/localStorage';
import { FaceManager } from './FaceManager';
import { HighScore } from '../types';

/**
 * Score Manager
 *
 * Manages the player's score during gameplay and high score persistence.
 * Create one instance per game session.
 *
 * Responsibilities:
 * - Track current score
 * - Add points for destroying aliens
 * - Check if score qualifies as high score
 * - Save high scores to localStorage
 * - Retrieve high score list
 */

export class ScoreManager {
  private currentScore: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Add points to the current score
   * @param points - Number of points to add
   *
   * TODO: Increment this.currentScore by points value
   */
  addPoints(points: number): void {
    this.currentScore += points;
  }

  /**
   * Get the current score
   * @returns Current score value
   */
  getScore(): number {
    return this.currentScore;
  }

  /**
   * Reset score to zero
   * Call this when starting a new game
   */
  reset(): void {
    this.currentScore = 0;
  }

  /**
   * Check if current score qualifies as a high score
   * @returns true if score is in top 10 or list has < 10 entries
   *
   * TODO: Use LocalStorage.isHighScore(this.currentScore)
   */
  isHighScore(): boolean {
    return LocalStorage.isHighScore(this.currentScore);
  }

  /**
   * Save current score as a high score
   * @param name - Player's name for the high score entry
   * @param level - Level reached when game ended
   *
   * TODO:
   * 1. Create HighScore object with name, score, level, date
   * 2. Use LocalStorage.addHighScore() to save it
   */
  saveHighScore(name: string, level: number): void {
    const history = LocalStorage.getFaceHistory();
    const currentFace = FaceManager.getCurrentFace() || LocalStorage.getCurrentFace() || null;
    const fallbackFace = history.length > 0 ? history[history.length - 1].imageData : undefined;
    const highScore: HighScore = {
      name,
      score: this.currentScore,
      level,
      date: Date.now(),
      faceImage: currentFace || fallbackFace || undefined
    };
    LocalStorage.addHighScore(highScore);
  }

  /**
   * Get all high scores
   * @returns Array of HighScore objects, sorted by score descending
   *
   * TODO: Return LocalStorage.getHighScores()
   */
  getHighScores(): HighScore[] {
    return LocalStorage.getHighScores();
  }

  /**
   * Format score with leading zeros for display
   * @param score - Score value to format
   * @param length - Total length of formatted string (default 6)
   * @returns Formatted score string (e.g., "000420")
   *
   * Example: formatScore(420) => "000420"
   */
  static formatScore(score: number, length: number = 6): string {
    return score.toString().padStart(length, '0');
  }
}
