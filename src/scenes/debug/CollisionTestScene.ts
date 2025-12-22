import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { Bullet } from '../../entities/Bullet';
import { Alien } from '../../entities/Alien';
import { GAME_WIDTH, GAME_HEIGHT } from '../../constants';

export class CollisionTestScene extends Phaser.Scene {
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private aliens!: Phaser.Physics.Arcade.Group;
  private target!: Alien;

  constructor() { super({ key: 'CollisionTestScene' }); }

  create(): void {
    const { width } = this.cameras.main;
    this.add.text(width / 2, 40, 'BULLET COLLISION TEST', {
      fontSize: '28px', fontFamily: 'Courier New', color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 80,
      'Shoot the target alien. Arrows to move, Space to shoot. ESC back.',
      { fontSize: '18px', fontFamily: 'Courier New', color: '#ffffff' }
    );

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Player
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 60);

    // Bullets
    this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: false });
    this.events.on('fireBullet', (x: number, y: number) => this.fireBullet(x, y));

    // One target alien
    this.aliens = this.physics.add.group({ classType: Alien, runChildUpdate: false });
    this.target = new Alien(this, GAME_WIDTH / 2, 200, 1, { row: 0, col: 0 });
    this.aliens.add(this.target);

    // Overlap
    this.physics.add.overlap(this.bullets, this.aliens, (obj1: any, obj2: any) => {
      const bullet = obj1 as Bullet;
      const alien = obj2 as Alien;
      if (bullet && alien) {
        bullet.setActive(false).setVisible(false);
        alien.setTint(0xff0000);
        alien.destroy();
      }
    });

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
