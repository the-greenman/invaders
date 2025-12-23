import Phaser from 'phaser';

/**
 * Menu Scene
 *
 * Main menu interface with game title, options, and navigation.
 * Handles user input for starting the game or accessing other features.
 *
 * Extends Phaser.Scene.
 */
export class MenuScene extends Phaser.Scene {
  private titleText: Phaser.GameObjects.Text | null = null;
  private startButton: Phaser.GameObjects.Text | null = null;
  private webcamButton: Phaser.GameObjects.Text | null = null;
  private creditsButton: Phaser.GameObjects.Text | null = null;
  private selectedButton: number = 0;
  private buttons: Phaser.GameObjects.Text[] = [];
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevFirePressed: boolean = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  preload(): void {
    // Menu assets are already loaded in PreloaderScene
  }

  create(): void {
    this.createBackground();
    this.createTitle();
    this.createButtons();
    this.setupKeyboardControls();
    this.setupButtonAnimations();
    
    // Setup shutdown event for cleanup
    this.events.on('shutdown', () => {
      this.cleanup();
    });
  }

  update(): void {
    // Handle menu animations and input
    this.updateButtonSelection();
  }

  private createBackground(): void {
    // Create starfield background
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    
    // Add some decorative stars
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * this.cameras.main.width;
      const y = Math.random() * this.cameras.main.height;
      const size = Math.random() * 2;
      const brightness = Math.random() * 0.8 + 0.2;
      
      this.add.circle(x, y, size, 0xffffff * brightness).setAlpha(brightness);
    }
  }

  private createTitle(): void {
    const { width, height } = this.cameras.main;
    
    this.titleText = this.add.text(width / 2, height / 4, 'CLASS INVADERS', {
      fontSize: '48px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Add pulsing animation to title
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
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

    // Primary entry: always webcam first
    this.webcamButton = this.add.text(width / 2, height / 2, 'START GAME', buttonStyle)
      .setOrigin(0.5)
      .setInteractive();
    
    // Credits button
    this.creditsButton = this.add.text(width / 2, height / 2 + 80, 'CREDITS', buttonStyle)
      .setOrigin(0.5)
      .setInteractive();

    // Debug button
    const debugButton = this.add.text(width / 2, height / 2 + 140, 'DEBUG', buttonStyle)
      .setOrigin(0.5)
      .setInteractive();

    this.buttons = [this.webcamButton, this.creditsButton, debugButton];
  }

  private setupKeyboardControls(): void {
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

    // Quick access to Debug Menu
    this.input.keyboard?.on('keydown-D', () => {
      this.scene.start('DebugMenuScene');
    });

    // Gamepad support (fire to start webcam)
    this.input.gamepad?.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepad = pad;
    });
  }

  private setupButtonAnimations(): void {
    this.buttons.forEach((button, index) => {
      button.on('pointerover', () => {
        this.selectedButton = index;
        this.updateButtonHighlight();
      });

      button.on('pointerout', () => {
        button.setStyle({ color: '#00ff00' });
      });

      button.on('pointerdown', () => {
        this.activateSelectedButton();
      });
    });

    // Initial highlight
    this.updateButtonHighlight();
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

  private updateButtonSelection(): void {
    // Gamepad polling for fire to start webcam
    if (this.gamepad && !this.gamepad.connected) {
      this.gamepad = null;
    }
    const firePressed = this.gamepad
      ? (this.gamepad.A || this.gamepad.buttons[0]?.pressed)
      : false;
    if (firePressed && !this.prevFirePressed) {
      this.openWebcam();
    }
    this.prevFirePressed = firePressed;
  }

  private activateSelectedButton(): void {
    switch (this.selectedButton) {
      case 0: // Webcam-first Start
        this.openWebcam();
        break;
      case 1: // Credits
        this.showCredits();
        break;
      case 2: // Debug
        this.scene.start('DebugMenuScene');
        break;
    }
  }

  private openWebcam(): void {
    // Open webcam scene for face capture
    this.scene.start('WebcamScene');
  }

  private showCredits(): void {
    // Show credits (could be a simple text overlay or separate scene)
    this.showCreditsOverlay();
  }

  private showCreditsOverlay(): void {
    const { width, height } = this.cameras.main;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, width, height);
    
    const creditsText = this.add.text(width / 2, height / 2, 
      'CLASS INVADERS\n\nCreated with Phaser.js\nFace Detection by MediaPipe\n\n© 2024\n\nPress ESC to return', 
      {
        fontSize: '20px',
        fontFamily: 'Courier New',
        color: '#00ff00',
        align: 'center'
      }).setOrigin(0.5);
    
    const escKey = this.input.keyboard?.addKey('ESC');
    escKey?.once('down', () => {
      overlay.destroy();
      creditsText.destroy();
    });
  }

  private cleanup(): void {
    // Clean up keyboard listeners
    this.input.keyboard?.removeAllKeys();
    
    // Clear references
    this.buttons = [];
    this.titleText = null;
    this.startButton = null;
    this.webcamButton = null;
    this.creditsButton = null;
  }
}
