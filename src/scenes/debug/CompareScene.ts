import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../constants';
import { DebugBaseScene } from './DebugBaseScene';

/**
 * Compare Scene
 *
 * Launches SpaceInvadersScene and SpriteDebugScene side by side for visual comparison.
 * Left: SpaceInvadersScene, Right: SpriteDebugScene.
 */
export class CompareScene extends DebugBaseScene {
  constructor() {
    super({ key: 'CompareScene' });
  }

  create(): void {
    this.initDebugBase();

    const halfWidth = GAME_WIDTH / 2;

    // Launch both scenes with constrained viewports
    this.scene.launch('SpaceInvadersScene', {
      viewport: { x: 0, y: 0, width: halfWidth, height: GAME_HEIGHT },
      useWebcam: false,
      disableBackToMenu: true,
      startMode: 'SPACE_INVADERS'
    });
    this.scene.launch('SpriteDebugScene', {
      viewport: { x: halfWidth, y: 0, width: halfWidth, height: GAME_HEIGHT },
      disableBackToDebugMenu: true
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
      this.scene.stop('SpaceInvadersScene');
      this.scene.stop('SpriteDebugScene');
    });

    this.input.keyboard?.on('keydown-ESC', () => this.startExclusive('DebugMenuScene'));
  }

  update(): void {
    // In compare mode, this scene is the single owner of Back navigation.
    this.pollBackToDebugMenu();
  }
}
