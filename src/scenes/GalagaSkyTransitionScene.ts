import Phaser from 'phaser';
import { ModeTransitionData } from './ModeTransitionScene';
import { GameMode } from '../types/GameMode';
import { resumeGameAudio } from '../utils/audio';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

type Cloud = {
  sprite: Phaser.GameObjects.Ellipse;
  speed: number;
  drift: number;
};

export class GalagaSkyTransitionScene extends Phaser.Scene {
  private dataIn!: ModeTransitionData;
  private clouds: Cloud[] = [];
  private started: boolean = false;
  private horizon?: Phaser.GameObjects.Line;

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

    const title = this.add.text(width / 2, height * 0.3, 'UP THROUGH THE CLOUDS', {
      fontFamily: 'Courier New',
      fontSize: '28px',
      color: '#ffff66'
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height * 0.43, 'Engines burning hot — climbing above the clouds.', {
      fontFamily: 'Courier New',
      fontSize: '20px',
      color: '#aaddff'
    }).setOrigin(0.5);

    const detail = this.add.text(
      width / 2,
      height * 0.55,
      'Phew, you blast past the invaders.\nBut there are more waiting in the clouds!',
      {
        fontFamily: 'Courier New',
        fontSize: '20px',
        color: '#cceeef',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.tweens.add({ targets: [title, subtitle, detail], alpha: { from: 0, to: 1 }, duration: 500 });

    const horizonY = height * 0.75;
    this.horizon = this.add.line(0, 0, 0, horizonY, width, horizonY, 0x334466, 0.8).setOrigin(0, 0);
    this.tweens.add({
      targets: this.horizon,
      y: horizonY + 80,
      alpha: { from: 0.8, to: 0.4 },
      duration: 2200,
      ease: 'Sine.easeIn'
    });

    if (this.dataIn.showDefenderPreview) {
      this.spawnDefender();
    }

    const prompt = this.add.text(width / 2, height * 0.68, 'Press SPACE/ENTER, A/Start, or tap to continue', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#a0b8ff',
      align: 'center'
    }).setOrigin(0.5);

    const advance = () => {
      resumeGameAudio(this);
      this.startNext();
    };
    this.input.once('pointerdown', advance);
    this.input.keyboard?.once('keydown-SPACE', advance);
    this.input.keyboard?.once('keydown-ENTER', advance);
    this.input.gamepad?.once('down', advance);
    this.time.delayedCall(10000, advance);
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

  private spawnDefender(): void {
    const { width, height } = this.scale;
    const textureKey = this.textures.exists('player') ? 'player' : undefined;
    const x = GAME_WIDTH / 2;
    const startY = GAME_HEIGHT - 50;
    const targetY = height * 0.3;

    const ship = textureKey
      ? this.add.sprite(x, startY, textureKey).setScale(1)
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

  private createCloud(x: number, y: number): Cloud {
    const scale = Phaser.Math.FloatBetween(0.6, 1.4);
    const sprite = this.add.ellipse(x, y, 180 * scale, 80 * scale, 0xffffff, 0.18);
    sprite.setStrokeStyle(2, 0xffffff, 0.3);
    sprite.setDepth(scale);

    return {
      sprite,
      speed: Phaser.Math.FloatBetween(-40, -20), // move downward to simulate climbing
      drift: Phaser.Math.FloatBetween(-10, 12)
    };
  }

  private startNext(): void {
    if (this.started) return;
    this.started = true;

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
