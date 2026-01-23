import Phaser from 'phaser';
import { GameMode, getGameModeName } from '../types/GameMode';
import { resumeGameAudio } from '../utils/audio';

interface ModeIntroData {
  toMode: GameMode;
  level: number;
  score: number;
  useWebcam: boolean;
  lives: number;
  advanceLevel?: boolean;
}

export class GalagaIntroScene extends Phaser.Scene {
  private dataIn!: ModeIntroData;
  private hasAdvanced: boolean = false;
  private autoAdvanceTimer?: Phaser.Time.TimerEvent;

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

    const prompt = this.add.text(this.scale.width / 2, this.scale.height / 2 + 70,
      'Press SPACE/ENTER or tap to continue',
      {
        fontSize: '16px',
        fontFamily: 'Courier New',
        color: '#888888',
        align: 'center'
      }
    ).setOrigin(0.5);

    title.setAlpha(0);
    story.setAlpha(0);
    prompt.setAlpha(0);
    this.tweens.add({ targets: [title, story, prompt], alpha: 1, duration: 400, ease: 'Sine.easeIn' });

    const advance = () => this.advance();
    this.input.once('pointerdown', advance);
    this.input.keyboard?.once('keydown-SPACE', advance);
    this.input.keyboard?.once('keydown-ENTER', advance);
    this.input.gamepad?.once('down', advance);
    this.autoAdvanceTimer = this.time.delayedCall(10000, advance);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.autoAdvanceTimer?.remove(false);
    });
  }

  private advance(): void {
    if (this.hasAdvanced) return;
    this.hasAdvanced = true;
    this.autoAdvanceTimer?.remove(false);
    resumeGameAudio(this);
    this.startNext();
  }

  private startNext(): void {
    const { toMode, level, score, useWebcam, lives, advanceLevel } = this.dataIn;
    const nextLevel = advanceLevel ? level + 1 : level;
    
    // Use the correct scene key based on mode
    const sceneKey = toMode === GameMode.SPACE_INVADERS ? 'SpaceInvadersScene' : 'GalagaScene';
    
    this.scene.start(sceneKey, { level: nextLevel, score, useWebcam, lives, startMode: toMode });
  }
}
