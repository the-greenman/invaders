import Phaser from 'phaser';
import { DifficultyPreset, getDifficultyName } from '../types/DifficultyPreset';

/**
 * Difficulty Selection Scene
 * 
 * Allows players to select difficulty before starting the game.
 * Stores selection in LocalStorage for persistence.
 */
export class DifficultySelectScene extends Phaser.Scene {
  private selectedDifficulty: DifficultyPreset = DifficultyPreset.MEDIUM;
  private difficultyTexts: Phaser.GameObjects.Text[] = [];
  private descriptions: { [key in DifficultyPreset]: string } = {
    [DifficultyPreset.EASY]: 'Slower enemies, fewer bombs, more points',
    [DifficultyPreset.MEDIUM]: 'Balanced gameplay for everyone',
    [DifficultyPreset.HARD]: 'Fast enemies, many bombs, expert players',
    [DifficultyPreset.EXTREME]: 'Maximum challenge, are you ready?'
  };

  constructor() {
    super({ key: 'DifficultySelectScene' });
  }

  preload(): void {
    // Load any needed assets here
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Title
    this.add.text(width / 2, height * 0.15, 'SELECT DIFFICULTY', {
      fontSize: '48px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5);

    // Get saved difficulty or default to MEDIUM
    const saved = localStorage.getItem('gameDifficulty');
    if (saved && Object.values(DifficultyPreset).includes(saved as DifficultyPreset)) {
      this.selectedDifficulty = saved as DifficultyPreset;
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
      
      // Click to select
      text.on('pointerdown', () => {
        this.selectDifficulty(difficulty);
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

    // Start button
    const startButton = this.add.text(width / 2, height * 0.85, 'START GAME', {
      fontSize: '32px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    
    startButton.setInteractive({ useHandCursor: true });
    
    startButton.on('pointerover', () => {
      startButton.setStyle({ color: '#ffffff', backgroundColor: '#00ff00' });
    });
    
    startButton.on('pointerout', () => {
      startButton.setStyle({ color: '#00ff00', backgroundColor: '#000000' });
    });
    
    startButton.on('pointerdown', () => {
      this.startGame();
    });

    // Keyboard controls
    this.input.keyboard?.on('keydown-UP', () => {
      this.navigateDifficulty(-1);
    });
    
    this.input.keyboard?.on('keydown-DOWN', () => {
      this.navigateDifficulty(1);
    });
    
    this.input.keyboard?.on('keydown-ENTER', () => {
      this.startGame();
    });
  }

  private selectDifficulty(difficulty: DifficultyPreset): void {
    this.selectedDifficulty = difficulty;
    
    // Update text styles
    const difficulties = [
      DifficultyPreset.EASY,
      DifficultyPreset.MEDIUM,
      DifficultyPreset.HARD,
      DifficultyPreset.EXTREME
    ];
    
    difficulties.forEach((diff, index) => {
      const text = this.difficultyTexts[index];
      if (diff === difficulty) {
        text.setStyle({ color: '#ffff00', fontSize: '36px' });
      } else {
        text.setStyle({ color: '#ffffff', fontSize: '32px' });
      }
    });
  }

  private navigateDifficulty(direction: number): void {
    const difficulties = [
      DifficultyPreset.EASY,
      DifficultyPreset.MEDIUM,
      DifficultyPreset.HARD,
      DifficultyPreset.EXTREME
    ];
    
    const currentIndex = difficulties.indexOf(this.selectedDifficulty);
    let newIndex = currentIndex + direction;
    
    // Wrap around
    if (newIndex < 0) newIndex = difficulties.length - 1;
    if (newIndex >= difficulties.length) newIndex = 0;
    
    this.selectDifficulty(difficulties[newIndex]);
  }

  private startGame(): void {
    // Save difficulty to localStorage
    localStorage.setItem('gameDifficulty', this.selectedDifficulty);
    
    // Go to webcam scene for face capture, then start game
    this.scene.start('WebcamScene', { difficulty: this.selectedDifficulty });
  }
}
