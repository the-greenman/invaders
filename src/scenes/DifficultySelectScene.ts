import Phaser from 'phaser';
import { DifficultyPreset, getDifficultyName } from '../types/DifficultyPreset';
import { GameMode } from '../types/GameMode';
import { LocalStorage } from '../utils/localStorage';
import { KonamiCode, KonamiInput } from '../utils/KonamiCode';

/**
 * Difficulty Selection Scene
 * 
 * Allows players to select difficulty before starting the game.
 * Directly starts the game with the selected difficulty.
 * Supports both keyboard and controller navigation.
 */
export class DifficultySelectScene extends Phaser.Scene {
  private selectedDifficulty: DifficultyPreset = DifficultyPreset.MEDIUM;
  private selectedIndex: number = 1; // Default to MEDIUM (index 1)
  private difficultyTexts: Phaser.GameObjects.Text[] = [];
  private descriptions: { [key in DifficultyPreset]: string } = {
    [DifficultyPreset.EASY]: 'Slower enemies, fewer bombs, more points',
    [DifficultyPreset.MEDIUM]: 'Balanced gameplay for everyone',
    [DifficultyPreset.HARD]: 'Fast enemies, many bombs, expert players',
    [DifficultyPreset.EXTREME]: 'Maximum challenge, are you ready?'
  };
  
  // Controller support
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevUpPressed: boolean = false;
  private prevDownPressed: boolean = false;
  private prevAPressed: boolean = false;
  private prevBPressed: boolean = false;
  private fireButtonIndex!: number;
  private backButtonIndex!: number;
  private startButtonIndex!: number;

  private upKey: Phaser.Input.Keyboard.Key | undefined;
  private downKey: Phaser.Input.Keyboard.Key | undefined;
  private enterKey: Phaser.Input.Keyboard.Key | undefined;
  private escKey: Phaser.Input.Keyboard.Key | undefined;
  private bKey: Phaser.Input.Keyboard.Key | undefined;
  private aKey: Phaser.Input.Keyboard.Key | undefined;

  // Konami Code easter egg (1 second timeout)
  private konamiCode: KonamiCode = new KonamiCode(1000);
  private konamiText: Phaser.GameObjects.Text | null = null;
  private prevLeftPressed: boolean = false;
  private prevRightPressed: boolean = false;

  constructor() {
    super({ key: 'DifficultySelectScene' });
  }

  preload(): void {
    // Load any needed assets here
  }

