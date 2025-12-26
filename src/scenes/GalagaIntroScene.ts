import Phaser from 'phaser';
import { GameMode, getGameModeName } from '../types/GameMode';

interface ModeIntroData {
  toMode: GameMode;
  level: number;
  score: number;
  useWebcam: boolean;
  advanceLevel?: boolean;
}

export class GalagaIntroScene extends Phaser.Scene {
  private dataIn!: ModeIntroData;

  constructor() {
    super({ key: 'GalagaIntroScene' });
  }

  init(data: ModeIntroData): void {
    this.dataIn = data;
  }

  create(): void {
    const { toMode } = this.dataIn;

    const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40,
      'GALAGA MODE', {
        fontSize: '28px',
        fontFamily: 'Courier New',
        color: '#ffff00',
        align: 'center'
      }
    ).setOrigin(0.5);

    const story = this.add.text(this.scale.width / 2, this.scale.height / 2 + 10,
      `${getGameModeName(toMode)}\nWaves will dive and return — strike fast!`,
      {
        fontSize: '18px',
        fontFamily: 'Courier New',
        color: '#00ff00',
        align: 'center'
      }
    ).setOrigin(0.5);

    title.setAlpha(0);
    story.setAlpha(0);
    this.tweens.add({ targets: [title, story], alpha: 1, duration: 400, ease: 'Sine.easeIn' });

    this.time.delayedCall(1500, () => this.startNext(), undefined, this);
  }

  private startNext(): void {
    const { toMode, level, score, useWebcam, advanceLevel } = this.dataIn;
    const nextLevel = advanceLevel ? level + 1 : level;
    this.scene.start('GameScene', { level: nextLevel, score, useWebcam, startMode: toMode });
  }
}
