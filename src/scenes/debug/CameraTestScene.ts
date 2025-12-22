import Phaser from 'phaser';
import { FaceManager } from '../../managers/FaceManager';

export class CameraTestScene extends Phaser.Scene {
  private videoEl: HTMLVideoElement | null = null;
  private snapshotKey = 'camera-snapshot';

  constructor() { super({ key: 'CameraTestScene' }); }

  create(): void {
    const { width } = this.cameras.main;
    this.add.text(width / 2, 40, 'CAMERA CAPTURE TEST', {
      fontSize: '28px', fontFamily: 'Courier New', color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 80, 'C: Capture frame to sprite   ESC: Back', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#ffffff'
    });

    // Create hidden video element for webcam
    this.videoEl = document.createElement('video');
    this.videoEl.autoplay = true;
    this.videoEl.playsInline = true;
    this.videoEl.style.position = 'absolute';
    this.videoEl.style.left = '-9999px';
    document.body.appendChild(this.videoEl);

    // Start detection loop (no-op handler here)
    try {
      FaceManager.startDetectionLoop(this.videoEl, (results: any) => {});
    } catch (e) {
      console.warn('Webcam start failed', e);
    }

    this.input.keyboard?.on('keydown-C', () => this.capture());
    this.input.keyboard?.on('keydown-ESC', () => this.exit());

    this.events.on('shutdown', () => this.cleanup());
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
    const tex = this.textures.get(this.snapshotKey);
    if (tex) this.textures.remove(this.snapshotKey);
    this.textures.addCanvas(this.snapshotKey, canvas);

    const img = this.add.image(400, 300, this.snapshotKey).setScale(0.5);
    img.setDepth(10);
  }

  private exit() {
    this.scene.start('DebugMenuScene');
  }

  private cleanup() {
    if (this.videoEl) {
      try {
        const stream = (this.videoEl.srcObject as MediaStream) || null;
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        this.videoEl.remove();
      } catch {}
    }
  }
}
