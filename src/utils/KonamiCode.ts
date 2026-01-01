/**
 * KonamiCode - Easter egg input tracker
 *
 * Tracks the classic Konami Code sequence: ↑ ↑ ↓ ↓ ← → ← → B A
 * Supports both keyboard and gamepad inputs
 * Auto-resets if inputs timeout
 */

export type KonamiInput =
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'B'
  | 'A';

export class KonamiCode {
  private static readonly SEQUENCE: KonamiInput[] = [
    'UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A'
  ];

  private currentSequence: KonamiInput[] = [];
  private completed: boolean = false;
  private onCompleteCallback?: () => void;
  private lastInputTime: number = 0;
  private inputTimeout: number; // milliseconds

  /**
   * Create a new KonamiCode tracker
   * @param inputTimeout - Time in milliseconds before sequence resets (default: 1000ms)
   */
  constructor(inputTimeout: number = 1000) {
    this.inputTimeout = inputTimeout;
  }

  /**
   * Add an input to the sequence tracker
   * @param input - The input that was pressed
   * @param currentTime - Current timestamp in milliseconds (optional, defaults to Date.now())
   * @returns true if the code was just completed, false otherwise
   */
  addInput(input: KonamiInput, currentTime: number = Date.now()): boolean {
    // If already completed, don't track further inputs
    if (this.completed) {
      return false;
    }

    // Check if the sequence has timed out
    if (this.currentSequence.length > 0 && currentTime - this.lastInputTime > this.inputTimeout) {
      this.currentSequence = [];
    }

    this.lastInputTime = currentTime;
    this.currentSequence.push(input);

    // Check if the current sequence matches the expected sequence so far
    const expectedSequence = KonamiCode.SEQUENCE.slice(0, this.currentSequence.length);
    const matches = this.currentSequence.every((input, index) => input === expectedSequence[index]);

    if (!matches) {
      // Wrong input, reset the sequence
      this.currentSequence = [];
      this.lastInputTime = 0;
      return false;
    }

    // Check if the full code is complete
    if (this.currentSequence.length === KonamiCode.SEQUENCE.length) {
      this.completed = true;
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
      return true;
    }

    return false;
  }

  /**
   * Reset the code tracker
   */
  reset(): void {
    this.currentSequence = [];
    this.completed = false;
    this.lastInputTime = 0;
  }

  /**
   * Check if the sequence has timed out and reset if needed
   * @param currentTime - Current timestamp in milliseconds
   * @returns true if the sequence was reset due to timeout
   */
  checkTimeout(currentTime: number = Date.now()): boolean {
    if (this.currentSequence.length > 0 &&
        !this.completed &&
        currentTime - this.lastInputTime > this.inputTimeout) {
      this.currentSequence = [];
      this.lastInputTime = 0;
      return true;
    }
    return false;
  }

  /**
   * Check if the code has been completed
   */
  isCompleted(): boolean {
    return this.completed;
  }

  /**
   * Get the current progress (number of correct inputs)
   */
  getProgress(): number {
    return this.currentSequence.length;
  }

  /**
   * Set a callback to be called when the code is completed
   */
  onComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  /**
   * Get the expected sequence (useful for debugging)
   */
  static getSequence(): readonly KonamiInput[] {
    return KonamiCode.SEQUENCE;
  }
}
