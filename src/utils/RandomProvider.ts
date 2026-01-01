import Phaser from 'phaser';

export interface IRandomProvider {
  between(min: number, max: number): number;
  floatBetween(min: number, max: number): number;
  random(): number;
  pick<T>(array: T[]): T;
  shuffle<T>(array: T[]): T[];
}

export class PhaserRandomProvider implements IRandomProvider {
  between(min: number, max: number): number {
    return Phaser.Math.Between(min, max);
  }
  
  floatBetween(min: number, max: number): number {
    return Phaser.Math.FloatBetween(min, max);
  }
  
  random(): number {
    return Math.random();
  }
  
  pick<T>(array: T[]): T {
    return Phaser.Utils.Array.GetRandom(array);
  }

  shuffle<T>(array: T[]): T[] {
    return Phaser.Utils.Array.Shuffle(array);
  }
}

export class SeededRandomProvider implements IRandomProvider {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  // Simple LCG (Linear Congruential Generator) for deterministic tests
  private next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  between(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  floatBetween(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  random(): number {
    return this.next();
  }

  pick<T>(array: T[]): T {
    if (!array || array.length === 0) return undefined as any;
    const index = Math.floor(this.next() * array.length);
    return array[index];
  }

  shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}

// Singleton instance for global access if needed, though dependency injection is preferred
export const Random = new PhaserRandomProvider();
