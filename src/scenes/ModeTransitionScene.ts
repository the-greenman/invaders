import Phaser from 'phaser';
import { GameMode, getGameModeName } from '../types/GameMode';

interface ModeTransitionData {
  fromMode: GameMode;
  toMode: GameMode;
  level: number;
  score: number;
  useWebcam: boolean;
  advanceLevel?: boolean; // if true, advance to next level before switching
}

export class ModeTransitionScene extends Phaser.Scene {
  private dataIn!: ModeTransitionData;

  constructor() {
    super({ key: 'ModeTransitionScene' });
  }

  init(data: ModeTransitionData): void {
    this.dataIn = data;
  }

  create(): void {
    const { fromMode, toMode } = this.dataIn;

    const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40,
      'MODE TRANSITION', {
        fontSize: '28px',
        fontFamily: 'Courier New',
        color: '#ffff00',
        align: 'center'
      }
    ).setOrigin(0.5);

    const story = this.add.text(this.scale.width / 2, this.scale.height / 2 + 10,
      `From ${getGameModeName(fromMode)} to ${getGameModeName(toMode)}\n` +
      `The battle shifts... adapt to the new tactics!`,
      {
        fontSize: '18px',
        fontFamily: 'Courier New',
        color: '#00ff00',
        align: 'center'
      }
    ).setOrigin(0.5);

    // Small fade in/out effect
    title.setAlpha(0);
    story.setAlpha(0);
    this.tweens.add({ targets: [title, story], alpha: 1, duration: 400, ease: 'Sine.easeIn' });

    // After short delay, start GameScene in the new mode
    this.time.delayedCall(1800, () => this.startNext(), undefined, this);
  }

  private startNext(): void {
    const { toMode, level, score, useWebcam, advanceLevel } = this.dataIn;
    const nextLevel = advanceLevel ? level + 1 : level;
    this.scene.start('GameScene', {
      level: nextLevel,
      score,
      useWebcam,
      startMode: toMode
    });
  }
}
