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
    // Skip loading actual assets and create procedural graphics instead
    this.createProceduralAssets();
    
    // Load sounds (will be handled gracefully if missing)
    this.load.audio('shoot', 'assets/sounds/shoot.mp3');
    this.load.audio('explosion', 'assets/sounds/explosion.mp3');
    this.load.audio('alien-hit', 'assets/sounds/alien-hit.mp3');
    this.load.audio('player-hit', 'assets/sounds/player-hit.mp3');
    this.load.audio('background-music', 'assets/sounds/background-music.mp3');
  }

  private createProceduralAssets(): void {
    // Create better procedural graphics for all game entities
    this.createPlayerSprite();
    this.createAlienSprites();
    this.createBulletSprite();
    this.createBombSprite();
    this.createLogoSprite();
    // Note: Shield entity creates its own canvas textures dynamically
  }

  private createPlayerSprite(): void {
    const graphics = this.make.graphics();
    
    // Draw a spaceship-like player sprite
    graphics.fillStyle(0x00ff00); // Green
    // Main body
    graphics.beginPath();
    graphics.moveTo(0, -20);
    graphics.lineTo(-15, 20);
    graphics.lineTo(0, 10);
    graphics.lineTo(15, 20);
    graphics.closePath();
    graphics.fillPath();
    
    // Cockpit
    graphics.fillStyle(0x00ffff); // Cyan
    graphics.fillCircle(0, 0, 5);
    
    graphics.generateTexture('player', 40, 40);
    graphics.destroy();
  }

  private createAlienSprites(): void {
    // Create different alien types
    const alienTypes = [
      { name: 'alien-0', color: 0xff0000, points: 10 }, // Red
      { name: 'alien-1', color: 0xff00ff, points: 20 }, // Magenta  
      { name: 'alien-2', color: 0xffff00, points: 30 }  // Yellow
    ];

    alienTypes.forEach(type => {
      const graphics = this.make.graphics();
      
      // Draw an octopus-like alien
      graphics.fillStyle(type.color);
      
      // Body
      graphics.fillCircle(0, 0, 12);
      
      // Tentacles
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const x = Math.cos(angle) * 10;
        const y = Math.sin(angle) * 10;
        graphics.fillCircle(x, y, 3);
      }
      
      // Eyes
      graphics.fillStyle(0x000000); // Black
      graphics.fillCircle(-4, -2, 2);
      graphics.fillCircle(4, -2, 2);
      
      graphics.generateTexture(type.name, 30, 30);
      graphics.destroy();
    });
  }

  private createBulletSprite(): void {
    const graphics = this.make.graphics();
    
    // Draw a laser bullet
    graphics.fillStyle(0xffff00); // Yellow
    graphics.fillRect(-2, -8, 4, 16);
    
    // Add glow effect
    graphics.fillStyle(0xffffff, 0.5); // Semi-transparent white
    graphics.fillRect(-1, -6, 2, 12);
    
    graphics.generateTexture('bullet', 4, 16);
    graphics.destroy();
  }

  private createBombSprite(): void {
    const graphics = this.make.graphics();
    
    // Draw a bomb/missile
    graphics.fillStyle(0xff00ff); // Magenta
    graphics.fillCircle(0, 0, 4);
    
    // Fuse
    graphics.fillStyle(0xff0000); // Red
    graphics.fillRect(-1, -8, 2, 4);
    
    // Fuse tip
    graphics.fillStyle(0xffff00); // Yellow
    graphics.fillCircle(0, -8, 2);
    
    graphics.generateTexture('bomb', 8, 16);
    graphics.destroy();
  }

  private createLogoSprite(): void {
    const graphics = this.make.graphics();
    
    // Draw "CLASS INVADERS" text style logo
    graphics.fillStyle(0xffffff); // White
    
    // Draw "CI" letters in block style
    graphics.fillRect(-80, -30, 20, 60); // C left
    graphics.fillRect(-80, -30, 60, 20); // C top
    graphics.fillRect(-80, 10, 60, 20);  // C bottom
    
    graphics.fillRect(20, -30, 20, 60);  // I vertical
    graphics.fillRect(-20, -30, 80, 20); // I top
    graphics.fillRect(-20, 10, 80, 20);  // I bottom
    
    graphics.generateTexture('logo', 200, 100);
    graphics.destroy();
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
