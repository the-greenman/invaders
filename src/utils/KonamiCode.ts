/**
 * KonamiCode - Easter egg input tracker
 *
 * Tracks the classic Konami Code sequence: ↑ ↑ ↓ ↓ ← → ← → B A
 * Supports both keyboard and gamepad inputs
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

  /**
   * Add an input to the sequence tracker
   * @param input - The input that was pressed
   * @returns true if the code was just completed, false otherwise
   */
  addInput(input: KonamiInput): boolean {
    // If already completed, don't track further inputs
    if (this.completed) {
      return false;
    }

    this.currentSequence.push(input);

    // Check if the current sequence matches the expected sequence so far
    const expectedSequence = KonamiCode.SEQUENCE.slice(0, this.currentSequence.length);
    const matches = this.currentSequence.every((input, index) => input === expectedSequence[index]);

    if (!matches) {
      // Wrong input, reset the sequence
      this.currentSequence = [];
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
