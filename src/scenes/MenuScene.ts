import Phaser from 'phaser';
import { LocalStorage } from '../utils/localStorage';
import { FaceManager } from '../managers/FaceManager';
import { ALIEN_WIDTH, ALIEN_HEIGHT, ALIEN_CORE_RADIUS, COLORS, ALIEN_TINT_ALPHA, MAX_STORED_FACES } from '../constants';

interface BackgroundAlien {
  sprite: Phaser.GameObjects.Sprite;
  speed: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  wiggleFreq: number;
  wiggleAmp: number;
  rotationSpeed: number;
}

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
  private highScoresButton: Phaser.GameObjects.Text | null = null;
  private selectedButton: number = 0;
  private buttons: Phaser.GameObjects.Text[] = [];
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevFirePressed: boolean = false;
  private prevComboPressed: boolean = false;
  private prevBackPressed: boolean = false;
  private prevUpPressed: boolean = false;
  private prevDownPressed: boolean = false;
  private lastStickMove: number = 0;
  private fireButtonIndex: number = 0;
  private backButtonIndex: number = 10;
  private startButtonIndex: number = 11;
  private privacyText: Phaser.GameObjects.Text | null = null;

  // Background Aliens
  private bgAliens: BackgroundAlien[] = [];
  private alienFaceTextures: string[] = [];
  private lastSpawnTime: number = 0;
  private crawlText: Phaser.GameObjects.Text | null = null;
  private crawlRT: Phaser.GameObjects.RenderTexture | null = null;
  private crawlPlane: Phaser.GameObjects.Mesh | null = null;
  private crawlContentHeight: number = 0;

  constructor() {
    super({ key: 'MenuScene' });
  }

  preload(): void {
    // Menu assets are already loaded in PreloaderScene
  }

  async create(): Promise<void> {
    const settings = LocalStorage.getSettings();
    this.fireButtonIndex = settings.controllerFireButton ?? 0;
    this.backButtonIndex = settings.controllerBackButton ?? 10;
    this.startButtonIndex = settings.controllerStartButton ?? 11;

    this.createBackground();
    // this.setupCrawl(); // Add crawl behind title/buttons
    this.createTitle();
    this.createButtons();
    this.createPrivacyNotice();
    this.setupKeyboardControls();
    this.setupButtonAnimations();

    // Prepare background aliens
    await this.prepareAlienTextures();

    // Setup shutdown event for cleanup
    this.events.on('shutdown', () => {
      this.cleanup();
    });

    // Expose crawl controls to console
    (window as any).crawl = {
      show: () => {
        if (this.crawlPlane) this.crawlPlane.setVisible(true);
        console.log('Crawl visible:', this.crawlPlane?.visible);
      },
      hide: () => {
        if (this.crawlPlane) this.crawlPlane.setVisible(false);
        console.log('Crawl visible:', this.crawlPlane?.visible);
      },
      toggle: () => {
        if (this.crawlPlane) this.crawlPlane.setVisible(!this.crawlPlane.visible);
        console.log('Crawl visible:', this.crawlPlane?.visible);
      },
      reset: () => {
        const { height } = this.cameras.main;
        if (this.crawlText) this.crawlText.y = height * 3;
        console.log('Crawl reset to start position');
      },
      getInfo: () => {
        console.log('Crawl info:', {
          visible: this.crawlPlane?.visible,
          textY: this.crawlText?.y,
          meshVertices: this.crawlPlane?.vertices.length,
          rtExists: !!this.crawlRT,
          meshExists: !!this.crawlPlane
        });
      }
    };

    console.log('Crawl controls available: crawl.show(), crawl.hide(), crawl.toggle(), crawl.reset(), crawl.getInfo()');
  }

  update(time: number, delta: number): void {
    // Handle menu animations and input
    this.updateButtonSelection();
    
    // Update background aliens
    this.updateBackgroundAliens(time, delta);
    
    // Update crawl
    this.updateCrawl(delta);
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
    
    this.titleText = this.add.text(width / 2, height / 4, 'INVADERS!', {
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

    // High scores
    this.highScoresButton = this.add.text(width / 2, height / 2 + 80, 'HIGH SCORES', buttonStyle)
      .setOrigin(0.5)
      .setInteractive();

    this.buttons = [this.webcamButton, this.highScoresButton];
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

  private createPrivacyNotice(): void {
    const { width, height } = this.cameras.main;
    const storedFaces = LocalStorage.getFaceHistory().length;
    const maxFaces = Number(MAX_STORED_FACES);
    const message = `No images are uploaded. Faces wipe after ${maxFaces} game${maxFaces === 1 ? '' : 's'}. (${storedFaces} stored)`;
    this.privacyText = this.add.text(width / 2, height - 24, message, {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5);
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
    // Gamepad polling
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      if (!this.gamepad || !this.gamepad.connected) {
        this.gamepad = this.input.gamepad.getPad(0);
      }
    }

    if (!this.gamepad || !this.gamepad.connected) {
      return;
    }

    // Navigation
    const now = Date.now();
    const axisY = this.gamepad.axes[1].getValue();
    const dpadUp = this.gamepad.up;
    const dpadDown = this.gamepad.down;
    
    // Check UP input
    const isUp = dpadUp || axisY < -0.5;
    if (isUp && !this.prevUpPressed) {
      if (now - this.lastStickMove > 200) {
        this.selectedButton = (this.selectedButton - 1 + this.buttons.length) % this.buttons.length;
        this.updateButtonHighlight();
        this.lastStickMove = now;
      }
    }
    this.prevUpPressed = isUp;

    // Check DOWN input
    const isDown = dpadDown || axisY > 0.5;
    if (isDown && !this.prevDownPressed) {
      if (now - this.lastStickMove > 200) {
        this.selectedButton = (this.selectedButton + 1) % this.buttons.length;
        this.updateButtonHighlight();
        this.lastStickMove = now;
      }
    }
    this.prevDownPressed = isDown;

    // Selection
    const firePressed = this.gamepad.buttons[this.fireButtonIndex]?.pressed;
    const startPressed = this.gamepad.buttons[this.startButtonIndex]?.pressed;
    const backPressed = this.backButtonIndex >= 0 ? this.gamepad.buttons[this.backButtonIndex]?.pressed : false;
    const comboPressed = firePressed && backPressed;

    if (comboPressed && !this.prevComboPressed) {
      this.scene.start('DebugMenuScene');
      this.prevComboPressed = true;
      this.prevFirePressed = firePressed || startPressed;
      this.prevBackPressed = !!backPressed;
      return;
    }

    if ((firePressed || startPressed) && !this.prevFirePressed) {
      this.activateSelectedButton();
    }
    this.prevFirePressed = firePressed || startPressed;
    this.prevBackPressed = !!backPressed;
    this.prevComboPressed = comboPressed;
  }

  private activateSelectedButton(): void {
    switch (this.selectedButton) {
      case 0: // Webcam-first Start
        this.openWebcam();
        break;
      case 1: // High scores
        this.scene.start('HighScoreScene');
        break;
    }
  }

  private openWebcam(): void {
    // First go to difficulty selection, which will then start the game
    this.scene.start('DifficultySelectScene');
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

  private setupCrawl(): void {
    const content = this.cache.text.get('crawl');
    if (!content) return;

    const { width, height } = this.cameras.main;

    // Create text object but don't add to scene (use make.text)
    this.crawlText = this.make.text({
      x: width / 2,
      y: height,
      text: content,
      style: {
        fontFamily: 'Courier New',
        fontSize: '20px',
        color: '#ffff00',
        align: 'center',
        wordWrap: { width: width * 0.4 },
        lineSpacing: 4,
        fontStyle: 'bold'
      }
    }).setOrigin(0.5, 0);

    this.crawlContentHeight = this.crawlText.height;

    // Create Render Texture - make it taller to accommodate scrolling
    const rtHeight = height * 3;
    this.crawlRT = this.add.renderTexture(0, 0, width, rtHeight).setVisible(false);

    // Create custom mesh with trapezoid vertices for perspective effect
    this.createPerspectiveMesh(width, height, rtHeight);

    // Initial draw position
    this.crawlText.y = rtHeight;
  }

  private createPerspectiveMesh(screenWidth: number, screenHeight: number, rtHeight: number): void {
    // Define trapezoid dimensions for vanishing point effect
    const topWidth = screenWidth * 0.12;      // Narrow at top for vanishing point
    const bottomWidth = screenWidth * 0.9;    // Wide at bottom
    const meshHeight = screenHeight * 1.4;    // Height of the visible mesh

    // Mesh will be positioned at this screen location
    const centerX = screenWidth / 2;
    const centerY = screenHeight * 0.6;

    // Create vertices in LOCAL space (relative to mesh position at 0,0)
    // The mesh's origin is at its center
    const halfHeight = meshHeight / 2;

    const vertices = [
      // Vertex 0: top-left (relative to mesh center)
      -topWidth / 2, -halfHeight,
      // Vertex 1: top-right
      topWidth / 2, -halfHeight,
      // Vertex 2: bottom-left
      -bottomWidth / 2, halfHeight,
      // Vertex 3: bottom-right
      bottomWidth / 2, halfHeight
    ];

    // UV coordinates (texture mapping)
    const uvs = [
      0, 0,  // top-left
      1, 0,  // top-right
      0, 1,  // bottom-left
      1, 1   // bottom-right
    ];

    // Indices to create two triangles from the 4 vertices
    const indices = [
      0, 1, 2,  // First triangle
      1, 3, 2   // Second triangle
    ];

    // Create mesh at screen position with local vertices
    // Use the render texture key so the mesh can sample it correctly
    this.crawlPlane = this.add.mesh(centerX, centerY, this.crawlRT!.texture.key);
    this.crawlPlane.addVertices(vertices, uvs, indices);
    this.crawlPlane.setDepth(0);

    console.log('Mesh created with trapezoid vertices:', {
      topWidth,
      bottomWidth,
      meshHeight,
      vertexCount: vertices.length / 2
    });
  }

  private updateCrawl(delta: number): void {
    if (!this.crawlText || !this.crawlRT) return;

    const { height } = this.cameras.main;
    const rtHeight = height * 3;
    const speed = 0.025; // Slower speed for better readability with perspective

    // Move text up
    this.crawlText.y -= delta * speed;

    // Reset loop when text has scrolled completely off the top
    if (this.crawlText.y < -this.crawlContentHeight) {
      this.crawlText.y = rtHeight;
    }

    // Clear and redraw
    this.crawlRT.clear();

    // Draw text onto RT
    this.crawlRT.draw(this.crawlText);
  }

  // --- Background Aliens Logic ---

  private async prepareAlienTextures(): Promise<void> {
    const history = LocalStorage.getFaceHistory();
    console.log(`Menu: Found ${history.length} faces in history`);
    // Always load default alien textures if available
    this.alienFaceTextures = [];

    // If we have history, generate face textures
    if (history.length > 0) {
      const meta = this.cache.json.get('alien1-face-meta');
      if (!meta) console.warn('Menu: alien1-face-meta not found in cache');
      const coreRadius = meta?.rx ?? ALIEN_CORE_RADIUS;
      const centerX = meta ? meta.relativeX * ALIEN_WIDTH : undefined;
      const centerY = meta ? meta.relativeY * ALIEN_HEIGHT : undefined;

      for (const face of history) {
        const srcKey = `menu-face-src-${face.id}`;
        const targetKey = `menu-face-${face.id}`;
        try {
          await FaceManager.addBase64Texture(this, srcKey, face.imageData);
          const tintedKey = `${srcKey}-green`;
          try {
            const tinted = await FaceManager.tintImage(face.imageData, COLORS.GREEN_TINT);
            await FaceManager.addBase64Texture(this, tintedKey, tinted);
          } catch {
            // ignore
          }
          
          FaceManager.composeFaceTexture(this, {
            baseKey: 'alien-0',
            faceKey: (this.textures.exists(tintedKey) ? tintedKey : srcKey),
            targetKey,
            width: ALIEN_WIDTH,
            height: ALIEN_HEIGHT,
            coreRadius,
            faceCenterX: centerX,
            faceCenterY: centerY,
            faceScale: 1.0,
            backingAlpha: ALIEN_TINT_ALPHA
          });
          this.alienFaceTextures.push(targetKey);
        } catch (e) {
          console.warn('Menu: Failed to prepare alien face', e);
        }
      }
    }
  }

  private updateBackgroundAliens(time: number, delta: number): void {
    const { width, height } = this.cameras.main;

    // Spawn new alien?
    if (this.bgAliens.length < 4 && time - this.lastSpawnTime > 2000) {
      if (Math.random() < 0.05) { // Random chance to spawn
        this.spawnBackgroundAlien();
        this.lastSpawnTime = time;
      }
    }

    // Move existing aliens
    for (let i = this.bgAliens.length - 1; i >= 0; i--) {
      const alien = this.bgAliens[i];
      alien.progress += (alien.speed * delta) / 1000;

      // Calculate new position
      const dx = alien.targetX - alien.startX;
      const dy = alien.targetY - alien.startY;
      
      // Linear path
      let x = alien.startX + dx * alien.progress;
      let y = alien.startY + dy * alien.progress;

      // Add wiggle (perpendicular to direction)
      // Normalize direction
      const len = Math.sqrt(dx*dx + dy*dy);
      const nx = dx / len;
      const ny = dy / len;
      // Perpendicular vector (-y, x)
      const px = -ny;
      const py = nx;
      
      const wave = Math.sin(alien.progress * alien.wiggleFreq * Math.PI * 2) * alien.wiggleAmp;
      x += px * wave;
      y += py * wave;

      alien.sprite.setPosition(x, y);
      alien.sprite.rotation += alien.rotationSpeed * (delta / 1000);

      // Check if finished
      if (alien.progress >= 1.0) {
        alien.sprite.destroy();
        this.bgAliens.splice(i, 1);
      }
    }
  }

  private spawnBackgroundAlien(): void {
    const { width, height } = this.cameras.main;
    
    // Pick side: 0:left, 1:right, 2:top, 3:bottom
    const side = Phaser.Math.Between(0, 3);
    let startX = 0, startY = 0, targetX = 0, targetY = 0;
    const margin = 100;

    switch (side) {
      case 0: // Left -> Right
        startX = -margin;
        startY = Phaser.Math.Between(0, height);
        targetX = width + margin;
        targetY = Phaser.Math.Between(0, height);
        break;
      case 1: // Right -> Left
        startX = width + margin;
        startY = Phaser.Math.Between(0, height);
        targetX = -margin;
        targetY = Phaser.Math.Between(0, height);
        break;
      case 2: // Top -> Bottom
        startX = Phaser.Math.Between(0, width);
        startY = -margin;
        targetX = Phaser.Math.Between(0, width);
        targetY = height + margin;
        break;
      case 3: // Bottom -> Top
        startX = Phaser.Math.Between(0, width);
        startY = height + margin;
        targetX = Phaser.Math.Between(0, width);
        targetY = -margin;
        break;
    }

    // Distance/Depth factor (0.5 to 1.5)
    // Larger = closer = faster
    const scale = Phaser.Math.FloatBetween(0.5, 1.5);
    
    // Texture
    let texture = 'alien-0';
    if (this.alienFaceTextures.length > 0) {
      texture = Phaser.Utils.Array.GetRandom(this.alienFaceTextures);
    }

    const sprite = this.add.sprite(startX, startY, texture);
    sprite.setScale(scale);
    sprite.setDepth(scale); // Sort by scale so bigger ones are on top
    sprite.setAlpha(0.7 + (scale * 0.2)); // Closer = more opaque

    // Speed: base speed * scale
    // Distance approx 800-1000px. Speed pixels/sec?
    // Let's use progress speed. 1.0 = full traversal.
    // Time to traverse = Distance / Speed.
    // Base time 5-10 seconds.
    // Faster scale -> shorter time.
    const duration = Phaser.Math.FloatBetween(5, 10) / scale; // seconds
    const speed = 1 / duration; // progress per second

    this.bgAliens.push({
      sprite,
      speed,
      startX,
      startY,
      targetX,
      targetY,
      progress: 0,
      wiggleFreq: Phaser.Math.FloatBetween(2, 5),
      wiggleAmp: Phaser.Math.FloatBetween(50, 150) * scale,
      rotationSpeed: Phaser.Math.FloatBetween(-1, 1)
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
    this.highScoresButton = null;
    this.privacyText = null;
    this.crawlText = null;
    this.bgAliens.forEach(a => a.sprite.destroy());
    this.bgAliens = [];
  }
}