  create(): void {
    this.difficultyTexts = [];
    const { width, height } = this.cameras.main;

    // Load controller settings
    const settings = LocalStorage.getSettings();
    this.fireButtonIndex = settings.controllerFireButton!;
    this.backButtonIndex = settings.controllerBackButton!;
    this.startButtonIndex = settings.controllerStartButton!;

    // Title
    this.add.text(width / 2, height * 0.15, 'SELECT DIFFICULTY', {
      fontSize: '48px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5);

    // Instructions
    this.add.text(width / 2, height * 0.25, 'Choose your challenge', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    
    this.add.text(width / 2, height * 0.28, 'Then capture your face for the game', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#888888',
      align: 'center'
    }).setOrigin(0.5);

    // Get saved difficulty or default to MEDIUM
    const saved = localStorage.getItem('gameDifficulty');
    if (saved && Object.values(DifficultyPreset).includes(saved as DifficultyPreset)) {
      this.selectedDifficulty = saved as DifficultyPreset;
      this.selectedIndex = Object.values(DifficultyPreset).indexOf(this.selectedDifficulty);
    }

    // Create difficulty options
    const difficulties = [
      DifficultyPreset.EASY,
      DifficultyPreset.MEDIUM,
      DifficultyPreset.HARD,
      DifficultyPreset.EXTREME
    ];

    difficulties.forEach((difficulty, index) => {
      const y = height * 0.35 + (index * 80);
      
      // Difficulty name
      const text = this.add.text(width / 2, y, getDifficultyName(difficulty), {
        fontSize: difficulty === this.selectedDifficulty ? '36px' : '32px',
        fontFamily: 'Courier New',
        color: difficulty === this.selectedDifficulty ? '#ffff00' : '#ffffff',
        align: 'center'
      }).setOrigin(0.5);
      
      // Make interactive
      text.setInteractive({ useHandCursor: true });
      
      // Hover effects
      text.on('pointerover', () => {
        if (difficulty !== this.selectedDifficulty) {
          text.setStyle({ color: '#ffff00', fontSize: '36px' });
        }
      });
      
      text.on('pointerout', () => {
        if (difficulty !== this.selectedDifficulty) {
          text.setStyle({ color: '#ffffff', fontSize: '32px' });
        }
      });
      
      // Click to select and start game
      text.on('pointerdown', () => {
        this.selectAndStartGame(difficulty, index);
      });
      
      this.difficultyTexts.push(text);
      
      // Description
      this.add.text(width / 2, y + 25, this.descriptions[difficulty], {
        fontSize: '16px',
        fontFamily: 'Courier New',
        color: '#888888',
        align: 'center'
      }).setOrigin(0.5);
    });

    // Controller instructions
    this.add.text(width / 2, height * 0.85, '↑↓ Navigate  •  FIRE/Enter Select  •  BACK/ESC Back', {
      fontSize: '18px',
      fontFamily: 'Courier New',
      color: '#666666',
      align: 'center'
    }).setOrigin(0.5);

    // Setup Konami code callback
    this.konamiCode.onComplete(() => {
      this.activateKonamiCode();
    });

    // Setup controls
    this.setupControls();

    // Setup shutdown handler to clean up keyboard listeners
    this.events.once('shutdown', () => {
      this.upKey?.removeAllListeners();
      this.downKey?.removeAllListeners();
      this.enterKey?.removeAllListeners();
      this.escKey?.removeAllListeners();
      this.bKey?.removeAllListeners();
      this.aKey?.removeAllListeners();
    });
  }

  private activateKonamiCode(): void {
    // Set 100 lives in the game registry
    this.registry.set('konamiBonusLives', 100);

    // Show visual feedback
    const { width, height } = this.cameras.main;
    this.konamiText = this.add.text(width / 2, height * 0.05, '★ KONAMI CODE ACTIVATED! 100 LIVES! ★', {
      fontSize: '32px',
      fontFamily: 'Courier New',
      color: '#ffff00',
      align: 'center',
      stroke: '#ff00ff',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Pulse animation
    this.tweens.add({
      targets: this.konamiText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      repeat: 3
    });

    // Flash screen
    this.cameras.main.flash(1000, 255, 255, 0);
  }

  private selectAndStartGame(difficulty: DifficultyPreset, index: number): void {
    this.selectedDifficulty = difficulty;
    this.selectedIndex = index;
    
    // Save difficulty to localStorage
    localStorage.setItem('gameDifficulty', this.selectedDifficulty);
    
    // Update visual selection
    this.updateVisualSelection();
    
    // Go to webcam scene for face capture, then start game
    this.scene.start('WebcamScene', { difficulty: this.selectedDifficulty });
  }

  private setupControls(): void {
    console.log('Setting up keyboard controls...');

    // Create and store key objects
    this.upKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.bKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.aKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);

    // Keyboard controls
    this.upKey?.on('down', () => {
      console.log('UP key pressed');
      this.konamiCode.addInput('UP');
      this.navigateDifficulty(-1);
    });

    this.downKey?.on('down', () => {
      console.log('DOWN key pressed');
      this.konamiCode.addInput('DOWN');
      this.navigateDifficulty(1);
    });

    this.enterKey?.on('down', () => {
      console.log('ENTER key pressed, starting game with difficulty:', this.selectedDifficulty);
      // Enter doesn't affect Konami code, so always works
      this.selectAndStartGame(this.selectedDifficulty, this.selectedIndex);
    });

    this.escKey?.on('down', () => {
      console.log('ESC key pressed, going back to menu');
      // ESC doesn't affect Konami code, so always works
      this.scene.start('MenuScene');
    });

    // Konami code: LEFT and RIGHT keys (arrow keys)
    const leftKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const rightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

    leftKey?.on('down', () => {
      this.konamiCode.addInput('LEFT');
    });

    rightKey?.on('down', () => {
      this.konamiCode.addInput('RIGHT');
    });

    // Konami code: B and A keys
    // Note: These keys ONLY trigger Konami code, they don't have other functions
    // so we don't need to check progress here
    this.bKey?.on('down', () => {
      this.konamiCode.addInput('B');
    });

    this.aKey?.on('down', () => {
      this.konamiCode.addInput('A');
    });

    // Initial gamepad check
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      this.gamepad = this.input.gamepad.getPad(0);
    }
  }

  update(): void {
    // Check if Konami code has timed out (ensures B/A buttons work again after timeout)
    this.konamiCode.checkTimeout();

    // Handle controller input
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      if (!this.gamepad || !this.gamepad.connected) {
        this.gamepad = this.input.gamepad.getPad(0);
      }

      if (this.gamepad) {
        // D-pad or analog stick
        const dpadUp = this.gamepad.up;
        const dpadDown = this.gamepad.down;
        const dpadLeft = this.gamepad.left;
        const dpadRight = this.gamepad.right;
        const analogY = this.gamepad.leftStick.y;
        const analogX = this.gamepad.leftStick.x;

        const isUp = dpadUp || analogY < -0.5;
        const isDown = dpadDown || analogY > 0.5;
        const isLeft = dpadLeft || analogX < -0.5;
        const isRight = dpadRight || analogX > 0.5;

        // Navigate up
        if (isUp && !this.prevUpPressed) {
          this.konamiCode.addInput('UP');
          this.navigateDifficulty(-1);
        }
        this.prevUpPressed = isUp;

        // Navigate down
        if (isDown && !this.prevDownPressed) {
          this.konamiCode.addInput('DOWN');
          this.navigateDifficulty(1);
        }
        this.prevDownPressed = isDown;

        // Track left/right for Konami code
        if (isLeft && !this.prevLeftPressed) {
          this.konamiCode.addInput('LEFT');
        }
        this.prevLeftPressed = isLeft;

        if (isRight && !this.prevRightPressed) {
          this.konamiCode.addInput('RIGHT');
        }
        this.prevRightPressed = isRight;
        
        // Fire button or Start button to select
        const isFirePressed = !!this.gamepad.buttons[this.fireButtonIndex]?.pressed;
        const isStartPressed = !!this.gamepad.buttons[this.startButtonIndex]?.pressed;

        if ((isFirePressed || isStartPressed) && !this.prevAPressed) {
          const completed = this.konamiCode.addInput('A'); // Fire button is 'A' in Konami code
          // Only select game if not entering Konami code or if code was just completed
          if (this.konamiCode.getProgress() === 0 || completed) {
            this.selectAndStartGame(this.selectedDifficulty, this.selectedIndex);
          }
        }
        this.prevAPressed = isFirePressed || isStartPressed;

        // Back button to go back
        const isBackPressed = !!this.gamepad.buttons[this.backButtonIndex]?.pressed;
        if (isBackPressed && !this.prevBPressed) {
          this.konamiCode.addInput('B'); // Back button is 'B' in Konami code
          // Only go back if not entering Konami code
          if (this.konamiCode.getProgress() === 0) {
            this.scene.start('MenuScene');
          }
        }
        this.prevBPressed = isBackPressed;
      }
    }
  }

  private updateVisualSelection(): void {
    const difficulties = [
      DifficultyPreset.EASY,
      DifficultyPreset.MEDIUM,
      DifficultyPreset.HARD,
      DifficultyPreset.EXTREME
    ];
    
    difficulties.forEach((diff, index) => {
      const text = this.difficultyTexts[index];
      if (!text || !text.active) return;

      if (diff === this.selectedDifficulty) {
        text.setStyle({ color: '#ffff00', fontSize: '36px' });
      } else {
        text.setStyle({ color: '#ffffff', fontSize: '32px' });
      }
    });
  }

  private selectDifficulty(difficulty: DifficultyPreset): void {
    this.selectedDifficulty = difficulty;
    this.selectedIndex = Object.values(DifficultyPreset).indexOf(difficulty);
    this.updateVisualSelection();
  }

  private navigateDifficulty(direction: number): void {
    const difficulties = [
      DifficultyPreset.EASY,
      DifficultyPreset.MEDIUM,
      DifficultyPreset.HARD,
      DifficultyPreset.EXTREME
    ];
    
    let newIndex = this.selectedIndex + direction;
    
    // Wrap around
    if (newIndex < 0) newIndex = difficulties.length - 1;
    if (newIndex >= difficulties.length) newIndex = 0;
    
    this.selectDifficulty(difficulties[newIndex]);
  }
}
