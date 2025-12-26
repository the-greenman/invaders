import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED } from '../../constants';
import { TouchControlManager } from '../../managers/TouchControlManager';

/**
 * Mobile Debug Scene
 *
 * Test scene for debugging touch controls and mobile input.
 * Displays a player sprite that can be controlled with touch thumbpad.
 * Shows real-time debug information about touch input state.
 */
export class MobileDebugScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Rectangle;
  private touchControlManager?: TouchControlManager;

  // Debug display
  private debugText?: Phaser.GameObjects.Text;
  private titleText?: Phaser.GameObjects.Text;

  // Input state
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'MobileDebugScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000033);

    // Title
    this.titleText = this.add.text(GAME_WIDTH / 2, 30, 'MOBILE TOUCH CONTROLS DEBUG', {
      fontSize: '24px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Instructions
    this.add.text(GAME_WIDTH / 2, 65,
      'Use thumbpad (left) to move | Fire button (right) to shoot | ESC to exit', {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Create player sprite
    this.createPlayer();

    // Create touch controls
    this.touchControlManager = new TouchControlManager(this);

    // Force enable for testing (even on desktop)
    if (!this.touchControlManager.isEnabled()) {
      console.log('[MobileDebugScene] Touch controls not auto-enabled. Creating manually for testing.');
      this.touchControlManager = this.createForcedTouchControls();
    }

    // Debug info display
    this.createDebugDisplay();

    // Keyboard input for desktop testing
    this.cursors = this.input.keyboard?.createCursorKeys();

    // Exit key
    this.input.keyboard?.on('keydown-ESC', () => this.exitScene());
  }

  update(): void {
    if (!this.player) return;

    this.updatePlayerMovement();
    this.updateDebugDisplay();
  }

  private createPlayer(): void {
    // Create a simple colored rectangle as player
    this.player = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      0x00ff00
    );

    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setDrag(800, 0); // Add drag for smooth stopping
  }

  private createDebugDisplay(): void {
    this.debugText = this.add.text(20, 100, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#00ffff',
      lineSpacing: 6,
      backgroundColor: '#000000',
      padding: { x: 10, y: 10 }
    });
  }

  private updatePlayerMovement(): void {
    if (!this.player || !this.touchControlManager) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let moveX = 0;

    // Touch/thumbpad input
    const horizontalAxis = this.touchControlManager.getHorizontalAxis();
    if (Math.abs(horizontalAxis) > 0.1) {
      moveX = horizontalAxis;
    }

    // Keyboard fallback for desktop testing
    if (this.cursors) {
      if (this.cursors.left.isDown) moveX = -1;
      else if (this.cursors.right.isDown) moveX = 1;
    }

    // Apply velocity
    body.setVelocityX(moveX * PLAYER_SPEED);

    // Check for shoot
    if (this.touchControlManager.consumeShootRequest()) {
      this.handleShoot();
    }

    // Keyboard shoot for desktop testing
    if (this.input.keyboard?.checkDown(this.input.keyboard.addKey('SPACE'), 200)) {
      this.handleShoot();
    }
  }

  private handleShoot(): void {
    if (!this.player) return;

    // Visual feedback - flash the player
    this.player.setFillStyle(0xffff00);
    this.time.delayedCall(100, () => {
      this.player?.setFillStyle(0x00ff00);
    });

    // Create a simple bullet effect
    const bullet = this.add.circle(this.player.x, this.player.y - 20, 4, 0xffff00);
    this.physics.add.existing(bullet);
    const bulletBody = bullet.body as Phaser.Physics.Arcade.Body;
    bulletBody.setVelocityY(-400);

    // Destroy bullet after 2 seconds
    this.time.delayedCall(2000, () => bullet.destroy());
  }

  private updateDebugDisplay(): void {
    if (!this.debugText || !this.touchControlManager || !this.player) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const horizontalAxis = this.touchControlManager.getHorizontalAxis();
    const verticalAxis = this.touchControlManager.getVerticalAxis();
    const moveDirection = this.touchControlManager.getMoveDirection();

    const debugInfo = [
      'TOUCH CONTROL STATE:',
      `Enabled: ${this.touchControlManager.isEnabled() ? 'YES' : 'NO'}`,
      '',
      'THUMBPAD:',
      `Horizontal Axis: ${horizontalAxis.toFixed(2)}`,
      `Vertical Axis: ${verticalAxis.toFixed(2)}`,
      `Move Direction: ${moveDirection === -1 ? 'LEFT' : moveDirection === 1 ? 'RIGHT' : 'NONE'}`,
      '',
      'PLAYER:',
      `Position: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`,
      `Velocity: (${Math.round(body.velocity.x)}, ${Math.round(body.velocity.y)})`,
      '',
      'POINTERS:',
      `Pointer Down: ${this.input.activePointer.isDown ? 'YES' : 'NO'}`,
      `Pointer Pos: (${Math.round(this.input.activePointer.x)}, ${Math.round(this.input.activePointer.y)})`
    ];

    this.debugText.setText(debugInfo.join('\n'));
  }

  /**
   * Force create touch controls for desktop testing
   * This bypasses the touch device detection
   */
  private createForcedTouchControls(): TouchControlManager {
    // Create a mock that forces enabled state
    const manager = new TouchControlManager(this);
    // Access private field via type assertion for testing
    (manager as any).enabled = true;
    (manager as any).createTouchControls();
    return manager;
  }

  private exitScene(): void {
    this.touchControlManager?.destroy();
    this.scene.start('DebugMenuScene');
  }

  shutdown(): void {
    this.touchControlManager?.destroy();
    this.input.keyboard?.removeAllKeys();
  }
}
