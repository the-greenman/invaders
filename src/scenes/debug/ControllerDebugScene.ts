import Phaser from 'phaser';
import { LocalStorage } from '../../utils/localStorage';

/**
 * Controller Debug Scene
 *
 * Shows connected gamepad status (axes, buttons) and lets you test inputs.
 * ESC returns to Debug Menu.
 */
export class ControllerDebugScene extends Phaser.Scene {
  private infoText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;
  private buttonIndicators: Phaser.GameObjects.Rectangle[] = [];
  private buttonTexts: Phaser.GameObjects.Text[] = [];
  private axisIndicators: Phaser.GameObjects.Rectangle[] = [];
  private axisTexts: Phaser.GameObjects.Text[] = [];
  private prevButtons: boolean[] = [];
  private awaitingFireBind: boolean = false;
  private awaitingBackBind: boolean = false;
  private awaitingStartBind: boolean = false;
  private fireButtonIndex: number = 0;
  private backButtonIndex: number = 1;
  private startButtonIndex: number = 11;

  private actionTexts: Phaser.GameObjects.Text[] = [];
  private selectedActionIndex: number = 0;
  private lastNavTime: number = 0;

  private prevUp: boolean = false;
  private prevDown: boolean = false;
  private prevSelect: boolean = false;
  private prevBack: boolean = false;

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

