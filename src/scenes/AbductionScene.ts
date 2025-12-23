import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_CORE_RADIUS } from '../constants';
import { FaceManager } from '../managers/FaceManager';
import { LocalStorage } from '../utils/localStorage';

interface AbductionData {
  score: number;
  level: number;
  playerTextureKey?: string;
}

/**
 * Abduction Scene
 *
 * Plays a short abduction animation before transitioning to GameOverScene.
 */
export class AbductionScene extends Phaser.Scene {
  private defender!: Phaser.GameObjects.Image;
  private beam!: Phaser.GameObjects.Graphics;
  private faceSprite?: Phaser.GameObjects.Image;
  private faceMask?: Phaser.Display.Masks.GeometryMask;
  private dataIn!: AbductionData;

  constructor() {
    super({ key: 'AbductionScene' });
  }

  async create(data: AbductionData): Promise<void> {
    this.dataIn = data;
    this.cameras.main.setBackgroundColor(0x000000);

    // Use base player sprite (no face) so only the floating face is visible during abduction
    const defenderKey = 'player';
    this.defender = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - PLAYER_HEIGHT, defenderKey)
      .setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);

    this.createBeam();
    await this.createFace();
    this.playSequence();
  }

  private createBeam(): void {
    this.beam = this.add.graphics();
    this.beam.fillStyle(0xffff66, 0.6);
    const topWidth = 40;
    const bottomWidth = 220;
    const height = GAME_HEIGHT * 0.9;
    const topY = GAME_HEIGHT - PLAYER_HEIGHT - 20 - height;
    const bottomY = GAME_HEIGHT; // extend beam to bottom edge

    const points = [
      GAME_WIDTH / 2 - topWidth / 2, topY,
      GAME_WIDTH / 2 + topWidth / 2, topY,
      GAME_WIDTH / 2 + bottomWidth / 2, bottomY,
      GAME_WIDTH / 2 - bottomWidth / 2, bottomY
    ];

    this.beam.fillPoints([
      new Phaser.Geom.Point(points[0], points[1]),
      new Phaser.Geom.Point(points[2], points[3]),
      new Phaser.Geom.Point(points[4], points[5]),
      new Phaser.Geom.Point(points[6], points[7])
    ], true);

    this.beam.setAlpha(0);
  }

  private async createFace(): Promise<void> {
    const faceData = LocalStorage.getCurrentFace();
    if (!faceData) return;
    const key = 'abduction-face';
    await FaceManager.addBase64Texture(this, key, faceData);
    this.faceSprite = this.add.image(this.defender.x, this.defender.y - PLAYER_HEIGHT * 0.5, key)
      .setDisplaySize(PLAYER_CORE_RADIUS * 3, PLAYER_CORE_RADIUS * 3)
      .setAlpha(0);

    // Circular mask for the face
    const maskGfx = this.add.graphics({ x: this.faceSprite.x, y: this.faceSprite.y });
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillCircle(0, 0, PLAYER_CORE_RADIUS * 1.6);
    this.faceMask = maskGfx.createGeometryMask();
    this.faceSprite.setMask(this.faceMask);
    maskGfx.setVisible(false);
  }

  private playSequence(): void {
    // Beam appear (slower)
    this.tweens.add({
      targets: this.beam,
      alpha: 1,
      duration: 1000,
      ease: 'Sine.easeOut'
    });

    // Face rise
    if (this.faceSprite) {
      this.tweens.add({
        targets: this.faceSprite,
        alpha: 1,
        duration: 300,
        onComplete: () => {
          this.tweens.add({
            targets: [this.faceSprite, this.faceMask ? this.faceMask.geometryMask : null].filter(Boolean) as any[],
            y: -PLAYER_HEIGHT,
            alpha: 0.2,
            duration: 2000,
            ease: 'Sine.easeIn',
            onComplete: () => {
              this.faceSprite?.destroy();
              this.faceMask?.destroy();
            }
          });
        }
      });
    }

    // Beam disappear + text
    this.time.delayedCall(2800, () => {
      this.tweens.add({
        targets: this.beam,
        alpha: 0,
        duration: 500,
        ease: 'Sine.easeIn'
      });
    });

    this.time.delayedCall(3200, () => {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'YOU HAVE BEEN ABDUCTED!', {
        fontSize: '32px',
        fontFamily: 'Courier New',
        color: '#ffdd00',
        align: 'center'
      }).setOrigin(0.5);
    });

    // Transition to GameOverScene
    this.time.delayedCall(5000, () => {
      this.scene.start('GameOverScene', { score: this.dataIn.score, level: this.dataIn.level });
    });
  }
}
