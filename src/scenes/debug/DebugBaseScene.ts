import Phaser from 'phaser';
import { LocalStorage } from '../../utils/localStorage';

export abstract class DebugBaseScene extends Phaser.Scene {
  protected gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  protected backButtonIndex!: number;
  protected prevBack: boolean = false;
  private inactivityTimer?: Phaser.Time.TimerEvent;
  private resetInactivityHandler?: () => void;

  protected initDebugBase(): void {
    const settings = LocalStorage.getSettings();
    this.backButtonIndex = settings.controllerBackButton!;

    if (this.input.gamepad && this.input.gamepad.total > 0) {
      this.gamepad = this.input.gamepad.getPad(0);
    }

    if (this.gamepad && this.gamepad.connected) {
      this.prevBack = !!this.gamepad.buttons[this.backButtonIndex]?.pressed;
    }

    this.startInactivityTimeout();
  }

  protected startExclusive(targetSceneKey: string): void {
    const scenes = this.scene.manager.getScenes(true) as Phaser.Scene[];
    scenes.forEach((s: Phaser.Scene) => {
      const key = s.scene.key;
      if (key !== targetSceneKey) {
        this.scene.stop(key);
      }
    });

    this.scene.start(targetSceneKey);
  }

  protected pollBackToDebugMenu(): void {
    if (!this.input.gamepad) return;

    if (!this.gamepad || !this.gamepad.connected) {
      this.gamepad = this.input.gamepad.getPad(0);
    }

    if (!this.gamepad || !this.gamepad.connected) return;

    const isBack = !!this.gamepad.buttons[this.backButtonIndex]?.pressed;
    if (isBack && !this.prevBack) {
      this.startExclusive('DebugMenuScene');
    }
    this.prevBack = isBack;
  }

  private startInactivityTimeout(): void {
    const reset = () => {
      this.inactivityTimer?.remove(false);
      this.inactivityTimer = this.time.delayedCall(60000, () => this.startExclusive('MenuScene'));
    };

    this.resetInactivityHandler = reset;
    this.input.on('pointerdown', reset);
    this.input.keyboard?.on('keydown', reset);
    this.input.gamepad?.on('down', reset);
    reset();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inactivityTimer?.remove(false);
      if (this.resetInactivityHandler) {
        this.input.off('pointerdown', this.resetInactivityHandler);
        this.input.keyboard?.off('keydown', this.resetInactivityHandler);
        this.input.gamepad?.off('down', this.resetInactivityHandler);
      }
    });
  }
}
