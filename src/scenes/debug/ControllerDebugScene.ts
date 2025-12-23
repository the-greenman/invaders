import Phaser from 'phaser';

/**
 * Controller Debug Scene
 *
 * Shows connected gamepad status (axes, buttons) and lets you test inputs.
 * ESC returns to Debug Menu.
 */
export class ControllerDebugScene extends Phaser.Scene {
  private infoText!: Phaser.GameObjects.Text;
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;

  constructor() {
    super({ key: 'ControllerDebugScene' });
  }

  create(): void {
    const { width } = this.cameras.main;
    this.add.text(width / 2, 50, 'CONTROLLER DEBUG', {
      fontSize: '28px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 90, 'Move sticks / press buttons. ESC: Back to Debug Menu', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#ffffff'
    });

    this.infoText = this.add.text(20, 130, 'Waiting for controller...', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#00ffff'
    });

    // Capture first connected pad
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      this.pad = this.input.gamepad.gamepads.find(p => p && p.connected) as Phaser.Input.Gamepad.Gamepad | null;
    }

    this.input.gamepad?.once('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.pad = pad;
    });

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('DebugMenuScene'));

    this.events.on('shutdown', () => {
      this.input.keyboard?.removeAllListeners();
    });
  }

  update(): void {
    if (!this.pad || !this.pad.connected) {
      this.infoText.setText('No controller connected. Plug in or press a button.');
      return;
    }

    const axes = this.pad.axes.map(a => a.getValue().toFixed(2));
    const buttons = this.pad.buttons
      .map((b, idx) => `${idx}:${b.pressed ? '1' : '0'}${b.value !== 0 && !b.pressed ? `(${b.value.toFixed(2)})` : ''}`)
      .join(' ');

    const dpad = [
      this.pad.left ? 'L' : '',
      this.pad.right ? 'R' : '',
      this.pad.up ? 'U' : '',
      this.pad.down ? 'D' : ''
    ].filter(Boolean).join('');

    this.infoText.setText([
      `ID: ${this.pad.id}`,
      `Axes (${axes.length}): ${axes.join(' | ')}`,
      `Buttons (${this.pad.buttons.length}): ${buttons}`,
      `DPad: ${dpad || 'none'}`
    ]);
  }
}
