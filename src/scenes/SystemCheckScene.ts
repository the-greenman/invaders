import Phaser from 'phaser';
import { computeSystemChecks, SystemCheckResult } from '../utils/systemCheck';

export class SystemCheckScene extends Phaser.Scene {
  private lines: Phaser.GameObjects.Text[] = [];
  private checks: SystemCheckResult[] = [];
  private started: boolean = false;
  private autoAdvanceTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'SystemCheckScene' });
  }

  create(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor(0x000000);

    this.add.text(width / 2, 60, 'SYSTEM BOOT - PACSHIP', {
      fontFamily: 'Courier New',
      fontSize: '26px',
      color: '#00ff00'
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, 90, 'Running diagnostics...', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#88ff88'
    }).setOrigin(0.5);

    const lsAvailable = true; // computed inside helper by default
    const faceCount = undefined;
    const gamepadTotal = this.input.gamepad?.total ?? 0;
    this.checks = computeSystemChecks({
      localStorageAvailable: lsAvailable,
      faceCountOverride: faceCount,
      gamepadTotal
    });

    const startY = 160;
    this.checks.forEach((check, i) => {
      const line = this.add.text(80, startY + i * 36, `> ${check.label}: ...`, {
        fontFamily: 'Courier New',
        fontSize: '20px',
        color: '#00ff00'
      }).setAlpha(0);
      this.lines.push(line);

      this.time.delayedCall(300 + i * 400, () => {
        const color =
          check.status === 'ok' ? '#00ff00' : check.status === 'warn' ? '#ffff00' : '#ff4444';
        line.setText(`> ${check.label}: ${check.detail}`);
        line.setColor(color);
        line.setAlpha(1);
      });
    });

    subtitle.setAlpha(0.8);

    const advance = () => this.advance();
    this.input.once('pointerdown', advance);
    this.input.keyboard?.once('keydown', advance);
    try {
      this.input.gamepad?.once('down', advance);
    } catch (e) {
      // Ignore gamepad errors - some browsers crash on gamepad API when no controller connected
    }

    const totalDuration = 300 + this.checks.length * 400 + 800;
    this.autoAdvanceTimer = this.time.delayedCall(totalDuration, advance);
  }

  private advance(): void {
    if (this.started) return;
    this.started = true;
    this.autoAdvanceTimer?.remove(false);
    this.scene.start('MenuScene');
  }
}
