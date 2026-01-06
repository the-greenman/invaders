import Phaser from 'phaser';
import { ModeTransitionData } from './ModeTransitionScene';
import { GameMode, getGameModeName } from '../types/GameMode';
import { DifficultyPreset } from '../types/DifficultyPreset';

type Cloud = {
  sprite: Phaser.GameObjects.Ellipse;
  speed: number;
  drift: number;
};

export class GalagaSkyTransitionScene extends Phaser.Scene {
  private dataIn!: ModeTransitionData;
  private clouds: Cloud[] = [];
  private started: boolean = false;
  private countdownText?: Phaser.GameObjects.Text;
  private countdownEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'GalagaSkyTransitionScene' });
  }

  init(data: ModeTransitionData): void {
    this.dataIn = data;
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0a122d);
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f1c3f, 0.6);

    for (let i = 0; i < 10; i++) {
      this.clouds.push(this.createCloud(Math.random() * width, Math.random() * height));
    }

    const title = this.add.text(width / 2, height * 0.3, 'WAVE CLEARED', {
      fontFamily: 'Courier New',
      fontSize: '28px',
      color: '#ffff66'
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height * 0.43, 'Engines burning hot — climbing above the clouds.', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#aaddff'
    }).setOrigin(0.5);

    const detail = this.add.text(width / 2, height * 0.55,
      `Next: ${getGameModeName(this.dataIn.toMode)}\nEnemy aces dive from the stratosphere.`,
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#cceeef',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.tweens.add({ targets: [title, subtitle, detail], alpha: { from: 0, to: 1 }, duration: 500 });

    const horizonY = height * 0.75;
    this.add.line(0, 0, 0, horizonY, width, horizonY, 0x334466, 0.6).setOrigin(0, 0);
    if (this.dataIn.showDefenderPreview) {
      this.spawnDefender(horizonY);
    }

    this.add.text(width / 2, height * 0.6, 'More invaders... get ready!', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#ffeeaa'
    }).setOrigin(0.5);

    this.startCountdown(3);

    this.input.once('pointerdown', () => this.startNext());
    this.input.keyboard?.once('keydown-SPACE', () => this.startNext());
    this.input.keyboard?.once('keydown-ENTER', () => this.startNext());
  }

  update(_: number, delta: number): void {
    this.clouds.forEach(cloud => {
      cloud.sprite.y -= cloud.speed * (delta / 1000);
      cloud.sprite.x += cloud.drift * (delta / 1000);
      if (cloud.sprite.y < -50) {
        cloud.sprite.y = this.scale.height + 50;
      }
      if (cloud.sprite.x > this.scale.width + 80) {
        cloud.sprite.x = -80;
      } else if (cloud.sprite.x < -80) {
        cloud.sprite.x = this.scale.width + 80;
      }
    });
  }

  private spawnDefender(horizonY: number): void {
    const { width, height } = this.scale;
    const textureKey = this.textures.exists('player') ? 'player' : undefined;
    const x = width / 2;
    const startY = horizonY + 40;
    const targetY = height * 0.35;

    const ship = textureKey
      ? this.add.sprite(x, startY, textureKey).setScale(0.8)
      : this.add.triangle(x, startY, 0, 40, 40, -40, -40, -40, 0xffffff, 0.5);

    this.tweens.add({
      targets: ship,
      y: targetY,
      duration: 2000,
      ease: 'Sine.easeOut'
    });

    // Thruster glow
    const thruster = this.add.rectangle(x, startY + 25, 12, 28, 0xff8800, 0.6);
    thruster.setDepth(ship.depth - 1);
    this.tweens.add({
      targets: thruster,
      y: targetY + 25,
      duration: 2000,
      ease: 'Sine.easeOut'
    });
    this.tweens.add({
      targets: thruster,
      scaleY: { from: 1, to: 1.4 },
      alpha: { from: 0.7, to: 0.2 },
      duration: 200,
      repeat: -1,
      yoyo: true
    });
  }

  private startCountdown(seconds: number): void {
    if (this.countdownEvent) {
      this.countdownEvent.remove(false);
      this.countdownEvent = undefined;
    }
    const { width, height } = this.scale;
    if (!this.countdownText) {
      this.countdownText = this.add.text(width / 2, height * 0.68, '', {
        fontFamily: 'Courier New',
        fontSize: '32px',
        color: '#ffffff'
      }).setOrigin(0.5);
    }

    let remaining = seconds;
    const tick = () => {
      if (!this.countdownText) return;
      this.countdownText.setText(remaining.toString());
      remaining -= 1;
      if (remaining <= 0) {
        this.countdownText.setText('GO!');
        this.time.delayedCall(500, () => this.startNext());
        return;
      }
      this.countdownEvent = this.time.delayedCall(1000, tick);
    };

    tick();
  }

  private createCloud(x: number, y: number): Cloud {
    const scale = Phaser.Math.FloatBetween(0.6, 1.4);
    const sprite = this.add.ellipse(x, y, 180 * scale, 80 * scale, 0xffffff, 0.18);
    sprite.setStrokeStyle(2, 0xffffff, 0.3);
    sprite.setDepth(scale);

    return {
      sprite,
      speed: Phaser.Math.FloatBetween(20, 55),
      drift: Phaser.Math.FloatBetween(-10, 12)
    };
  }

  private startNext(): void {
    if (this.started) return;
    this.started = true;
    if (this.countdownEvent) {
      this.countdownEvent.remove(false);
      this.countdownEvent = undefined;
    }

    const { toMode, level, score, useWebcam, lives, difficulty, advanceLevel } = this.dataIn;
    const nextLevel = advanceLevel ? level + 1 : level;
    const sceneKey = toMode === GameMode.SPACE_INVADERS ? 'SpaceInvadersScene' : 'GalagaScene';

    this.scene.start(sceneKey, {
      level: nextLevel,
      score,
      useWebcam,
      lives,
      difficulty,
      startMode: toMode
    });
  }
}
