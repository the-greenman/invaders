import Phaser from 'phaser';
import { GameMode, getGameModeName } from '../types/GameMode';
import { DifficultyPreset } from '../types/DifficultyPreset';
import { resumeGameAudio } from '../utils/audio';

export interface ModeTransitionData {
  fromMode: GameMode;
  toMode: GameMode;
  level: number;
  score: number;
  useWebcam: boolean;
  lives: number;
  difficulty?: DifficultyPreset;
  advanceLevel?: boolean; // if true, advance to next level before switching
  showDefenderPreview?: boolean;
}

export class ModeTransitionScene extends Phaser.Scene {
  private dataIn!: ModeTransitionData;
  private hasAdvanced: boolean = false;
  private autoAdvanceTimer?: Phaser.Time.TimerEvent;

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

    const prompt = this.add.text(this.scale.width / 2, this.scale.height / 2 + 70,
      'Press SPACE/ENTER or tap to continue',
      {
        fontSize: '16px',
        fontFamily: 'Courier New',
        color: '#888888',
        align: 'center'
      }
    ).setOrigin(0.5);

    // Small fade in effect
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
    const { toMode, level, score, useWebcam, lives, difficulty, advanceLevel } = this.dataIn;
    const nextLevel = advanceLevel ? level + 1 : level;
    
    console.log(`[ModeTransitionScene] Starting next scene. Level: ${level} -> ${nextLevel} (advanceLevel: ${advanceLevel})`);
    
    // Get the correct scene key for the target mode
    const sceneKey = this.getSceneKey(toMode);
    
    this.scene.start(sceneKey, {
      level: nextLevel,
      score,
      useWebcam,
      lives,
      difficulty,
      startMode: toMode
    });
  }

  private getSceneKey(mode: GameMode): string {
    switch (mode) {
      case GameMode.SPACE_INVADERS:
        return 'SpaceInvadersScene';
      case GameMode.GALAGA:
        return 'GalagaScene';
      default:
        console.warn(`Unknown game mode: ${mode}, falling back to GameScene`);
        return 'GameScene';
    }
  }
}
