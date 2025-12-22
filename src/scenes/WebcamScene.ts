import Phaser from 'phaser';
import { FaceManager } from '../managers/FaceManager';

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
  private backButton: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private isInitialized: boolean = false;
  private isCapturing: boolean = false;

  constructor() {
    super({ key: 'WebcamScene' });
  }

  preload(): void {
    // Webcam scene assets are already loaded in PreloaderScene
  }

  create(): void {
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
  }

  destroy(): void {
    // Cleanup webcam resources
    this.cleanupWebcam();
    this.cleanup();
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000033);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    
    // Add title
    this.add.text(this.cameras.main.width / 2, 50, 'WEBCAM SETUP', {
      fontSize: '36px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);
  }

  private createUI(): void {
    const { width, height } = this.cameras.main;
    
    // Create video element container
    const videoContainer = this.add.container(width / 2, height / 2 - 50);
    
    // Create HTML video element
    this.videoElement = document.createElement('video');
    this.videoElement.width = 640;
    this.videoElement.height = 480;
    this.videoElement.autoplay = true;
    this.videoElement.style.border = '2px solid #00ff00';
    this.videoElement.style.borderRadius = '8px';
    
    // Add video to DOM
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.appendChild(this.videoElement);
      
      // Position video element
      this.videoElement.style.position = 'absolute';
      this.videoElement.style.left = `${width / 2 - 320}px`;
      this.videoElement.style.top = `${height / 2 - 240}px`;
    }
    
    // Create status text
    this.statusText = this.add.text(width / 2, height / 2 + 250, 'Initializing...', {
      fontSize: '18px',
      fontFamily: 'Courier New',
      color: '#ffff00'
    }).setOrigin(0.5);
    
    // Create capture button
    this.captureButton = this.add.text(width / 2 - 100, height / 2 + 300, 'CAPTURE FACE', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive();
    
    // Create back button
    this.backButton = this.add.text(width / 2 + 100, height / 2 + 300, 'BACK', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive();
  }

  private setupEventListeners(): void {
    // Capture button click
    this.captureButton?.on('pointerdown', () => {
      this.captureFace();
    });
    
    // Back button click
    this.backButton?.on('pointerdown', () => {
      this.returnToMenu();
    });
    
    // Keyboard controls
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.isInitialized && !this.isCapturing) {
        this.captureFace();
      }
    });
    
    this.input.keyboard?.on('keydown-ESC', () => {
      this.returnToMenu();
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
      
      // Initialize MediaPipe Face Detection
      await FaceManager.initMediaPipe();
      
      // Start webcam
      await FaceManager.startWebcam(this.videoElement);
      
      // Start face detection loop
      FaceManager.startDetectionLoop(this.videoElement, (results: any) => {
        // Handle face detection results if needed
        console.log('Face detection results:', results);
      });
      
      this.isInitialized = true;
      this.updateStatus('Ready! Position your face and press CAPTURE');
      
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
      // Capture and save face
      await FaceManager.captureAndSaveFace(this.videoElement);
      
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

  private returnToMenu(): void {
    this.scene.start('MenuScene');
  }

  private updateStatus(message: string): void {
    if (this.statusText) {
      this.statusText.setText(message);
    }
  }

  private updateStatusDisplay(): void {
    // Could add animated status updates here
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

  private cleanup(): void {
    // Clean up keyboard listeners
    this.input.keyboard?.removeAllKeys();
    
    // Clear references
    this.videoElement = null;
    this.captureButton = null;
    this.backButton = null;
    this.statusText = null;
    this.isInitialized = false;
    this.isCapturing = false;
  }
}
