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

  async create(): Promise<void> {
    // Setup shutdown event for cleanup
    this.events.on('shutdown', () => {
      this.cleanup();
    });

    // Create SVG alien textures
    await this.createSVGAlienTextures();

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
    this.load.image('space-helmet-clipart-xl', 'assets/images/space-helmet-clipart-xl.png');

    // Load SVG for alien designs
    this.load.text('alien1-svg', 'assets/images/alien1.svg');
    this.load.text('alien2-svg', 'assets/images/alien2.svg');
    this.load.text('alien3-svg', 'assets/images/alien3.svg');

    // Load SVG for defender/player
    this.load.text('defender-svg', 'assets/images/defender.svg');

    // Load sounds (will be handled gracefully if missing)
    this.load.audio('shoot', 'assets/sounds/shoot.mp3');
    this.load.audio('explosion', 'assets/sounds/explosion.mp3');
    this.load.audio('alien-hit', 'assets/sounds/alien-hit.mp3');
    this.load.audio('player-hit', 'assets/sounds/player-hit.mp3');
    this.load.audio('background-music', 'assets/sounds/background-music.mp3');
  }

  private createProceduralAssets(): void {
    // Create better procedural graphics for all game entities
    // Player and alien sprites now loaded from SVG in create() method
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

  private async createSVGAlienTextures(): Promise<void> {
    const parser = new DOMParser();

    // Map of SVG files to texture keys
    const alienMappings = [
      { svgKey: 'alien1-svg', textureKey: 'alien-0', width: 88, height: 64, storeFaceMeta: true, faceMetaKey: 'alien1-face-meta' },
      { svgKey: 'alien2-svg', textureKey: 'alien-1', width: 88, height: 64, storeFaceMeta: false, faceMetaKey: null },
      { svgKey: 'alien3-svg', textureKey: 'alien-2', width: 88, height: 64, storeFaceMeta: false, faceMetaKey: null },
      { svgKey: 'defender-svg', textureKey: 'player', width: 40, height: 40, storeFaceMeta: true, faceMetaKey: 'player-face-meta' }
    ];

    for (const mapping of alienMappings) {
      try {
        const svgText = this.cache.text.get(mapping.svgKey);
        if (!svgText) {
          console.warn(`${mapping.svgKey} not loaded, skipping`);
          continue;
        }

        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

        // Check for parse errors
        const parserError = svgDoc.querySelector('parsererror');
        if (parserError) {
          console.error(`SVG parse error in ${mapping.svgKey}:`, parserError.textContent);
          continue;
        }

        const svgRoot = svgDoc.documentElement as unknown as SVGSVGElement;

        // Clone the SVG
        const clonedSvg = svgRoot.cloneNode(true) as SVGSVGElement;

        // Find and handle face element (check both id="face" and inkscape:label="face")
        let faceElement = clonedSvg.querySelector('#face');
        if (!faceElement) {
          faceElement = clonedSvg.querySelector('[inkscape\\:label="face"]');
        }

        if (faceElement && mapping.storeFaceMeta && mapping.faceMetaKey) {
          // Store face metadata
          const cx = parseFloat(faceElement.getAttribute('cx') || faceElement.getAttribute('x') || '50');
          const cy = parseFloat(faceElement.getAttribute('cy') || faceElement.getAttribute('y') || '50');
          const rxRaw = parseFloat(faceElement.getAttribute('rx') || faceElement.getAttribute('r') || faceElement.getAttribute('width')?.split(' ')[0] || '20');
          const rx = rxRaw * 0.75; // Apply 0.75 multiplier to face radius

          this.cache.json.add(mapping.faceMetaKey, {
            cx, cy, rx,
            relativeX: cx / 100, // SVG is 100x100
            relativeY: cy / 100
          });

          console.log(`${mapping.faceMetaKey}:`, { cx, cy, rx, original: rxRaw });
        }

        // Remove face element from all aliens
        if (faceElement) {
          faceElement.remove();
        }

        // Set size to match game dimensions
        clonedSvg.setAttribute('width', mapping.width.toString());
        clonedSvg.setAttribute('height', mapping.height.toString());

        // Keep original viewBox (should be "0 0 100 100")
        if (!clonedSvg.hasAttribute('viewBox')) {
          clonedSvg.setAttribute('viewBox', '0 0 100 100');
        }

        // Serialize to string
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(clonedSvg);

        // Convert to blob
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = mapping.width;
            canvas.height = mapping.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, mapping.width, mapping.height);

            this.textures.addCanvas(mapping.textureKey, canvas);

            URL.revokeObjectURL(url);
            console.log(`Created texture ${mapping.textureKey} from ${mapping.svgKey}`);
            resolve();
          };
          img.onerror = (error) => {
            console.error(`Failed to load image for ${mapping.svgKey}:`, error);
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load SVG image for ${mapping.svgKey}`));
          };
          img.src = url;
        });
      } catch (error) {
        console.error(`Error processing ${mapping.svgKey}:`, error);
      }
    }

    // If no textures were created, fall back to procedural
    if (!this.textures.exists('alien-0') && !this.textures.exists('alien-1') && !this.textures.exists('alien-2')) {
      console.warn('No SVG alien textures created, falling back to procedural graphics');
      this.createAlienSprites();
    }
  }

  private createAlienSprites(): void {
    // Fallback procedural graphics
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
