import Phaser from 'phaser';
import { ScoreManager } from '../managers/ScoreManager';
import { LocalStorage } from '../utils/localStorage';
import { GameMode } from '../types/GameMode';
import { DifficultyPreset } from '../types/DifficultyPreset';

/**
 * Game Over Scene
 *
 * Displays final score, high scores, and restart options.
 * Handles player input for returning to menu or restarting.
 *
 * Extends Phaser.Scene.
 */
export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private level: number = 1;
  private gameMode?: GameMode;
  private difficulty?: DifficultyPreset;
  private isHighScore: boolean = false;
  private scoreManager: ScoreManager | null = null;
  
  // UI elements
  private gameOverText: Phaser.GameObjects.Text | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private highScoreText: Phaser.GameObjects.Text | null = null;
  private restartButton: Phaser.GameObjects.Text | null = null;
  private menuButton: Phaser.GameObjects.Text | null = null;
  private selectedButton: number = 0;
  private buttons: Phaser.GameObjects.Text[] = [];

  // Input state
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevUp: boolean = false;
  private prevDown: boolean = false;
  private prevFire: boolean = false;
  private lastStickMove: number = 0;
  private fireButtonIndex: number = 0;
  private startButtonIndex: number = 11;
  private backButtonIndex: number = 10;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const settings = LocalStorage.getSettings();
    this.fireButtonIndex = settings.controllerFireButton ?? 0;
    this.startButtonIndex = settings.controllerStartButton ?? 11;
    this.backButtonIndex = settings.controllerBackButton ?? 10;

    // Get scene data from game scene (standardized format)
    const data = this.scene.settings.data as {
      score?: number;
      level?: number;
      gameMode?: GameMode;
      difficulty?: DifficultyPreset;
    };
    this.score = data.score || 0;
    this.level = data.level || 1;
    this.gameMode = data.gameMode;
    this.difficulty = data.difficulty;
    
    this.createBackground();
    this.createUI();
    this.setupInput();
    this.setupAnimations();
    
    // Initial gamepad check
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      this.gamepad = this.input.gamepad.getPad(0);
      
      // Initialize previous state to prevent immediate trigger if button is held
      if (this.gamepad) {
        const isFire = this.gamepad.buttons[this.fireButtonIndex]?.pressed || this.gamepad.buttons[this.startButtonIndex]?.pressed;
        const isBack = this.gamepad.buttons[this.backButtonIndex]?.pressed;
        this.prevFire = !!(isFire || isBack);
      }
    }
    
    // Add a small input lock delay
    this.input.enabled = false;
    this.time.delayedCall(500, () => {
      this.input.enabled = true;
    });

    // Setup shutdown event for cleanup
    this.events.on('shutdown', () => {
      this.cleanup();
    });
  }

  update(): void {
    this.handleGamepadInput();
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    
    // Add decorative elements
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.cameras.main.width;
      const y = Math.random() * this.cameras.main.height;
      const size = Math.random() * 1.5;
      
      this.add.circle(x, y, size, 0xff0000).setAlpha(0.3);
    }
  }

  private createUI(): void {
    const { width, height } = this.cameras.main;
    
    // Game Over title
    this.gameOverText = this.add.text(width / 2, height / 4, 'GAME OVER', {
      fontSize: '48px',
      fontFamily: 'Courier New',
      color: '#ff0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Check if high score
    this.scoreManager = new ScoreManager();
    this.scoreManager.addPoints(this.score);
    this.isHighScore = this.scoreManager.isHighScore();
    
    // Score display
    const scoreColor = this.isHighScore ? '#ffff00' : '#00ff00';
    this.scoreText = this.add.text(width / 2, height / 2 - 50, `FINAL SCORE: ${this.score}`, {
      fontSize: '32px',
      fontFamily: 'Courier New',
      color: scoreColor
    }).setOrigin(0.5);
    
    // High score indicator
    if (this.isHighScore) {
      this.highScoreText = this.add.text(width / 2, height / 2, 'NEW HIGH SCORE!', {
        fontSize: '24px',
        fontFamily: 'Courier New',
        color: '#ffff00'
      }).setOrigin(0.5);
    }
    
    // Level reached
    this.add.text(width / 2, height / 2 + 50, `Level Reached: ${this.level}`, {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);
    
    // Create buttons
    this.createButtons();
  }

  private createButtons(): void {
    const { width, height } = this.cameras.main;
    const buttonStyle = {
      fontSize: '24px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    };
    
    // Restart button
    this.restartButton = this.add.text(width / 2, height / 2 + 120, 'RESTART', buttonStyle)
      .setOrigin(0.5)
      .setInteractive();
    
    // Menu button
    this.menuButton = this.add.text(width / 2, height / 2 + 180, 'MAIN MENU', buttonStyle)
      .setOrigin(0.5)
      .setInteractive();
    
    this.buttons = [this.restartButton, this.menuButton];
    
    // Highlight first button
    this.updateButtonHighlight();
  }

  private setupInput(): void {
    // Keyboard controls
    this.input.keyboard?.on('keydown-UP', () => {
      this.selectedButton = (this.selectedButton - 1 + this.buttons.length) % this.buttons.length;
      this.updateButtonHighlight();
    });
    
    this.input.keyboard?.on('keydown-DOWN', () => {
      this.selectedButton = (this.selectedButton + 1) % this.buttons.length;
      this.updateButtonHighlight();
    });
    
    this.input.keyboard?.on('keydown-ENTER', () => {
      this.activateSelectedButton();
    });
    
    // Button click handlers
    this.restartButton?.on('pointerdown', () => {
      this.restartGame();
    });
    
    this.menuButton?.on('pointerdown', () => {
      this.returnToMenu();
    });
    
    // Button hover effects
    this.buttons.forEach((button, index) => {
      button.on('pointerover', () => {
        this.selectedButton = index;
        this.updateButtonHighlight();
      });
      
      button.on('pointerout', () => {
        button.setStyle({ color: '#00ff00' });
      });
    });
  }

  private handleGamepadInput(): void {
    if (!this.input.gamepad) return;
    
    // Refresh gamepad if needed
    if (!this.gamepad || !this.gamepad.connected) {
      this.gamepad = this.input.gamepad.getPad(0);
    }
    
    if (!this.gamepad || !this.gamepad.connected) return;

    const now = Date.now();
    const axisY = this.gamepad.axes[1].getValue();
    const dpadUp = this.gamepad.up;
    const dpadDown = this.gamepad.down;

    // Up
    const isUp = dpadUp || axisY < -0.5;
    if (isUp && !this.prevUp) {
      if (now - this.lastStickMove > 200) {
        this.selectedButton = (this.selectedButton - 1 + this.buttons.length) % this.buttons.length;
        this.updateButtonHighlight();
        this.lastStickMove = now;
      }
    }
    this.prevUp = isUp;

    // Down
    const isDown = dpadDown || axisY > 0.5;
    if (isDown && !this.prevDown) {
      if (now - this.lastStickMove > 200) {
        this.selectedButton = (this.selectedButton + 1) % this.buttons.length;
        this.updateButtonHighlight();
        this.lastStickMove = now;
      }
    }
    this.prevDown = isDown;

    const isFire = this.gamepad.buttons[this.fireButtonIndex]?.pressed || this.gamepad.buttons[this.startButtonIndex]?.pressed;
    const isBack = this.gamepad.buttons[this.backButtonIndex]?.pressed;
    if (isFire && !this.prevFire) {
      this.activateSelectedButton();
    } else if (isBack && !this.prevFire) {
      this.returnToMenu();
    }
    this.prevFire = !!(isFire || isBack);
  }

  private setupAnimations(): void {
    // Pulsing animation for game over text
    if (this.gameOverText) {
      this.tweens.add({
        targets: this.gameOverText,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Flash animation for high score
    if (this.isHighScore && this.highScoreText) {
      this.tweens.add({
        targets: this.highScoreText,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private updateButtonHighlight(): void {
    this.buttons.forEach((button, index) => {
      if (index === this.selectedButton) {
        button.setStyle({ color: '#ffff00' });
      } else {
        button.setStyle({ color: '#00ff00' });
      }
    });
  }

  private activateSelectedButton(): void {
    switch (this.selectedButton) {
      case 0:
        this.restartGame();
        break;
      case 1:
        this.returnToMenu();
        break;
    }
  }

  private restartGame(): void {
    // Restart game from webcam scene to capture fresh face
    this.scene.start('WebcamScene');
  }

  private returnToMenu(): void {
    // Return to main menu
    this.scene.start('MenuScene');
  }

  private cleanup(): void {
    // Clean up keyboard listeners
    this.input.keyboard?.removeAllKeys();
    
    // Clear references
    this.buttons = [];
    this.gameOverText = null;
    this.scoreText = null;
    this.highScoreText = null;
    this.restartButton = null;
    this.menuButton = null;
    this.scoreManager = null;
  }
}
