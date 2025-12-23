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
  private buttonIndicators: Phaser.GameObjects.Rectangle[] = [];
  private buttonTexts: Phaser.GameObjects.Text[] = [];
  private axisIndicators: Phaser.GameObjects.Rectangle[] = [];
  private axisTexts: Phaser.GameObjects.Text[] = [];

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

    // Create visual indicators
    this.createVisuals();

    // Setup listener
    if (this.input.gamepad) {
      this.pad = this.input.gamepad.gamepads.find(p => p && p.connected) || null;
      
      this.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        this.pad = pad;
        this.infoText.setText(`Controller Connected: ${pad.id}`);
      });
      
      this.input.gamepad.on('disconnected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        if (this.pad === pad) {
          this.pad = null;
          this.infoText.setText('Controller Disconnected');
        }
      });
    }

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('DebugMenuScene'));

    this.events.on('shutdown', () => {
      this.input.keyboard?.removeAllListeners();
      if (this.input.gamepad) {
        this.input.gamepad.removeAllListeners();
      }
    });
  }

  private createVisuals(): void {
    // Buttons grid
    const startX = 50;
    const startY = 200;
    const spacing = 40;
    
    // Create 16 potential button indicators
    for (let i = 0; i < 16; i++) {
      const x = startX + (i % 8) * spacing;
      const y = startY + Math.floor(i / 8) * spacing;
      
      const rect = this.add.rectangle(x, y, 30, 30, 0x333333);
      rect.setStrokeStyle(1, 0xffffff);
      this.buttonIndicators.push(rect);
      
      const text = this.add.text(x, y, `B${i}`, {
        fontSize: '10px',
        color: '#ffffff'
      }).setOrigin(0.5);
      this.buttonTexts.push(text);
    }

    // Axis bars
    const axisY = 320;
    for (let i = 0; i < 4; i++) {
      const y = axisY + i * 40;
      
      this.add.text(50, y, `Axis ${i}:`, { fontSize: '14px', color: '#ffffff' }).setOrigin(0, 0.5);
      
      // Background bar
      this.add.rectangle(200, y, 200, 20, 0x333333).setStrokeStyle(1, 0x666666);
      
      // Value indicator
      const indicator = this.add.rectangle(200, y, 10, 20, 0x00ff00);
      this.axisIndicators.push(indicator);
      
      const valText = this.add.text(320, y, '0.00', { fontSize: '14px', color: '#ffffff' });
      this.axisTexts.push(valText);
    }
  }

  update(): void {
    if (!this.pad || !this.pad.connected) {
      // Clear visuals
      this.buttonIndicators.forEach(b => b.setFillStyle(0x333333));
      this.axisIndicators.forEach(a => a.x = 200);
      this.axisTexts.forEach(t => t.setText('0.00'));
      return;
    }

    // Update buttons
    this.pad.buttons.forEach((button, index) => {
      if (index < this.buttonIndicators.length) {
        const rect = this.buttonIndicators[index];
        if (button.pressed) {
          rect.setFillStyle(0x00ff00);
        } else {
          // Show analog value for triggers if non-zero
          const val = button.value;
          if (val > 0) {
            rect.setFillStyle(0x00ff00, val * 0.5);
          } else {
            rect.setFillStyle(0x333333);
          }
        }
      }
    });

    // Update axes
    this.pad.axes.forEach((axis, index) => {
      if (index < this.axisIndicators.length) {
        const value = axis.getValue();
        const indicator = this.axisIndicators[index];
        const text = this.axisTexts[index];
        
        // Map -1..1 to 100..300 (200 center)
        indicator.x = 200 + (value * 100);
        text.setText(value.toFixed(2));
      }
    });

    // Info text
    this.infoText.setText(`Connected: ${this.pad.id}`);
  }
}
