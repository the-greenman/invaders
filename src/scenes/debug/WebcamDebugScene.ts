import Phaser from 'phaser';
import { DebugBaseScene } from './DebugBaseScene';
import { FaceManager } from '../../managers/FaceManager';
import { LocalStorage } from '../../utils/localStorage';

type DeviceInfo = { label: string; kind: string };

/**
 * Webcam Debug Scene
 *
 * Quickly verifies that the browser sees a webcam, can request permission,
 * and can capture/surface faces stored in LocalStorage.
 */
export class WebcamDebugScene extends DebugBaseScene {
  private videoEl: HTMLVideoElement | null = null;
  private liveKey = 'webcam-debug-live';
  private liveImage?: Phaser.GameObjects.Image;
  private statusText!: Phaser.GameObjects.Text;
  private deviceText!: Phaser.GameObjects.Text;
  private faceText!: Phaser.GameObjects.Text;
  private lastBBox: { xMin: number; yMin: number; width: number; height: number } | null = null; // normalized
  private videoReady: boolean = false;
  private cropPadding: number = 24;

  create(): void {
    const { width } = this.cameras.main;
    this.initDebugBase();

    this.add.text(width / 2, 40, 'WEBCAM DEBUG', {
      fontSize: '28px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 80,
      'R: request camera   C: capture face   [ / ] adjust crop padding   ESC/BACK: menu',
      { fontSize: '16px', fontFamily: 'Courier New', color: '#ffffff' }
    );

    this.statusText = this.add.text(20, 120, 'Camera: idle', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#00ffff'
    });
    this.deviceText = this.add.text(20, 150, 'Devices: checking...', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#cccccc'
    });
    this.faceText = this.add.text(20, 180, 'Faces: loading...', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#cccccc'
    });

    this.createHiddenVideo();
    this.refreshDevices();
    this.updateFaceStatus();

    this.input.keyboard?.on('keydown-R', () => this.startCamera());
    this.input.keyboard?.on('keydown-C', () => this.captureFace());
    this.input.keyboard?.on('keydown-OPEN_BRACKET', () => this.adjustPadding(-4));
    this.input.keyboard?.on('keydown-CLOSE_BRACKET', () => this.adjustPadding(4));
    this.input.keyboard?.on('keydown-ESC', () => this.startExclusive('DebugMenuScene'));

    this.events.on('shutdown', () => this.cleanup());
  }

  update(): void {
    this.pollBackToDebugMenu();
    this.updateLiveTexture();
  }

  private createHiddenVideo(): void {
    this.videoEl = document.createElement('video');
    this.videoEl.autoplay = true;
    this.videoEl.playsInline = true;
    this.videoEl.style.position = 'absolute';
    this.videoEl.style.left = '-9999px';
    document.body.appendChild(this.videoEl);
  }

  private async refreshDevices(): Promise<void> {
    const devices: DeviceInfo[] = [];
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        this.deviceText.setText('Devices: navigator.mediaDevices not available');
        return;
      }
      const raw = await navigator.mediaDevices.enumerateDevices();
      raw.forEach(d => devices.push({ label: d.label || '(no label)', kind: d.kind }));
      const cameras = devices.filter(d => d.kind === 'videoinput');
      if (cameras.length === 0) {
        this.deviceText.setText('Devices: no videoinput detected');
      } else {
        const list = cameras.map((d, i) => `${i + 1}. ${d.label}`).join(' | ');
        this.deviceText.setText(`Devices: ${cameras.length} camera(s) → ${list}`);
      }
    } catch (e) {
      console.warn('Device enumeration failed', e);
      this.deviceText.setText('Devices: enumerateDevices failed (check permissions)');
    }
  }

  private async startCamera(): Promise<void> {
    if (!this.videoEl) this.createHiddenVideo();
    if (!this.videoEl) return;
    try {
      this.statusText.setText('Camera: requesting access...');
      await FaceManager.initMediaPipe();
      await FaceManager.startWebcam(this.videoEl);
      this.setupLiveTexture();
      await FaceManager.startDetectionLoop(this.videoEl, (results: any) => this.handleDetection(results));
      this.statusText.setText('Camera: ready (press C to capture)');
      this.videoReady = true;
      this.refreshDevices();
    } catch (e) {
      console.warn('Webcam start failed', e);
      this.statusText.setText('Camera: failed (permission/device?)');
      this.videoReady = false;
    }
  }

  private setupLiveTexture(): void {
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
    this.liveImage = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2 + 40, this.liveKey)
      .setDisplaySize(480, 360);
  }

  private handleDetection(results: any): void {
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
  }

  private async captureFace(): Promise<void> {
    if (!this.videoEl || !this.videoReady) {
      this.statusText.setText('Camera: not ready (press R first)');
      return;
    }
    try {
      this.statusText.setText('Capturing...');
      await FaceManager.captureAndSaveFace(this.videoEl, this.lastBBox ?? undefined, this.cropPadding);
      this.statusText.setText('Face captured to LocalStorage');
      this.updateFaceStatus();
    } catch (e) {
      console.warn('Face capture failed', e);
      this.statusText.setText('Capture failed (see console)');
    }
  }

  private updateFaceStatus(): void {
    const current = LocalStorage.getCurrentFace() ? 1 : 0;
    const history = LocalStorage.getFaceHistory().length;
    this.faceText.setText(`Faces: current=${current} history=${history}`);
  }

  private updateLiveTexture(): void {
    if (!this.videoEl || !this.videoReady) return;
    const tex = this.textures.get(this.liveKey) as Phaser.Textures.CanvasTexture;
    const ctx = tex.getContext();
    if (!ctx) return;
    const w = tex.width;
    const h = tex.height;
    ctx.drawImage(this.videoEl, 0, 0, w, h);
    if (this.lastBBox) {
      const xMin = this.lastBBox.xMin * w - this.cropPadding;
      const yMin = this.lastBBox.yMin * h - this.cropPadding;
      const width = this.lastBBox.width * w + this.cropPadding * 2;
      const height = this.lastBBox.height * h + this.cropPadding * 2;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(xMin, yMin, width, height);
    }
    tex.refresh();
  }

  private adjustPadding(delta: number): void {
    this.cropPadding = Math.max(0, this.cropPadding + delta);
    this.statusText.setText(`Camera: ready (crop padding ${this.cropPadding}px)`);
  }

  private cleanup(): void {
    FaceManager.cleanup();
    if (this.videoEl) {
      try {
        this.videoEl.remove();
      } catch {
        // ignore
      }
    }
    if (this.textures.exists(this.liveKey)) {
      this.textures.remove(this.liveKey);
    }
  }
}
