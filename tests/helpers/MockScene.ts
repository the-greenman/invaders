import Phaser from 'phaser';

export class MockScene extends Phaser.Scene {
  constructor(key: string = 'MockScene') {
    super({ key });
  }

  // Minimal scene for entity testing
  // Provides physics, add, time, events
  
  create(): void {
    // No-op
  }
}
