import Phaser from 'phaser';
import { SpaceInvadersGrid } from '../../entities/SpaceInvadersGrid';
import { GAME_WIDTH } from '../../constants';

export class ArmadaTestScene extends Phaser.Scene {
  private grid!: SpaceInvadersGrid;
  private info!: Phaser.GameObjects.Text;
  private debugOn: boolean = true;

  constructor() { super({ key: 'ArmadaTestScene' }); }

  create(): void {
    const { width } = this.cameras.main;
    this.add.text(width / 2, 40, 'ARMADA MOVEMENT TEST', {
      fontSize: '28px', fontFamily: 'Courier New', color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 80, 'Observe movement. L: toggle logs, B: dump bounds, ESC: Back', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#ffffff'
    });

    // rows, cols, speed derived from typical defaults
    this.grid = new SpaceInvadersGrid(this, 100, 100, 5, 11, 800);
    this.grid.setDebug(this.debugOn);
    this.grid.dumpState('initial');

    // Debug overlay
    this.info = this.add.text(20, 120, '', { fontSize: '16px', fontFamily: 'Courier New', color: '#00ffff' })
      .setDepth(1000);

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('DebugMenuScene'));
    this.input.keyboard?.on('keydown-L', () => {
      this.debugOn = !this.debugOn;
      this.grid.setDebug(this.debugOn);
      console.log('[ArmadaTest] debug logs', this.debugOn ? 'ON' : 'OFF');
    });
    this.input.keyboard?.on('keydown-D', () => {
      this.grid.dumpState('manual');
    });
    this.input.keyboard?.on('keydown-B', () => {
      const b = this.grid.getBounds();
      console.log('[ArmadaTest] bounds', {
        left: Math.round(b.left), right: Math.round(b.right),
        top: Math.round(b.top), bottom: Math.round(b.bottom),
        x: Math.round(this.grid.x), y: Math.round(this.grid.y)
      });
    });
  }

  update(): void {
    this.grid?.update(16);

    // Update debug overlay
    if (this.grid && this.info) {
      const b = this.grid.getBounds();
      const direction = (this.grid as any).direction;
      this.info.setText([
        `grid.x: ${Math.round(this.grid.x)}  grid.y: ${Math.round(this.grid.y)}`,
        `bounds L:${Math.round(b.left)} R:${Math.round(b.right)} T:${Math.round(b.top)} B:${Math.round(b.bottom)}`,
        `dir: ${direction}`
      ]);
    }
  }
}
