import Phaser from 'phaser';
import { FaceManager } from '../../managers/FaceManager';
import { ALIEN_WIDTH, ALIEN_HEIGHT, ALIEN_CORE_RADIUS, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_CORE_RADIUS } from '../../constants';
import { DebugBaseScene } from './DebugBaseScene';

/**
 * Sprite Debug Scene
 *
 * Displays all game sprites for debugging purposes.
 * Shows face composition with configurable positioning and cropping.
 */
export class SpriteDebugScene extends DebugBaseScene {
  private sprites: Phaser.GameObjects.GameObject[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private controlsText: Phaser.GameObjects.Text | null = null;

  // Configuration for face composition
  private faceOffsetX: number = 0;
  private faceOffsetY: number = 0;
  private faceScale: number = 1.0;
  private coreRadiusMultiplier: number = 1.0;

  // Configuration for SVG rendering
  private svgScale: number = 1.0;
  private svgOffsetX: number = 0;
  private svgOffsetY: number = 0;
  private svgPadding: number = 0.1; // 10% padding by default
  private showCropBoxes: boolean = true;

  constructor() {
    super({ key: 'SpriteDebugScene' });
  }

  create(): void {
    const data = this.scene.settings.data as { viewport?: { x: number; y: number; width: number; height: number } } | undefined;
    if (data?.viewport) {
      this.cameras.main.setViewport(data.viewport.x, data.viewport.y, data.viewport.width, data.viewport.height);
    }

    this.initDebugBase();

    this.cameras.main.setBackgroundColor(0x222222);

    // Title
    this.add.text(400, 30, 'SPRITE DEBUG', {
      fontSize: '32px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    // Instructions
    this.add.text(20, 70, 'Face: Arrows=offset Q/W=scale A/S=radius', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#888888'
    });

    this.add.text(20, 90, 'SVG: Z/X=scale E/D=x-offset T/G=y-offset F/H=padding C=toggle boxes', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#888888'
    });

    this.add.text(20, 110, 'R: Reset all | ESC: Back', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#888888'
    });

    this.add.text(400, 130, 'NOTE: SVG adjustments show ideal values. Apply to PreloaderScene.ts line 202-210', {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#ffaa00'
    }).setOrigin(0.5);

    // Display all sprites
    this.displaySprites();

    // Setup keyboard controls
    this.setupControls();

    // Display current settings
    this.updateControlsDisplay();

  }

  update(): void {
    const data = this.scene.settings.data as { disableBackToDebugMenu?: boolean } | undefined;
    if (data?.disableBackToDebugMenu) return;
    this.pollBackToDebugMenu();
  }

