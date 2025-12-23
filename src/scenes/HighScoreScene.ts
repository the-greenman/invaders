import Phaser from 'phaser';
import { LocalStorage } from '../utils/localStorage';
import { HighScore } from '../types';
import { FaceManager } from '../managers/FaceManager';
import { ALIEN_WIDTH, ALIEN_HEIGHT, ALIEN_CORE_RADIUS, COLORS } from '../constants';

export class HighScoreScene extends Phaser.Scene {
  private listContainer!: Phaser.GameObjects.Container;
  private scrollY: number = 0;
  private maxScroll: number = 0;
  private startDragY: number | null = null;
  private backButtonIndex: number = 10;
  private fireButtonIndex: number = 0;
  private startButtonIndex: number = 11;
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;

  constructor() {
    super({ key: 'HighScoreScene' });
  }

  async create(): Promise<void> {
    const settings = LocalStorage.getSettings();
    this.backButtonIndex = settings.controllerBackButton ?? 10;
    this.fireButtonIndex = settings.controllerFireButton ?? 0;
    this.startButtonIndex = settings.controllerStartButton ?? 11;

    this.createBackground();
    await this.buildList();
    this.setupInput();
  }

  update(): void {
    this.handleGamepadInput();
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 0, width, height);

    this.add.text(width / 2, 40, 'HIGH SCORES', {
      fontSize: '36px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 80, 'Scroll / drag to view. Fire/Enter to return.', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);
  }

  private async buildList(): Promise<void> {
    const scores = LocalStorage.getHighScores().slice(0, 10);
    const { width } = this.cameras.main;

    this.listContainer = this.add.container(0, 120);
    let y = 0;
    const itemHeight = 140;

    if (scores.length === 0) {
      this.listContainer.add(this.add.text(width / 2, 40, 'No high scores yet.', {
        fontSize: '20px',
        fontFamily: 'Courier New',
        color: '#ffff00'
      }).setOrigin(0.5));
      return;
    }

    for (const score of scores) {
      const faceKey = await this.ensureFaceTexture(score);
      const item = this.add.container(width / 2, y);

      // Face image
      if (faceKey) {
        const img = this.add.image(-200, 0, faceKey);
        img.setDisplaySize(ALIEN_WIDTH, ALIEN_HEIGHT);
        item.add(img);
      }

      // Text
      item.add(this.add.text(-120, -8, `Score: ${score.score}  Level: ${score.level}`, {
        fontSize: '18px',
        fontFamily: 'Courier New',
        color: '#ffff00'
      }));

      const date = new Date(score.date).toLocaleDateString();
      item.add(this.add.text(-120, 20, `${date}`, {
        fontSize: '14px',
        fontFamily: 'Courier New',
        color: '#cccccc'
      }));

      this.listContainer.add(item);
      y += itemHeight;
    }

    this.maxScroll = Math.max(0, y - (this.cameras.main.height - 140));
  }

  private async ensureFaceTexture(score: HighScore): Promise<string | null> {
    if (score.faceImage) {
      const key = `hs-face-${score.date}`;
      if (!this.textures.exists(key)) {
        try {
          await FaceManager.addBase64Texture(this, key, score.faceImage);
        } catch (e) {
          console.warn('Failed to add high score face', e);
          return this.textures.exists('default-face') ? 'default-face' : null;
        }
      }
      return key;
    }
    if (this.textures.exists('default-face')) {
      return 'default-face';
    }
    return null;
  }

  private setupInput(): void {
    this.input.on('wheel', (_pointer: any, _go: any, _deltaX: number, deltaY: number) => {
      this.scrollBy(deltaY);
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.startDragY = p.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.startDragY !== null) {
        const delta = p.y - this.startDragY;
        this.startDragY = p.y;
        this.scrollBy(-delta * 1.2);
      }
    });
    this.input.on('pointerup', () => {
      this.startDragY = null;
    });
    this.input.on('pointerupoutside', () => {
      this.startDragY = null;
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      this.scene.start('MenuScene');
    });

    this.input.gamepad?.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepad = pad;
    });
  }

  private scrollBy(amount: number): void {
    if (!this.listContainer) return;
    this.scrollY = Phaser.Math.Clamp(this.scrollY + amount, -this.maxScroll, 0);
    this.listContainer.setY(120 + this.scrollY);
  }

  private handleGamepadInput(): void {
    if (!this.input.gamepad) return;
    if (!this.gamepad || !this.gamepad.connected) {
      this.gamepad = this.input.gamepad.getPad(0);
    }
    if (!this.gamepad) return;

    const axisY = this.gamepad.axes[1]?.getValue() || 0;
    if (Math.abs(axisY) > 0.2) {
      this.scrollBy(axisY * 5);
    }

    const fire = this.gamepad.buttons[this.fireButtonIndex]?.pressed || this.gamepad.buttons[this.startButtonIndex]?.pressed;
    const back = this.gamepad.buttons[this.backButtonIndex]?.pressed;
    if (fire || back) {
      this.scene.start('MenuScene');
    }
  }
}