    this.helpText = this.add.text(20, 90, 'DPad/Stick: select option | A: bind/select | BACK: cancel/exit', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#ffffff'
    });

    const settings = LocalStorage.getSettings();
    this.fireButtonIndex = settings.controllerFireButton ?? 0;
    this.backButtonIndex = settings.controllerBackButton ?? 10;
    this.startButtonIndex = settings.controllerStartButton ?? 11;

    this.infoText = this.add.text(20, 130, `Waiting... FIRE:B${this.fireButtonIndex} BACK:B${this.backButtonIndex} START:B${this.startButtonIndex}`, {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#00ffff'
    });

    this.createActions(width);

    // Create visual indicators
    this.createVisuals();

    // Setup listener
    if (this.input.gamepad) {
      this.pad = this.input.gamepad.gamepads.find(p => p && p.connected) || null;
      
      this.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        this.pad = pad;
        this.infoText.setText(`Controller Connected: ${pad.id} | FIRE: B${this.fireButtonIndex}`);
      });
      
      this.input.gamepad.on('disconnected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        if (this.pad === pad) {
          this.pad = null;
          this.infoText.setText('Controller Disconnected');
        }
      });
    }

    // Seed state so held buttons don't instantly trigger an action on entry
    if (this.pad && this.pad.connected) {
      this.prevButtons = this.pad.buttons.map(b => b.pressed);
      this.prevBack = !!this.pad.buttons[this.backButtonIndex]?.pressed;
      this.prevSelect = !!(this.pad.A || this.pad.buttons[0]?.pressed);
    }

    this.events.on('shutdown', () => {
      this.input.keyboard?.removeAllListeners();
      if (this.input.gamepad) {
        this.input.gamepad.removeAllListeners();
      }
    });
  }

  private startExclusive(targetSceneKey: string): void {
    const scenes = this.scene.manager.getScenes(true) as Phaser.Scene[];
    scenes.forEach((s: Phaser.Scene) => {
      const key = s.scene.key;
      if (key !== targetSceneKey) {
        this.scene.stop(key);
      }
    });

    this.scene.start(targetSceneKey);
  }

  private createActions(width: number): void {
    const startY = 160;
    const spacing = 26;
    const entries = ['Bind FIRE', 'Bind BACK', 'Bind START', 'Exit'];

    entries.forEach((label, i) => {
      const t = this.add.text(width - 20, startY + i * spacing, label, {
        fontSize: '16px',
        fontFamily: 'Courier New',
        color: '#ffffff'
      }).setOrigin(1, 0);
      this.actionTexts.push(t);
    });

    this.updateActionHighlight();
  }

  private updateActionHighlight(): void {
    this.actionTexts.forEach((t, i) => {
      const selected = i === this.selectedActionIndex;
      t.setColor(selected ? '#ffff00' : '#ffffff');
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
      this.prevButtons = [];
      return;
    }

    this.handleControllerUI();

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

    // Binding detection
    this.detectBinding();

    // Info text
    this.infoText.setText(`Connected: ${this.pad.id} | FIRE:B${this.fireButtonIndex}${this.awaitingFireBind ? ' (bind...)' : ''} | BACK:B${this.backButtonIndex}${this.awaitingBackBind ? ' (bind...)' : ''} | START:B${this.startButtonIndex}${this.awaitingStartBind ? ' (bind...)' : ''}`);
  }

  private handleControllerUI(): void {
    if (!this.pad) return;

    const now = this.time.now;

    const axisY = this.pad.axes.length > 1 ? this.pad.axes[1].getValue() : 0;
    const up = this.pad.up || axisY < -0.5;
    const down = this.pad.down || axisY > 0.5;

    const select = !!(this.pad.A || this.pad.buttons[0]?.pressed);
    const back = !!this.pad.buttons[this.backButtonIndex]?.pressed;

    // Back: cancel binding or exit
    if (back && !this.prevBack) {
      if (this.awaitingFireBind || this.awaitingBackBind || this.awaitingStartBind) {
        this.awaitingFireBind = false;
        this.awaitingBackBind = false;
        this.awaitingStartBind = false;
      } else {
        this.startExclusive('DebugMenuScene');
        this.prevBack = back;
        this.prevSelect = select;
        return;
      }
    }

    // Navigation (disabled while binding)
    if (!this.awaitingFireBind && !this.awaitingBackBind && !this.awaitingStartBind) {
      if (now - this.lastNavTime > 200) {
        if (up && !this.prevUp) {
          this.selectedActionIndex = (this.selectedActionIndex - 1 + this.actionTexts.length) % this.actionTexts.length;
          this.updateActionHighlight();
          this.lastNavTime = now;
        } else if (down && !this.prevDown) {
          this.selectedActionIndex = (this.selectedActionIndex + 1) % this.actionTexts.length;
          this.updateActionHighlight();
          this.lastNavTime = now;
        }
      }

      // Select
      if (select && !this.prevSelect) {
        this.activateSelectedAction();
      }
    }

    this.prevUp = up;
    this.prevDown = down;
    this.prevSelect = select;
    this.prevBack = back;
  }

  private activateSelectedAction(): void {
    switch (this.selectedActionIndex) {
      case 0:
        this.beginFireBind();
        break;
      case 1:
        this.beginBackBind();
        break;
      case 2:
        this.beginStartBind();
        break;
      case 3:
      default:
        this.startExclusive('DebugMenuScene');
        break;
    }
  }

  private beginFireBind(): void {
    this.awaitingFireBind = true;
  }

  private beginBackBind(): void {
    this.awaitingBackBind = true;
  }

  private beginStartBind(): void {
    this.awaitingStartBind = true;
  }

  private detectBinding(): void {
    if (!this.pad) return;
    const current = this.pad.buttons.map(b => b.pressed);
    if (this.awaitingFireBind || this.awaitingBackBind || this.awaitingStartBind) {
      for (let i = 0; i < current.length; i++) {
        const pressed = current[i];
        const prev = this.prevButtons[i] || false;
        if (pressed && !prev) {
          const settings = LocalStorage.getSettings();
          if (this.awaitingFireBind) {
            this.fireButtonIndex = i;
            // clear collisions
            if (this.backButtonIndex === i) this.backButtonIndex = -1;
            if (this.startButtonIndex === i) this.startButtonIndex = -1;
            LocalStorage.saveSettings({ ...settings, controllerFireButton: i, controllerBackButton: this.backButtonIndex, controllerStartButton: this.startButtonIndex });
            this.awaitingFireBind = false;
          } else if (this.awaitingBackBind) {
            this.backButtonIndex = i;
            if (this.fireButtonIndex === i) this.fireButtonIndex = -1;
            if (this.startButtonIndex === i) this.startButtonIndex = -1;
            LocalStorage.saveSettings({ ...settings, controllerFireButton: this.fireButtonIndex, controllerBackButton: i, controllerStartButton: this.startButtonIndex });
            this.awaitingBackBind = false;
          } else if (this.awaitingStartBind) {
            this.startButtonIndex = i;
            if (this.fireButtonIndex === i) this.fireButtonIndex = -1;
            if (this.backButtonIndex === i) this.backButtonIndex = -1;
            LocalStorage.saveSettings({ ...settings, controllerFireButton: this.fireButtonIndex, controllerBackButton: this.backButtonIndex, controllerStartButton: i });
            this.awaitingStartBind = false;
          }
          break;
        }
      }
    }
    this.prevButtons = current;
  }
}
