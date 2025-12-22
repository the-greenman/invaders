import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { Bullet } from '../../entities/Bullet';
import { Alien } from '../../entities/Alien';
import { AlienGrid } from '../../entities/AlienGrid';
import { GAME_WIDTH, GAME_HEIGHT, ALIEN_ROWS, ALIEN_COLS } from '../../constants';

export class CollisionTestScene extends Phaser.Scene {
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private aliens!: Phaser.Physics.Arcade.Group;
  private target!: Alien;
  private grid: AlienGrid | null = null;
  private mode: 'single' | 'armada' = 'single';
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private modeText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'CollisionTestScene' }); }

  create(): void {
    const { width } = this.cameras.main;
    this.add.text(width / 2, 40, 'BULLET COLLISION TEST', {
      fontSize: '28px', fontFamily: 'Courier New', color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 80,
      'Shoot aliens. Arrows move, Space shoot. A: toggle single/armada. B: show bounds. ESC back.',
      { fontSize: '18px', fontFamily: 'Courier New', color: '#ffffff' }
    );

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Player
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 60);

    // Bullets
    this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: false });
    this.events.on('fireBullet', (x: number, y: number) => this.fireBullet(x, y));

    // Aliens group
    this.aliens = this.physics.add.group({ classType: Alien, runChildUpdate: false });

    // Debug graphics for bounds
    this.debugGraphics = this.add.graphics({ lineStyle: { width: 2, color: 0x00ffff, alpha: 0.6 } });
    this.modeText = this.add.text(20, 110, 'Mode: SINGLE', { fontSize: '16px', fontFamily: 'Courier New', color: '#ffff00' });

    this.spawnSingleTarget();
    this.setupOverlap();

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('DebugMenuScene'));
    this.input.keyboard?.on('keydown-A', () => this.toggleMode());
    this.input.keyboard?.on('keydown-B', () => this.toggleBounds());
  }

  private fireBullet(x: number, y: number) {
    const b = this.bullets.get(x, y, 'bullet') as Bullet | null;
    b?.launch(x, y);
  }

  private setupOverlap() {
    this.physics.add.overlap(this.bullets, this.aliens, (obj1: any, obj2: any) => {
      const bullet = obj1 as Bullet;
      const alien = obj2 as Alien;
      if (bullet && alien) {
        bullet.hit();
        alien.setTint(0xff0000);
        alien.destroy();
      }
    });
  }

  private spawnSingleTarget() {
    this.clearArmada();
    this.aliens.clear(true, true);
    this.target = new Alien(this, GAME_WIDTH / 2, 220, 1, { row: 0, col: 0 });
    this.aliens.add(this.target);
    this.mode = 'single';
    this.modeText.setText('Mode: SINGLE');
  }

  private spawnArmada() {
    this.aliens.clear(true, true);
    this.grid?.destroy();
    this.grid = new AlienGrid(this, 100, 120, ALIEN_ROWS, ALIEN_COLS, 800);
    const alive = this.grid.getAliveAliens();
    alive.forEach(alien => this.aliens.add(alien));
    this.mode = 'armada';
    this.modeText.setText('Mode: ARMADA');
  }

  private toggleMode() {
    if (this.mode === 'single') {
      this.spawnArmada();
    } else {
      this.spawnSingleTarget();
    }
  }

  private clearArmada() {
    if (this.grid) {
      this.grid.destroy();
      this.grid = null;
    }
  }

  private toggleBounds() {
    const visible = !this.debugGraphics.visible;
    this.debugGraphics.setVisible(visible);
  }

  update(): void {
    this.player?.update(16);
    (this.bullets.getChildren() as any[]).forEach((child) => {
      if (child && child.active && child.y < -20) {
        child.setActive(false).setVisible(false);
      }
    });

    // Update grid movement in armada mode
    if (this.mode === 'armada') {
      this.grid?.update(16);
    }

    // Draw collision bounds if visible
    if (this.debugGraphics.visible) {
      this.debugGraphics.clear();
      this.debugGraphics.lineStyle(2, 0x00ffff, 0.6);
      (this.aliens.getChildren() as Alien[]).forEach(alien => {
        if (!alien.body) return;
        const body = alien.body as Phaser.Physics.Arcade.Body;
        this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);
      });
      (this.bullets.getChildren() as Bullet[]).forEach(b => {
        if (!b.body) return;
        const body = b.body as Phaser.Physics.Arcade.Body;
        this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);
      });
    }
  }
}
