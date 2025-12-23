import Phaser from 'phaser';

export class DebugMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DebugMenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, 60, 'DEBUG MENU', {
      fontSize: '36px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    const lines = [
      '1 - Player Movement & Shooting',
      '2 - Armada Movement',
      '3 - Bullet Collisions',
      '4 - Camera Capture to Sprite',
      '5 - Sprite Debug (SVG & Faces)',
      '6 - Compare: Game vs Sprite Debug',
      '7 - Controller Debug',
      'ESC - Back to Main Menu'
    ];

    lines.forEach((l, i) => {
      this.add.text(width / 2, 150 + i * 40, l, {
        fontSize: '22px',
        fontFamily: 'Courier New',
        color: '#ffffff'
      }).setOrigin(0.5);
    });

    this.input.keyboard?.on('keydown-ONE', () => this.scene.start('PlayerTestScene'));
    this.input.keyboard?.on('keydown-TWO', () => this.scene.start('ArmadaTestScene'));
    this.input.keyboard?.on('keydown-THREE', () => this.scene.start('CollisionTestScene'));
    this.input.keyboard?.on('keydown-FOUR', () => this.scene.start('CameraTestScene'));
    this.input.keyboard?.on('keydown-FIVE', () => this.scene.start('SpriteDebugScene'));
    this.input.keyboard?.on('keydown-SIX', () => this.scene.start('CompareScene'));
    this.input.keyboard?.on('keydown-SEVEN', () => this.scene.start('ControllerDebugScene'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }
}
