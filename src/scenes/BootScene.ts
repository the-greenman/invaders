import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Will implement asset loading later
  }

  create(): void {
    // Placeholder - will implement later
    console.log('BootScene created');
  }
}
