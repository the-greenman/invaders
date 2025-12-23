import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

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
  private moveDirection: number = 0; // -1 for left, 1 for right, 0 for none
  private shootRequested: boolean = false;
  private dragX: number | null = null;
  private dragPointerId: number | null = null;

  // Visual elements
  private leftButton?: Phaser.GameObjects.Graphics;
  private rightButton?: Phaser.GameObjects.Graphics;
  private fireButton?: Phaser.GameObjects.Graphics;
  private leftButtonText?: Phaser.GameObjects.Text;
  private rightButtonText?: Phaser.GameObjects.Text;
  private fireButtonText?: Phaser.GameObjects.Text;

  // Button zones
  private leftZone?: Phaser.GameObjects.Zone;
  private rightZone?: Phaser.GameObjects.Zone;
  private fireZone?: Phaser.GameObjects.Zone;
  private pointerDownHandler?: (pointer: Phaser.Input.Pointer) => void;
  private pointerMoveHandler?: (pointer: Phaser.Input.Pointer) => void;
  private pointerUpHandler?: (pointer: Phaser.Input.Pointer) => void;

  // Touch state tracking
  private activeTouches: Map<number, { zone: 'left' | 'right' | 'fire' }> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Auto-enable on touch devices
    this.enabled = this.isTouchDevice();

    if (this.enabled) {
      this.createTouchControls();
      this.disableDirectionalButtons();
      this.setupDragControls();
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
    const buttonSize = 80;
    const buttonY = GAME_HEIGHT - 100;
    const buttonAlpha = 0.3;
    const buttonColor = 0x00ff00;

    // Left button
    this.leftButton = this.scene.add.graphics();
    this.leftButton.fillStyle(buttonColor, buttonAlpha);
    this.leftButton.fillRoundedRect(20, buttonY - buttonSize / 2, buttonSize, buttonSize, 10);
    this.leftButton.lineStyle(2, buttonColor, 0.8);
    this.leftButton.strokeRoundedRect(20, buttonY - buttonSize / 2, buttonSize, buttonSize, 10);
    this.leftButton.setDepth(1000);
    this.leftButton.setScrollFactor(0);

    this.leftButtonText = this.scene.add.text(20 + buttonSize / 2, buttonY, '◄', {
      fontSize: '40px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);

    this.leftZone = this.scene.add.zone(20, buttonY - buttonSize / 2, buttonSize, buttonSize)
      .setOrigin(0)
      .setInteractive()
      .setScrollFactor(0);

    // Right button
    this.rightButton = this.scene.add.graphics();
    this.rightButton.fillStyle(buttonColor, buttonAlpha);
    this.rightButton.fillRoundedRect(120, buttonY - buttonSize / 2, buttonSize, buttonSize, 10);
    this.rightButton.lineStyle(2, buttonColor, 0.8);
    this.rightButton.strokeRoundedRect(120, buttonY - buttonSize / 2, buttonSize, buttonSize, 10);
    this.rightButton.setDepth(1000);
    this.rightButton.setScrollFactor(0);

    this.rightButtonText = this.scene.add.text(120 + buttonSize / 2, buttonY, '►', {
      fontSize: '40px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);

    this.rightZone = this.scene.add.zone(120, buttonY - buttonSize / 2, buttonSize, buttonSize)
      .setOrigin(0)
      .setInteractive()
      .setScrollFactor(0);

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
   * Disable on-screen left/right controls if drag is preferred
   */
  private disableDirectionalButtons(): void {
    this.leftButton?.setVisible(false);
    this.rightButton?.setVisible(false);
    this.leftButtonText?.setVisible(false);
    this.rightButtonText?.setVisible(false);
    this.leftZone?.disableInteractive();
    this.rightZone?.disableInteractive();
  }

  /**
   * Enable drag anywhere to move horizontally
   */
  private setupDragControls(): void {
    this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.dragPointerId === null) {
        this.dragPointerId = pointer.id;
        this.dragX = pointer.x;
      }
    };

    this.pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.dragPointerId === pointer.id) {
        this.dragX = pointer.x;
      }
    };

    this.pointerUpHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.dragPointerId === pointer.id) {
        this.dragPointerId = null;
        this.dragX = null;
      }
    };

    this.scene.input.on('pointerdown', this.pointerDownHandler);
    this.scene.input.on('pointermove', this.pointerMoveHandler);
    this.scene.input.on('pointerup', this.pointerUpHandler);
    this.scene.input.on('pointerupoutside', this.pointerUpHandler);
  }

  /**
   * Setup touch event handlers
   */
  private setupTouchEvents(): void {
    // Left button
    this.leftZone?.on('pointerdown', () => {
      this.moveDirection = -1;
      this.highlightButton(this.leftButton!);
    });

    this.leftZone?.on('pointerup', () => {
      this.moveDirection = 0;
      this.unhighlightButton(this.leftButton!);
    });

    this.leftZone?.on('pointerout', () => {
      this.moveDirection = 0;
      this.unhighlightButton(this.leftButton!);
    });

    // Right button
    this.rightZone?.on('pointerdown', () => {
      this.moveDirection = 1;
      this.highlightButton(this.rightButton!);
    });

    this.rightZone?.on('pointerup', () => {
      this.moveDirection = 0;
      this.unhighlightButton(this.rightButton!);
    });

    this.rightZone?.on('pointerout', () => {
      this.moveDirection = 0;
      this.unhighlightButton(this.rightButton!);
    });

    // Fire button
    this.fireZone?.on('pointerdown', () => {
      this.shootRequested = true;
      this.highlightButton(this.fireButton!, 0xff0000);
    });

    this.fireZone?.on('pointerup', () => {
      this.unhighlightButton(this.fireButton!, 0xff0000);
    });

    this.fireZone?.on('pointerout', () => {
      this.unhighlightButton(this.fireButton!, 0xff0000);
    });
  }

  /**
   * Highlight button on press
   */
  private highlightButton(button: Phaser.GameObjects.Graphics, color: number = 0x00ff00): void {
    button.clear();
    button.fillStyle(color, 0.6);

    if (button === this.leftButton) {
      button.fillRoundedRect(20, GAME_HEIGHT - 100 - 40, 80, 80, 10);
      button.lineStyle(3, color, 1);
      button.strokeRoundedRect(20, GAME_HEIGHT - 100 - 40, 80, 80, 10);
    } else if (button === this.rightButton) {
      button.fillRoundedRect(120, GAME_HEIGHT - 100 - 40, 80, 80, 10);
      button.lineStyle(3, color, 1);
      button.strokeRoundedRect(120, GAME_HEIGHT - 100 - 40, 80, 80, 10);
    } else if (button === this.fireButton) {
      button.fillCircle(GAME_WIDTH - 60, GAME_HEIGHT - 100, 50);
      button.lineStyle(3, color, 1);
      button.strokeCircle(GAME_WIDTH - 60, GAME_HEIGHT - 100, 50);
    }
  }

  /**
   * Unhighlight button on release
   */
  private unhighlightButton(button: Phaser.GameObjects.Graphics, color: number = 0x00ff00): void {
    button.clear();
    button.fillStyle(color, 0.3);

    if (button === this.leftButton) {
      button.fillRoundedRect(20, GAME_HEIGHT - 100 - 40, 80, 80, 10);
      button.lineStyle(2, color, 0.8);
      button.strokeRoundedRect(20, GAME_HEIGHT - 100 - 40, 80, 80, 10);
    } else if (button === this.rightButton) {
      button.fillRoundedRect(120, GAME_HEIGHT - 100 - 40, 80, 80, 10);
      button.lineStyle(2, color, 0.8);
      button.strokeRoundedRect(120, GAME_HEIGHT - 100 - 40, 80, 80, 10);
    } else if (button === this.fireButton) {
      button.fillCircle(GAME_WIDTH - 60, GAME_HEIGHT - 100, 50);
      button.lineStyle(2, color, 0.8);
      button.strokeCircle(GAME_WIDTH - 60, GAME_HEIGHT - 100, 50);
    }
  }

  /**
   * Get current movement direction
   * @returns -1 for left, 1 for right, 0 for none
   */
  getMoveDirection(): number {
    return this.moveDirection;
  }

  /**
   * Get current drag X position (if dragging)
   */
  getDragX(): number | null {
    return this.dragX;
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
    this.leftButton?.setVisible(true);
    this.rightButton?.setVisible(true);
    this.fireButton?.setVisible(true);
    this.leftButtonText?.setVisible(true);
    this.rightButtonText?.setVisible(true);
    this.fireButtonText?.setVisible(true);
  }

  /**
   * Hide touch controls
   */
  hide(): void {
    this.leftButton?.setVisible(false);
    this.rightButton?.setVisible(false);
    this.fireButton?.setVisible(false);
    this.leftButtonText?.setVisible(false);
    this.rightButtonText?.setVisible(false);
    this.fireButtonText?.setVisible(false);
  }

  /**
   * Clean up touch controls
   */
  destroy(): void {
    if (this.pointerDownHandler) this.scene.input.off('pointerdown', this.pointerDownHandler);
    if (this.pointerMoveHandler) this.scene.input.off('pointermove', this.pointerMoveHandler);
    if (this.pointerUpHandler) {
      this.scene.input.off('pointerup', this.pointerUpHandler);
      this.scene.input.off('pointerupoutside', this.pointerUpHandler);
    }
    this.leftButton?.destroy();
    this.rightButton?.destroy();
    this.fireButton?.destroy();
    this.leftButtonText?.destroy();
    this.rightButtonText?.destroy();
    this.fireButtonText?.destroy();
    this.leftZone?.destroy();
    this.rightZone?.destroy();
    this.fireZone?.destroy();
    this.activeTouches.clear();
  }
}
