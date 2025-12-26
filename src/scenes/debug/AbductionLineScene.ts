import Phaser from 'phaser';
import { SpaceInvadersGrid } from '../../entities/SpaceInvadersGrid';
import { ABDUCTION_THRESHOLD_Y, GAME_HEIGHT, GAME_WIDTH } from '../../constants';

/**
 * Abduction Line Debug Scene
 *
 * Shows the abduction threshold line and an alien grid to see when the game over triggers.
 */
export class AbductionLineScene extends Phaser.Scene {
  private grid!: SpaceInvadersGrid;
  private info!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'AbductionLineScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000000);

    this.add.text(GAME_WIDTH / 2, 40, 'ABDUCTION LINE DEBUG', {
      fontSize: '28px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 70, 'Green line = threshold. ESC to Debug Menu.', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#ffffff'
    });

    // Threshold line
    const line = this.add.line(0, 0, 0, ABDUCTION_THRESHOLD_Y, GAME_WIDTH, ABDUCTION_THRESHOLD_Y, 0x00ff00, 0.5);
    line.setOrigin(0, 0);
    this.add.text(GAME_WIDTH - 200, ABDUCTION_THRESHOLD_Y - 20, `Threshold: ${ABDUCTION_THRESHOLD_Y}`, {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    });

    // Alien grid with debug logging
    this.grid = new SpaceInvadersGrid(this, 100, 100, 3, 7, 600);
    this.grid.setDebug(true);
    this.grid.dumpState('init');

    // Info text
    this.info = this.add.text(20, 110, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#00ffff'
    });

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('DebugMenuScene'));
  }

  update(): void {
    this.grid?.update(16);

    if (this.grid && this.info) {
      const reached = this.grid.reachedPlayer();
      const b = this.grid.getBounds();
      this.info.setText([
        `Grid Y: ${Math.round(this.grid.y)}  Bounds Top: ${Math.round(b.top)} Bottom: ${Math.round(b.bottom)}`,
        `Reached threshold? ${reached ? 'YES' : 'no'}`
      ]);
    }
  }
}
