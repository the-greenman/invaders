import Phaser from 'phaser';
import { FaceManager } from '../managers/FaceManager';
import { LocalStorage } from '../utils/localStorage';

/**
 * Webcam Scene
 *
 * Handles webcam access and face capture using FaceManager.
 * Allows users to capture faces for alien customization.
 *
 * Extends Phaser.Scene.
 */
export class WebcamScene extends Phaser.Scene {
  private videoElement: HTMLVideoElement | null = null;
  private captureButton: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private isInitialized: boolean = false;
  private isCapturing: boolean = false;
   private lastBBox: { xMin: number; yMin: number; width: number; height: number } | null = null; // normalized
   private cropPadding: number = 24;
  private liveKey = 'webcam-live';
  private liveImage?: Phaser.GameObjects.Image;
  private faceCircle?: Phaser.GameObjects.Arc;
  private helmet?: Phaser.GameObjects.Image;
  private helmetOffset = { x: 0, y: 0 };
  private videoScale: number = 1;
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevFirePressed: boolean = false;
  private prevStartPressed: boolean = false;
  private fireButtonIndex: number = 0;
  private startButtonIndex: number = 11;

  constructor() {
    super({ key: 'WebcamScene' });
  }

  preload(): void {
    // Webcam scene assets are already loaded in PreloaderScene
  }

  create(): void {
    const settings = LocalStorage.getSettings();
    this.fireButtonIndex = settings.controllerFireButton ?? 0;
    this.startButtonIndex = settings.controllerStartButton ?? 11;

    this.createBackground();
    this.createUI();
    this.setupEventListeners();
    this.initializeWebcam();
    
    // Setup shutdown event for cleanup
    this.events.on('shutdown', () => {
      this.cleanup();
    });
  }

  update(): void {
    // Update webcam display and face detection status
    this.updateStatusDisplay();

    // Gamepad polling
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      if (!this.gamepad || !this.gamepad.connected) {
        this.gamepad = this.input.gamepad.getPad(0);
      }
    }

