import Phaser from 'phaser';

/**
 * Preloader Scene
 *
 * Handles loading of all game assets before the main menu.
 * Shows a loading bar and progress indicators.
 *
 * Extends Phaser.Scene.
 */
export class PreloaderScene extends Phaser.Scene {
  private loadingBar: Phaser.GameObjects.Graphics | null = null;
  private progressText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload(): void {
    // Set up loading bar UI
    this.createLoadingBar();

    // Load all game assets
    this.loadAssets();

    // Set up progress indicators
    this.setupProgressListeners();
  }

  create(): void {
    // Setup shutdown event for cleanup
    this.events.on('shutdown', () => {
      this.cleanup();
    });
    
    // Transition to MenuScene when loading complete
    this.scene.start('MenuScene');
  }

  private createLoadingBar(): void {
    const { width, height } = this.cameras.main;
    
    // Create loading bar background
    const barBackground = this.add.graphics();
    barBackground.fillStyle(0x222222);
    barBackground.fillRect(width / 2 - 200, height / 2 - 15, 400, 30);
    
    // Create loading bar
    this.loadingBar = this.add.graphics();
    
    // Create progress text
    this.progressText = this.add.text(width / 2, height / 2 + 30, 'Loading: 0%', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);
  }

  private loadAssets(): void {
    // Load player sprite
    this.load.image('player', 'assets/images/player.png');
    
    // Load alien sprites (different types)
    this.load.image('alien-0', 'assets/images/alien-bottom.png');
    this.load.image('alien-1', 'assets/images/alien-middle.png');
    this.load.image('alien-2', 'assets/images/alien-top.png');
    
    // Load projectiles
    this.load.image('bullet', 'assets/images/bullet.png');
    this.load.image('bomb', 'assets/images/bomb.png');
    
    // Load shield (will be created dynamically, but load fallback)
    this.load.image('shield', 'assets/images/shield.png');
    
    // Load UI elements
    this.load.image('logo', 'assets/images/logo.png');
    
    // Load sounds (optional - create placeholders)
    this.load.audio('shoot', 'assets/sounds/shoot.mp3');
    this.load.audio('explosion', 'assets/sounds/explosion.mp3');
    this.load.audio('alien-hit', 'assets/sounds/alien-hit.mp3');
    this.load.audio('player-hit', 'assets/sounds/player-hit.mp3');
    this.load.audio('background-music', 'assets/sounds/background-music.mp3');
  }

  private setupProgressListeners(): void {
    // Handle loading progress
    this.load.on('progress', (progress: number) => {
      if (this.loadingBar) {
        this.loadingBar.clear();
        this.loadingBar.fillStyle(0x00ff00);
        this.loadingBar.fillRect(
          this.cameras.main.width / 2 - 200,
          this.cameras.main.height / 2 - 15,
          400 * progress,
          30
        );
      }
      
      if (this.progressText) {
        this.progressText.setText(`Loading: ${Math.round(progress * 100)}%`);
      }
    });

    // Handle loading completion
    this.load.on('complete', () => {
      if (this.progressText) {
        this.progressText.setText('Loading Complete!');
      }
    });

    // Handle loading errors with fallback assets
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`Failed to load asset: ${file.key}, creating fallback`);
      this.createFallbackAsset(file.key);
    });
  }

  private createFallbackAsset(assetKey: string): void {
    const { width, height } = this.cameras.main;
    
    // Create fallback colored rectangles for missing images
    if (assetKey.includes('player')) {
      const graphics = this.make.graphics();
      graphics.fillStyle(0x00ff00);
      graphics.fillRect(-20, -20, 40, 40);
      graphics.generateTexture('player', 40, 40);
      graphics.destroy();
    } else if (assetKey.includes('alien')) {
      const graphics = this.make.graphics();
      graphics.fillStyle(0xff0000);
      graphics.fillRect(-15, -15, 30, 30);
      graphics.generateTexture(assetKey, 30, 30);
      graphics.destroy();
    } else if (assetKey.includes('bullet')) {
      const graphics = this.make.graphics();
      graphics.fillStyle(0xffff00);
      graphics.fillRect(-2, -8, 4, 16);
      graphics.generateTexture('bullet', 4, 16);
      graphics.destroy();
    } else if (assetKey.includes('bomb')) {
      const graphics = this.make.graphics();
      graphics.fillStyle(0xff00ff);
      graphics.fillRect(-4, -4, 8, 8);
      graphics.generateTexture('bomb', 8, 8);
      graphics.destroy();
    } else if (assetKey.includes('shield')) {
      const graphics = this.make.graphics();
      graphics.fillStyle(0x00ffff);
      graphics.fillRect(-30, -20, 60, 40);
      graphics.generateTexture('shield', 60, 40);
      graphics.destroy();
    } else if (assetKey.includes('logo')) {
      const graphics = this.make.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillRect(-100, -50, 200, 100);
      graphics.generateTexture('logo', 200, 100);
      graphics.destroy();
    }
    
    // For audio files, we'll handle missing audio at runtime in AudioManager
    if (assetKey.includes('.mp3') || assetKey.includes('.wav')) {
      console.warn(`Audio asset ${assetKey} will be silent (missing file)`);
    }
  }

  private cleanup(): void {
    // Clear references
    this.loadingBar = null;
    this.progressText = null;
  }
}
