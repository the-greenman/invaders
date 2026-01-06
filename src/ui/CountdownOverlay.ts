import Phaser from 'phaser';

type CountdownOptions = {
  start?: number;
  label?: string;
  x?: number;
  y?: number;
  onTick?: (value: number) => void;
  onComplete?: () => void;
};

/**
 * Reusable overlay countdown that can be dropped into any scene.
 * Renders a label + numeric countdown and invokes callbacks on tick/complete.
 */
export class CountdownOverlay {
  private scene: Phaser.Scene;
  private current: number;
  private labelText?: Phaser.GameObjects.Text;
  private countdownText?: Phaser.GameObjects.Text;
  private timer?: Phaser.Time.TimerEvent;
  private readonly opts: CountdownOptions;

  constructor(scene: Phaser.Scene, opts: CountdownOptions = {}) {
    this.scene = scene;
    this.opts = opts;
    this.current = typeof opts.start === 'number' ? opts.start : 3;

    const x = opts.x ?? scene.scale.width / 2;
    const y = opts.y ?? scene.scale.height * 0.5;

    if (opts.label) {
      this.labelText = scene.add.text(x, y - 40, opts.label, {
        fontFamily: 'Courier New',
        fontSize: '20px',
        color: '#ffeeaa'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);
    }

    this.countdownText = scene.add.text(x, y, '', {
      fontFamily: 'Courier New',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    this.tick();
  }

  private tick(): void {
    if (!this.countdownText) return;
    this.countdownText.setText(this.current > 0 ? this.current.toString() : 'GO!');
    this.opts.onTick?.(this.current);

    if (this.current <= 0) {
      this.scene.time.delayedCall(400, () => {
        this.opts.onComplete?.();
        this.destroy();
      });
      return;
    }

    this.current -= 1;
    this.timer = this.scene.time.delayedCall(1000, () => this.tick());
  }

  destroy(): void {
    this.timer?.remove(false);
    this.countdownText?.destroy();
    this.labelText?.destroy();
  }
}