    if (this.gamepad && this.gamepad.connected) {
      const firePressed = this.gamepad.buttons[this.fireButtonIndex]?.pressed;
      const startPressed = this.gamepad.buttons[this.startButtonIndex]?.pressed;
      if ((firePressed || startPressed) && !this.prevFirePressed && !this.prevStartPressed) {
        if (this.isInitialized && !this.isCapturing) {
          this.captureFace();
        }
      }
      this.prevFirePressed = !!firePressed;
      this.prevStartPressed = !!startPressed;
    }
  }

  destroy(): void {
    // Cleanup webcam resources
    this.cleanupWebcam();
    this.cleanup();
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    
    // Add title
    this.add.text(this.cameras.main.width / 2, 50, 'ASTRONAUT SETUP', {
      fontSize: '36px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);
  }

  private createUI(): void {
    const { width, height } = this.cameras.main;
    
    // Create HTML video element
    this.videoElement = document.createElement('video');
    this.videoElement.width = 640;
    this.videoElement.height = 480;
    this.videoElement.autoplay = true;
    this.videoElement.style.position = 'absolute';
    this.videoElement.style.left = '-9999px'; // hide DOM element; we render via texture
    
    // Add video to DOM
    document.body.appendChild(this.videoElement);
    
    // Create status text
    this.statusText = this.add.text(width / 2, height / 2 + 250, 'Initializing...', {
      fontSize: '18px',
      fontFamily: 'Courier New',
      color: '#ffff00'
    }).setOrigin(0.5);
    
    // Create capture button
    this.captureButton = this.add.text(width / 2, height / 2 + 300, 'CAPTURE FACE', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive();
  }

  private setupEventListeners(): void {
    // Capture button click
    this.captureButton?.on('pointerdown', () => {
      this.captureFace();
    });
    
    // Keyboard controls
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.isInitialized && !this.isCapturing) {
        this.captureFace();
      }
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.isInitialized && !this.isCapturing) {
        this.captureFace();
      }
    });
    
    // Cleanup on scene shutdown
    this.events.on('shutdown', () => {
      this.cleanupWebcam();
    });
  }

  private async initializeWebcam(): Promise<void> {
    try {
      if (!this.videoElement) {
        throw new Error('Video element not created');
      }
      const hasCamera = await this.hasWebcam();
      if (!hasCamera) {
        // Skip directly if no camera is available
        this.scene.start('MenuScene');
        return;
      }
      
      // Initialize MediaPipe Face Detection
      await FaceManager.initMediaPipe();
      
      // Start webcam
      await FaceManager.startWebcam(this.videoElement);
      this.setupLiveTexture();

      // Start face detection loop
      await FaceManager.startDetectionLoop(this.videoElement, (results: any) => {
        const detection = results?.detections?.[0];
        if (!detection) {
          this.lastBBox = null;
          return;
        }
        const box = detection.boundingBox || detection.relativeBoundingBox;
        if (!box) return;
        const xMin = box.xMin ?? (box.xCenter - box.width / 2);
        const yMin = box.yMin ?? (box.yCenter - box.height / 2);
        const width = box.width ?? box.w ?? 0.25;
        const height = box.height ?? box.h ?? 0.25;
        this.lastBBox = { xMin, yMin, width, height };
      });
      
      this.isInitialized = true;
      this.updateStatus('Ready Defender! Climb into your suit and press FIRE!');
      
    } catch (error) {
      console.error('Failed to initialize webcam:', error);
      this.updateStatus('Error: ' + this.getErrorMessage(error));
      
      // Show retry button
      this.showRetryButton();
    }
  }

  private async captureFace(): Promise<void> {
    if (!this.isInitialized || this.isCapturing || !this.videoElement) {
      return;
    }
    
    this.isCapturing = true;
    this.updateStatus('Capturing face...');
    
    try {
      // Capture and save face using detection bbox + padding (matches debug)
      await FaceManager.captureAndSaveFace(this.videoElement, this.lastBBox ?? undefined, this.cropPadding);
      
      this.updateStatus('Face captured successfully!');
      
      // Wait a moment then transition to game
      this.time.delayedCall(1500, () => {
        this.startGameWithWebcam();
      });
      
    } catch (error) {
      console.error('Failed to capture face:', error);
      this.updateStatus('Capture failed: ' + this.getErrorMessage(error));
      this.isCapturing = false;
    }
  }

  private startGameWithWebcam(): void {
    // Start game with webcam faces
    this.scene.start('GameScene', { level: 1, score: 0, useWebcam: true });
  }

  /**
   * Create a live texture from the webcam feed and place it inside a circular mask
   * with an astronaut helmet placeholder behind it.
   */
  private setupLiveTexture(): void {
    if (!this.videoElement) return;
    const vw = this.videoElement.videoWidth || 640;
    const vh = this.videoElement.videoHeight || 480;
    if (this.textures.exists(this.liveKey)) {
      this.textures.remove(this.liveKey);
    }
    const tex = this.textures.createCanvas(this.liveKey, vw, vh);
    const targetSize = Math.min(this.cameras.main.width, this.cameras.main.height) * 0.55;
    this.videoScale = targetSize / vw;

    // Astronaut helmet image with configurable offset
    if (this.helmet) this.helmet.destroy();
    this.helmet = this.add.image(
      this.cameras.main.width / 2 + this.helmetOffset.x,
      this.cameras.main.height / 2 + this.helmetOffset.y,
      'space-helmet-clipart-xl'
    );
    this.helmet.setOrigin(0.5);
    this.helmet.setDisplaySize(targetSize * 1.2, targetSize * 1.2);

    // Live image masked to a circle
    this.liveImage = this.add.image(
      this.cameras.main.width / 2 + this.helmetOffset.x,
      this.cameras.main.height / 2 + this.helmetOffset.y,
      this.liveKey
    );
    this.liveImage.setDisplaySize(targetSize, targetSize * (vh / vw));
    const maskGfx = this.add.graphics({ x: this.liveImage.x, y: this.liveImage.y });
    maskGfx.fillStyle(0xffffff);
    const radius = (vw / 2) * this.videoScale * 0.75;
    maskGfx.fillCircle(0, 0, radius);
    const mask = maskGfx.createGeometryMask();
    this.liveImage.setMask(mask);
    maskGfx.setVisible(false);

    // Face outline circle
    if (this.faceCircle) {
      this.faceCircle.destroy();
      this.faceCircle = undefined;
    }
    this.faceCircle = this.add.circle(this.liveImage.x, this.liveImage.y, radius, 0x000000, 0);
    this.faceCircle.setStrokeStyle(3, 0x00ffff, 0.8);
  }

  private returnToMenu(): void {
    this.scene.start('MenuScene');
  }

  private updateStatus(message: string): void {
    if (this.statusText) {
      this.statusText.setText(message);
    }
  }

  private updateStatusDisplay(): void {
    if (!this.videoElement || !this.textures.exists(this.liveKey)) return;
    const tex = this.textures.get(this.liveKey) as Phaser.Textures.CanvasTexture;
    const ctx = tex.getContext();
    if (!ctx) return;
    ctx.drawImage(this.videoElement, 0, 0, tex.width, tex.height);
    tex.refresh();

    // Update detected face outline to match crop area
    if (this.faceCircle && this.faceCircle.active && this.lastBBox && this.videoElement) {
      const vw = this.videoElement.videoWidth || tex.width;
      const vh = this.videoElement.videoHeight || tex.height;
      const xMin = this.lastBBox.xMin * vw - this.cropPadding;
      const yMin = this.lastBBox.yMin * vh - this.cropPadding;
      const width = this.lastBBox.width * vw + this.cropPadding * 2;
      const height = this.lastBBox.height * vh + this.cropPadding * 2;
      const size = Math.min(width, height);
      const centerX = xMin + size / 2;
      const centerY = yMin + size / 2;
      const scaleX = this.liveImage ? this.liveImage.displayWidth / vw : 1;
      const scaleY = this.liveImage ? this.liveImage.displayHeight / vh : 1;
      const originX = this.liveImage ? this.liveImage.x : this.cameras.main.width / 2;
      const originY = this.liveImage ? this.liveImage.y : this.cameras.main.height / 2;
      const screenX = originX + (centerX - vw / 2) * scaleX;
      const screenY = originY + (centerY - vh / 2) * scaleY;
      const radius = (size / 2) * ((scaleX + scaleY) / 2);
      this.faceCircle.setPosition(screenX, screenY);
      this.faceCircle.setRadius(radius);
    }
  }

  private cleanupWebcam(): void {
    // Remove video element from DOM
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
    
    // Cleanup FaceManager resources
    FaceManager.cleanup();
    
    this.videoElement = null;
    this.isInitialized = false;
    this.isCapturing = false;
  }

  private getErrorMessage(error: any): string {
    if (error instanceof Error) {
      if (error.message.includes('camera') || error.message.includes('permission')) {
        return 'Camera access denied. Please check permissions.';
      }
      if (error.message.includes('MediaPipe')) {
        return 'Face detection failed. Please refresh and try again.';
      }
      return error.message;
    }
    return 'Unknown error occurred';
  }

  private showRetryButton(): void {
    const { width } = this.cameras.main;
    
    const retryButton = this.add.text(width / 2, this.cameras.main.height / 2 + 350, 'RETRY', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#ffff00',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive();
    
    retryButton.on('pointerdown', () => {
      retryButton.destroy();
      this.initializeWebcam();
    });
  }

  private async hasWebcam(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return false;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(d => d.kind === 'videoinput');
    } catch (e) {
      console.warn('Unable to enumerate devices', e);
      return false;
    }
  }

  private cleanup(): void {
    // Clean up keyboard listeners
    this.input.keyboard?.removeAllKeys();
    
    // Clear references
    this.videoElement = null;
    this.captureButton = null;
    this.statusText = null;
    this.isInitialized = false;
    this.isCapturing = false;
  }
}