  private async displaySprites(): Promise<void> {
    const startY = 150;
    const spacing = 150;
    let currentY = startY;

    // Display alien sprites
    const alienSprites = [
      { key: 'alien-0', name: 'Alien 1 (with face)', hasFace: true, width: ALIEN_WIDTH, height: ALIEN_HEIGHT, coreRadius: ALIEN_CORE_RADIUS },
      { key: 'alien-1', name: 'Alien 2', hasFace: false, width: ALIEN_WIDTH, height: ALIEN_HEIGHT, coreRadius: ALIEN_CORE_RADIUS },
      { key: 'alien-2', name: 'Alien 3', hasFace: false, width: ALIEN_WIDTH, height: ALIEN_HEIGHT, coreRadius: ALIEN_CORE_RADIUS },
      { key: 'player', name: 'Player (with face)', hasFace: true, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, coreRadius: PLAYER_CORE_RADIUS }
    ];

    for (const spriteInfo of alienSprites) {
      // Label
      const label = this.add.text(100, currentY, spriteInfo.name, {
        fontSize: '18px',
        fontFamily: 'Courier New',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.labels.push(label);

      // Base sprite
      if (this.textures.exists(spriteInfo.key)) {
        const baseSprite = this.add.image(300, currentY, spriteInfo.key);
        baseSprite.setDisplaySize(spriteInfo.width * 1.5, spriteInfo.height * 1.5);
        this.sprites.push(baseSprite);

        // Show crop box
        if (this.showCropBoxes) {
          const cropBox = this.add.rectangle(
            300, currentY,
            spriteInfo.width * 1.5,
            spriteInfo.height * 1.5
          );
          cropBox.setStrokeStyle(2, 0xff00ff, 0.8);
          cropBox.setFillStyle(0xff00ff, 0.1);
          this.sprites.push(cropBox);
        }

        this.add.text(300, currentY + 60, 'Base', {
          fontSize: '12px',
          fontFamily: 'Courier New',
          color: '#888888'
        }).setOrigin(0.5);
      } else {
        this.add.text(300, currentY, 'NOT LOADED', {
          fontSize: '14px',
          fontFamily: 'Courier New',
          color: '#ff0000'
        }).setOrigin(0.5);
      }

      // Sprite with face (if applicable)
      if (spriteInfo.hasFace) {
        const currentFace = FaceManager.getCurrentFace();
        if (currentFace) {
          await this.displaySpriteWithFace(
            spriteInfo.key,
            spriteInfo.name,
            currentFace,
            500,
            currentY,
            spriteInfo.width,
            spriteInfo.height,
            spriteInfo.coreRadius
          );
        } else {
          this.add.text(500, currentY, 'No face captured', {
            fontSize: '14px',
            fontFamily: 'Courier New',
            color: '#ff8800'
          }).setOrigin(0.5);
        }
      }

      // Display metadata for sprites with faces
      if (spriteInfo.key === 'alien-0') {
        const metadata = this.cache.json.get('alien1-face-meta');
        if (metadata) {
          const metaText = `Face metadata:\ncx: ${metadata.cx.toFixed(1)}\ncy: ${metadata.cy.toFixed(1)}\nrx: ${metadata.rx.toFixed(1)}\nrelX: ${metadata.relativeX.toFixed(3)}\nrelY: ${metadata.relativeY.toFixed(3)}`;
          this.add.text(650, currentY - 30, metaText, {
            fontSize: '11px',
            fontFamily: 'Courier New',
            color: '#00ffff'
          });
        } else {
          this.add.text(650, currentY, 'No face metadata', {
            fontSize: '12px',
            fontFamily: 'Courier New',
            color: '#ff0000'
          });
        }
      } else if (spriteInfo.key === 'player') {
        const metadata = this.cache.json.get('player-face-meta');
        if (metadata) {
          const metaText = `Face metadata:\ncx: ${metadata.cx.toFixed(1)}\ncy: ${metadata.cy.toFixed(1)}\nrx: ${metadata.rx.toFixed(1)}\nrelX: ${metadata.relativeX.toFixed(3)}\nrelY: ${metadata.relativeY.toFixed(3)}`;
          this.add.text(650, currentY - 30, metaText, {
            fontSize: '11px',
            fontFamily: 'Courier New',
            color: '#00ffff'
          });
        } else {
          this.add.text(650, currentY, 'No face metadata', {
            fontSize: '12px',
            fontFamily: 'Courier New',
            color: '#ff0000'
          });
        }
      }

      currentY += spacing;
    }
  }

  private async displaySpriteWithFace(
    baseKey: string,
    name: string,
    faceData: string,
    x: number,
    y: number,
    width: number,
    height: number,
    coreRadius: number
  ): Promise<void> {
    try {
      // Load face texture
      const faceKey = `${baseKey}-face-temp`;
      await FaceManager.addBase64Texture(this, faceKey, faceData);

      // Get face circle position
      let faceCenterX = width / 2;
      let faceCenterY = height / 2;

      if (baseKey === 'alien-0') {
        const metadata = this.cache.json.get('alien1-face-meta');
        if (metadata) {
          // Use metadata to position face
          faceCenterX = metadata.relativeX * width;
          faceCenterY = metadata.relativeY * height;
        }
      } else if (baseKey === 'player') {
        const metadata = this.cache.json.get('player-face-meta');
        if (metadata) {
          // Use metadata to position face
          faceCenterX = metadata.relativeX * width;
          faceCenterY = metadata.relativeY * height;
        }
      }

      // Apply adjustments
      faceCenterX += this.faceOffsetX;
      faceCenterY += this.faceOffsetY;
      const adjustedCoreRadius = coreRadius * this.coreRadiusMultiplier;

      // Compose texture using shared FaceManager helper
      const compositeKey = FaceManager.composeFaceTexture(this, {
        baseKey,
        faceKey,
        targetKey: `${baseKey}-with-face-debug`,
        width,
        height,
        coreRadius: adjustedCoreRadius,
        faceCenterX,
        faceCenterY,
        faceScale: this.faceScale,
        backingAlpha: 1.0
      });

      // Display composite
      const compositeSprite = this.add.image(x, y, compositeKey);
      compositeSprite.setDisplaySize(width * 1.5, height * 1.5);
      this.sprites.push(compositeSprite);

      this.add.text(x, y + 60, 'With Face', {
        fontSize: '12px',
        fontFamily: 'Courier New',
        color: '#888888'
      }).setOrigin(0.5);

      // Draw debug circle showing face area
      const debugCircle = this.add.circle(
        x,
        y + (faceCenterY - height / 2) * 1.5,
        adjustedCoreRadius * 1.5,
        0x00ff00,
        0
      );
      debugCircle.setStrokeStyle(2, 0x00ff00, 0.5);

    } catch (error) {
      console.error(`Failed to compose ${name} with face:`, error);
      this.add.text(x, y, 'Composition failed', {
        fontSize: '14px',
        fontFamily: 'Courier New',
        color: '#ff0000'
      }).setOrigin(0.5);
    }
  }

  private setupControls(): void {
    const cursors = this.input.keyboard!.createCursorKeys();
    const keyQ = this.input.keyboard!.addKey('Q');
    const keyW = this.input.keyboard!.addKey('W');
    const keyA = this.input.keyboard!.addKey('A');
    const keyS = this.input.keyboard!.addKey('S');
    const keyR = this.input.keyboard!.addKey('R');
    const keyESC = this.input.keyboard!.addKey('ESC');

    // SVG controls
    const keyZ = this.input.keyboard!.addKey('Z');
    const keyX = this.input.keyboard!.addKey('X');
    const keyE = this.input.keyboard!.addKey('E');
    const keyD = this.input.keyboard!.addKey('D');
    const keyT = this.input.keyboard!.addKey('T');
    const keyG = this.input.keyboard!.addKey('G');
    const keyF = this.input.keyboard!.addKey('F');
    const keyH = this.input.keyboard!.addKey('H');
    const keyC = this.input.keyboard!.addKey('C');

    // Arrow keys - adjust face offset
    cursors.left.on('down', () => {
      this.faceOffsetX -= 1;
      this.refreshSprites();
    });
    cursors.right.on('down', () => {
      this.faceOffsetX += 1;
      this.refreshSprites();
    });
    cursors.up.on('down', () => {
      this.faceOffsetY -= 1;
      this.refreshSprites();
    });
    cursors.down.on('down', () => {
      this.faceOffsetY += 1;
      this.refreshSprites();
    });

    // Q/W - adjust face scale
    keyQ.on('down', () => {
      this.faceScale -= 0.05;
      this.faceScale = Math.max(0.5, this.faceScale);
      this.refreshSprites();
    });
    keyW.on('down', () => {
      this.faceScale += 0.05;
      this.faceScale = Math.min(2.0, this.faceScale);
      this.refreshSprites();
    });

    // A/S - adjust core radius
    keyA.on('down', () => {
      this.coreRadiusMultiplier -= 0.05;
      this.coreRadiusMultiplier = Math.max(0.5, this.coreRadiusMultiplier);
      this.refreshSprites();
    });
    keyS.on('down', () => {
      this.coreRadiusMultiplier += 0.05;
      this.coreRadiusMultiplier = Math.min(2.0, this.coreRadiusMultiplier);
      this.refreshSprites();
    });

    // Z/X - SVG scale
    keyZ.on('down', () => {
      this.svgScale -= 0.05;
      this.svgScale = Math.max(0.5, this.svgScale);
      this.logSVGSettings();
      this.refreshSprites();
    });
    keyX.on('down', () => {
      this.svgScale += 0.05;
      this.svgScale = Math.min(2.0, this.svgScale);
      this.logSVGSettings();
      this.refreshSprites();
    });

    // E/D - SVG X offset
    keyE.on('down', () => {
      this.svgOffsetX -= 5;
      this.logSVGSettings();
      this.refreshSprites();
    });
    keyD.on('down', () => {
      this.svgOffsetX += 5;
      this.logSVGSettings();
      this.refreshSprites();
    });

    // T/G - SVG Y offset
    keyT.on('down', () => {
      this.svgOffsetY -= 5;
      this.logSVGSettings();
      this.refreshSprites();
    });
    keyG.on('down', () => {
      this.svgOffsetY += 5;
      this.logSVGSettings();
      this.refreshSprites();
    });

    // F/H - SVG padding
    keyF.on('down', () => {
      this.svgPadding -= 0.05;
      this.svgPadding = Math.max(0, this.svgPadding);
      this.logSVGSettings();
      this.refreshSprites();
    });
    keyH.on('down', () => {
      this.svgPadding += 0.05;
      this.svgPadding = Math.min(0.5, this.svgPadding);
      this.logSVGSettings();
      this.refreshSprites();
    });

    // C - toggle crop boxes
    keyC.on('down', () => {
      this.showCropBoxes = !this.showCropBoxes;
      this.refreshSprites();
    });

    // R - reset all
    keyR.on('down', () => {
      this.faceOffsetX = 0;
      this.faceOffsetY = 0;
      this.faceScale = 1.0;
      this.coreRadiusMultiplier = 1.0;
      this.svgScale = 1.0;
      this.svgOffsetX = 0;
      this.svgOffsetY = 0;
      this.svgPadding = 0.1;
      this.logSVGSettings();
      this.refreshSprites();
    });

    // ESC - back to menu
    keyESC.on('down', () => {
      this.scene.start('MenuScene');
    });
  }

  private logSVGSettings(): void {
    console.log('SVG Settings:', {
      scale: this.svgScale,
      offsetX: this.svgOffsetX,
      offsetY: this.svgOffsetY,
      padding: this.svgPadding
    });
  }

  private refreshSprites(): void {
    // Clear existing sprites
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites = [];

    this.labels.forEach(label => label.destroy());
    this.labels = [];

    // Redisplay
    this.displaySprites();
    this.updateControlsDisplay();
  }

  private updateControlsDisplay(): void {
    if (this.controlsText) {
      this.controlsText.destroy();
    }

    const faceInfo = `Face: Offset(${this.faceOffsetX}, ${this.faceOffsetY}) Scale:${this.faceScale.toFixed(2)} Radius:${this.coreRadiusMultiplier.toFixed(2)}x`;
    const svgInfo = `SVG: Scale:${this.svgScale.toFixed(2)} Offset(${this.svgOffsetX}, ${this.svgOffsetY}) Pad:${this.svgPadding.toFixed(2)} Boxes:${this.showCropBoxes}`;

    this.controlsText = this.add.text(400, 540, faceInfo + '\n' + svgInfo, {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5);
  }
}
