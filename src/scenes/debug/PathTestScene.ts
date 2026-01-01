import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../constants';
import { AttackPath, DiveBombPath, LoopPath, WeavePath, SwoopPath, StrafePath } from '../../systems/AttackPath';

export class PathTestScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private marker!: Phaser.GameObjects.Arc;
  private infoText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;

  private currentPathName: 'DiveBomb' | 'Loop' | 'Weave' | 'Swoop' | 'Strafe' = 'DiveBomb';
  private path!: AttackPath;
  private durationMs: number = 4000;
  private startX = GAME_WIDTH / 2;
  private startY = 120;

  private playing = true;
  private t = 0; // 0..1

  constructor() {
    super({ key: 'PathTestScene' });
  }

  create(): void {
    this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0x00ff00, alpha: 0.8 } });
    this.marker = this.add.circle(this.startX, this.startY, 6, 0xff0000) as Phaser.GameObjects.Arc;

    this.infoText = this.add.text(10, 10, '', {
      fontSize: '16px', fontFamily: 'Courier New', color: '#00ff00'
    });
    this.controlsText = this.add.text(10, 34,
      '1-5: Select Path  |  SPACE: Play/Pause  |  R: Reset  |  M: Menu',
      { fontSize: '14px', fontFamily: 'Courier New', color: '#cccccc' }
    );

    this.input.keyboard?.on('keydown-ONE', () => this.setPath('DiveBomb'));
    this.input.keyboard?.on('keydown-TWO', () => this.setPath('Loop'));
    this.input.keyboard?.on('keydown-THREE', () => this.setPath('Weave'));
    this.input.keyboard?.on('keydown-FOUR', () => this.setPath('Swoop'));
    this.input.keyboard?.on('keydown-FIVE', () => this.setPath('Strafe'));
    this.input.keyboard?.on('keydown-SPACE', () => this.playing = !this.playing);
    this.input.keyboard?.on('keydown-R', () => this.resetPlayback());
    this.input.keyboard?.on('keydown-M', () => this.scene.start('DebugMenuScene'));

    this.setPath(this.currentPathName);
  }

  private setPath(name: 'DiveBomb' | 'Loop' | 'Weave' | 'Swoop' | 'Strafe') {
    this.currentPathName = name;
    switch (name) {
      case 'DiveBomb': this.path = new DiveBombPath(3000); break;
      case 'Loop': this.path = new LoopPath(4000); break;
      case 'Weave': this.path = new WeavePath(3500); break;
      case 'Swoop': this.path = new SwoopPath(3500); break;
      case 'Strafe': this.path = new StrafePath(4000); break;
    }
    this.durationMs = (this.path as any).duration ?? 4000; // duration is protected; keep a local default
    this.path.start(this.startX, this.startY);
    this.t = 0;
    this.playing = true;
    this.redrawCurve();
    this.updateInfo();
  }

  private resetPlayback() {
    this.t = 0;
    this.playing = true;
    this.marker.setPosition(this.startX, this.startY);
  }

  private redrawCurve() {
    this.graphics.clear();
    this.graphics.lineStyle(2, 0x00ff00, 0.8);
    const steps = 100;
    let prev = this.path.getPointAtTime(0);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const p = this.path.getPointAtTime(t);
      this.graphics.lineBetween(prev.x, prev.y, p.x, p.y);
      prev = p;
    }
  }

  update(time: number, delta: number): void {
    if (this.playing && this.t < 1) {
      this.t += delta / this.durationMs;
      if (this.t > 1) this.t = 1;
      const p = this.path.getPointAtTime(this.t);
      this.marker.setPosition(p.x, p.y);
      this.updateInfo();
    }
  }

  private updateInfo() {
    this.infoText.setText(
      `Path: ${this.currentPathName}\n` +
      `t: ${this.t.toFixed(2)}`
    );
  }
}
