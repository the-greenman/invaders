import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { Bullet } from '../../entities/Bullet';
import { GAME_HEIGHT, GAME_WIDTH } from '../../constants';

export class PlayerTestScene extends Phaser.Scene {
  private player: Player | null = null;
  private bullets!: Phaser.Physics.Arcade.Group;

  constructor() {
    super({ key: 'PlayerTestScene' });
  }

  create(): void {
    const { width } = this.cameras.main;

    this.add.text(width / 2, 40, 'PLAYER TEST', {
      fontSize: '28px', fontFamily: 'Courier New', color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 80,
      'Arrows: Move    Space: Shoot    ESC: Back',
      { fontSize: '18px', fontFamily: 'Courier New', color: '#ffffff' }
    );

    // World bounds
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Player
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 60);

    // Bullets
    this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: false });

    // Listen for fire events from Player
    this.events.on('fireBullet', (x: number, y: number) => this.fireBullet(x, y));

    // ESC back
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('DebugMenuScene'));
  }

  private fireBullet(x: number, y: number) {
    const b = this.bullets.get(x, y, 'bullet') as Bullet;
    if (!b) return;
    b.setActive(true).setVisible(true);
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.setSize(4, 12);
    body.setVelocityY(-400);
    body.enable = true;
  }

  update(): void {
    this.player?.update(16);
    (this.bullets.getChildren() as any[]).forEach((child) => {
      if (child && child.active && child.y < -20) {
        child.setActive(false).setVisible(false);
      }
    });
  }
}
