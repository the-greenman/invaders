import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_CORE_RADIUS, PLAYER_HEIGHT, PLAYER_WIDTH } from '../../constants';
import { FaceManager } from '../../managers/FaceManager';

export class CameraTestScene extends Phaser.Scene {
  private videoEl: HTMLVideoElement | null = null;
  private snapshotKey = 'camera-snapshot';
  private liveKey = 'camera-live';
  private faceKey = 'player-face-src';
  private statusText!: Phaser.GameObjects.Text;
  private paddingText!: Phaser.GameObjects.Text;
  private liveImage?: Phaser.GameObjects.Image;
  private faceImage?: Phaser.GameObjects.Image;
  private lastBBox: { xMin: number; yMin: number; width: number; height: number } | null = null; // normalized
  private videoReady: boolean = false;
  private cropPadding: number = 24;
  private playerPreview?: Phaser.GameObjects.GameObject;

  constructor() { super({ key: 'CameraTestScene' }); }

  create(): void {
    const { width } = this.cameras.main;
    this.add.text(width / 2, 40, 'CAMERA CAPTURE TEST', {
      fontSize: '28px', fontFamily: 'Courier New', color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 80, 'C: Capture frame to sprite   ESC: Back', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#ffffff'
    });

    this.statusText = this.add.text(20, 120, 'Camera: initializing...', {
      fontSize: '16px', fontFamily: 'Courier New', color: '#00ffff'
    });
    this.paddingText = this.add.text(20, 150, 'Crop padding: 24 px   [ / ] to adjust', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#cccccc'
    });

    // Create hidden video element for webcam
    this.videoEl = document.createElement('video');
    this.videoEl.autoplay = true;
    this.videoEl.playsInline = true;
    this.videoEl.style.position = 'absolute';
    this.videoEl.style.left = '-9999px';
    document.body.appendChild(this.videoEl);

    // Initialize MediaPipe + webcam feed, then start detection
    this.initCamera();

    this.input.keyboard?.on('keydown-C', () => this.capture());
    this.input.keyboard?.on('keydown-OPEN_BRACKET', () => this.adjustPadding(-4));
    this.input.keyboard?.on('keydown-CLOSE_BRACKET', () => this.adjustPadding(4));
    this.input.keyboard?.on('keydown-ESC', () => this.exit());

    this.events.on('shutdown', () => this.cleanup());
  }

  private async initCamera() {
    if (!this.videoEl) return;
    try {
      this.statusText.setText('Camera: requesting access...');
      await FaceManager.initMediaPipe();
      await FaceManager.startWebcam(this.videoEl);
      this.setupLiveTexture();
      await FaceManager.startDetectionLoop(this.videoEl, (results: any) => this.handleDetection(results));
      this.statusText.setText('Camera: ready (press C to capture)');
      this.videoReady = true;
    } catch (e) {
      console.warn('Webcam init failed', e);
      this.statusText.setText('Camera: failed (check permissions)');
    }
  }

  private setupLiveTexture() {
    if (!this.videoEl) return;
    const w = this.videoEl.videoWidth || 640;
    const h = this.videoEl.videoHeight || 480;
    if (this.textures.exists(this.liveKey)) {
      this.textures.remove(this.liveKey);
    }
    const tex = this.textures.createCanvas(this.liveKey, w, h);
    if (!tex) return;
    const ctx = tex.getContext();
    if (ctx) ctx.clearRect(0, 0, w, h);
    tex.refresh();

    if (this.liveImage) this.liveImage.destroy();
    this.liveImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.liveKey)
      .setDisplaySize(480, 360);
  }

  private handleDetection(results: any) {
    const detection = results?.detections?.[0];
    if (!detection || !this.videoEl) {
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
  }

  private capture() {
    if (!this.videoEl) return;
    const w = this.videoEl.videoWidth || 320;
    const h = this.videoEl.videoHeight || 240;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(this.videoEl, 0, 0, w, h);

    // Create / update texture and show sprite
    if (this.textures.exists(this.snapshotKey)) {
      this.textures.remove(this.snapshotKey);
    }
    this.textures.addCanvas(this.snapshotKey, canvas);

    const img = this.add.image(400, 300, this.snapshotKey).setScale(0.5);
    img.setDepth(10);

    // Also display detected face crop if we have a bbox
    this.showDetectedFace();
  }

  private async showDetectedFace() {
    if (!this.videoEl) return;
    try {
      const faceData = await FaceManager.captureAndSaveFace(this.videoEl, this.lastBBox ?? undefined, this.cropPadding);

      // Load face texture using shared helper (same as main game)
      await FaceManager.addBase64Texture(this, this.faceKey, faceData);

      if (this.faceImage) this.faceImage.destroy();
      this.faceImage = this.add.image(GAME_WIDTH - 120, GAME_HEIGHT - 120, this.faceKey).setDisplaySize(160, 120);

      this.showPlayerPreview(this.faceKey);
    } catch (e) {
      console.warn('Face capture failed', e);
    }
  }

  private showPlayerPreview(faceTexKey: string) {
    if (this.playerPreview) {
      this.playerPreview.destroy();
      this.playerPreview = undefined;
    }

    const previewKey = 'player-face-preview';
    const composedKey = FaceManager.composeFaceTexture(this, {
      baseKey: 'player',
      faceKey: faceTexKey,
      targetKey: previewKey,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      coreRadius: PLAYER_CORE_RADIUS
    });

    this.playerPreview = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 100, composedKey)
      .setDisplaySize(PLAYER_WIDTH * 1.5, PLAYER_HEIGHT * 1.5);
  }

  private exit() {
    this.scene.start('DebugMenuScene');
  }

  private cleanup() {
    FaceManager.cleanup();
    if (this.videoEl) {
      try {
        this.videoEl.remove();
      } catch {}
    }
    if (this.textures.exists(this.liveKey)) {
      this.textures.remove(this.liveKey);
    }
    if (this.textures.exists(this.faceKey)) {
      this.textures.remove(this.faceKey);
    }
    if (this.playerPreview) {
      this.playerPreview.destroy();
      this.playerPreview = undefined;
    }
  }

  update(): void {
    if (!this.videoEl || !this.videoReady) return;
    const tex = this.textures.get(this.liveKey) as Phaser.Textures.CanvasTexture;
    const ctx = tex.getContext();
    if (!ctx) return;
    const w = tex.width;
    const h = tex.height;
    ctx.drawImage(this.videoEl, 0, 0, w, h);
    if (this.lastBBox) {
      const xMin = this.lastBBox.xMin * w;
      const yMin = this.lastBBox.yMin * h;
      const width = this.lastBBox.width * w;
      const height = this.lastBBox.height * h;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(xMin, yMin, width, height);
    }
    tex.refresh();
  }

  private adjustPadding(delta: number) {
    this.cropPadding = Math.max(0, this.cropPadding + delta);
    this.paddingText.setText(`Crop padding: ${this.cropPadding} px   [ / ] to adjust`);
  }
}
