import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Thumbpad } from '../ui/Thumbpad';

/**
 * Touch Control Manager
 *
 * Manages touch input for mobile/tablet devices.
 * Provides virtual controls for player movement and shooting.
 */
export class TouchControlManager {
  private scene: Phaser.Scene;
  private enabled: boolean = false;

  // Touch input state
  private shootRequested: boolean = false;

  // Visual elements
  private thumbpad?: Thumbpad;
  private fireButton?: Phaser.GameObjects.Graphics;
  private fireButtonText?: Phaser.GameObjects.Text;

  // Button zones
  private fireZone?: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Auto-enable on touch devices
    this.enabled = this.isTouchDevice();

    if (this.enabled) {
      // Allow multiple simultaneous touches (thumbpad + fire)
      this.scene.input.addPointer(4);
      this.createTouchControls();
    }
  }

  /**
   * Detect if device supports touch
   */
  private isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Create visual touch controls
   */
  private createTouchControls(): void {
    const buttonY = GAME_HEIGHT - 100;
    const buttonAlpha = 0.3;

    // Left-handed thumbpad for movement
    const thumbpadX = 80;
    const thumbpadY = GAME_HEIGHT - 100;
    this.thumbpad = new Thumbpad(this.scene, thumbpadX, thumbpadY, 60);

    // Fire button (right side)
    this.fireButton = this.scene.add.graphics();
    this.fireButton.fillStyle(0xff0000, buttonAlpha);
    this.fireButton.fillCircle(GAME_WIDTH - 60, buttonY, 50);
    this.fireButton.lineStyle(2, 0xff0000, 0.8);
    this.fireButton.strokeCircle(GAME_WIDTH - 60, buttonY, 50);
    this.fireButton.setDepth(1000);
    this.fireButton.setScrollFactor(0);

    this.fireButtonText = this.scene.add.text(GAME_WIDTH - 60, buttonY, 'FIRE', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#ff0000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);

    this.fireZone = this.scene.add.zone(GAME_WIDTH - 60 - 50, buttonY - 50, 100, 100)
      .setOrigin(0)
      .setInteractive()
      .setScrollFactor(0);

    // Setup touch events
    this.setupTouchEvents();
  }

  /**
   * Setup touch event handlers
   */
  private setupTouchEvents(): void {
    // Fire button
    this.fireZone?.on('pointerdown', () => {
      this.shootRequested = true;
      this.highlightFireButton();
    });

    this.fireZone?.on('pointerup', () => {
      this.unhighlightFireButton();
    });

    this.fireZone?.on('pointerout', () => {
      this.unhighlightFireButton();
    });
  }

  /**
   * Highlight fire button on press
   */
  private highlightFireButton(): void {
    if (!this.fireButton) return;
    this.fireButton.clear();
    this.fireButton.fillStyle(0xff0000, 0.6);
    this.fireButton.fillCircle(GAME_WIDTH - 60, GAME_HEIGHT - 100, 50);
    this.fireButton.lineStyle(3, 0xff0000, 1);
    this.fireButton.strokeCircle(GAME_WIDTH - 60, GAME_HEIGHT - 100, 50);
  }

  /**
   * Unhighlight fire button on release
   */
  private unhighlightFireButton(): void {
    if (!this.fireButton) return;
    this.fireButton.clear();
    this.fireButton.fillStyle(0xff0000, 0.3);
    this.fireButton.fillCircle(GAME_WIDTH - 60, GAME_HEIGHT - 100, 50);
    this.fireButton.lineStyle(2, 0xff0000, 0.8);
    this.fireButton.strokeCircle(GAME_WIDTH - 60, GAME_HEIGHT - 100, 50);
  }

  /**
   * Get current movement direction from thumbpad
   * @returns -1 for left, 1 for right, 0 for none
   */
  getMoveDirection(): number {
    if (!this.thumbpad) return 0;
    const axis = this.thumbpad.getHorizontalAxis();

    // Convert analog input to digital direction
    if (axis < -0.3) return -1;
    if (axis > 0.3) return 1;
    return 0;
  }

  /**
   * Get thumbpad horizontal axis (analog -1 to 1)
   */
  getHorizontalAxis(): number {
    return this.thumbpad?.getHorizontalAxis() ?? 0;
  }

  /**
   * Get thumbpad vertical axis (analog -1 to 1)
   */
  getVerticalAxis(): number {
    return this.thumbpad?.getVerticalAxis() ?? 0;
  }

  /**
   * Get current drag X position (legacy, returns null)
   */
  getDragX(): number | null {
    return null;
  }

  /**
   * Check if shoot was requested and consume the request
   * @returns true if shoot was requested
   */
  consumeShootRequest(): boolean {
    if (this.shootRequested) {
      this.shootRequested = false;
      return true;
    }
    return false;
  }

  /**
   * Check if touch controls are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Show touch controls
   */
  show(): void {
    this.thumbpad?.setVisible(true);
    this.fireButton?.setVisible(true);
    this.fireButtonText?.setVisible(true);
  }

  /**
   * Hide touch controls
   */
  hide(): void {
    this.thumbpad?.setVisible(false);
    this.fireButton?.setVisible(false);
    this.fireButtonText?.setVisible(false);
  }

  /**
   * Clean up touch controls
   */
  destroy(): void {
    this.thumbpad?.destroy();
    this.fireButton?.destroy();
    this.fireButtonText?.destroy();
    this.fireZone?.destroy();
  }
}
