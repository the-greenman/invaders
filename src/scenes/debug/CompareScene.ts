import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../constants';

/**
 * Compare Scene
 *
 * Launches GameScene and SpriteDebugScene side by side for visual comparison.
 * Left: GameScene, Right: SpriteDebugScene.
 */
export class CompareScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CompareScene' });
  }

  create(): void {
    const halfWidth = GAME_WIDTH / 2;

    // Launch both scenes with constrained viewports
    this.scene.launch('GameScene', {
      viewport: { x: 0, y: 0, width: halfWidth, height: GAME_HEIGHT },
      useWebcam: false
    });
    this.scene.launch('SpriteDebugScene', {
      viewport: { x: halfWidth, y: 0, width: halfWidth, height: GAME_HEIGHT }
    });

    this.add.text(halfWidth * 0.5, 20, 'GAME', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5, 0);

    this.add.text(halfWidth * 1.5, 20, 'SPRITE DEBUG', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#00ffff'
    }).setOrigin(0.5, 0);

    // Stop children when this scene shuts down
    this.events.on('shutdown', () => {
      this.scene.stop('GameScene');
      this.scene.stop('SpriteDebugScene');
    });
  }
}
