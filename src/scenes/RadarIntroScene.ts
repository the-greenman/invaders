import Phaser from 'phaser';

type RadarIntroData = {
  nextScene?: string;
  payload?: Record<string, any>;
};

type AlienEcho = {
  targetX: number;
  targetY: number;
  spawnAngle: number;
  progress: number;
  alpha: number;
  decay: number;
  type: number;
};

export class RadarIntroScene extends Phaser.Scene {
  private dataIn: RadarIntroData = {};
  private beamAngle: number = -Math.PI / 2;
  private centerX: number = 0;
  private centerY: number = 0;
  private radius: number = 0;
  private beamGfx!: Phaser.GameObjects.Graphics;
  private blipGfx!: Phaser.GameObjects.Graphics;
  private backgroundGfx!: Phaser.GameObjects.Graphics;
  private statusText?: Phaser.GameObjects.Text;
  private infoText?: Phaser.GameObjects.Text;
  private aliens: AlienEcho[] = [];
  private readyToLeave: boolean = false;
  private started: boolean = false;
  private userInteracted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private lastPing: number = 0;
  private debugEnabled: boolean = false;
  private debugText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'RadarIntroScene' });
  }

  init(data: RadarIntroData = {}): void {
    this.dataIn = data;
  }

  create(): void {
    const { width, height } = this.scale;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.radius = Math.min(width, height) / 2 - 24;

    this.backgroundGfx = this.add.graphics();
    this.beamGfx = this.add.graphics();
    this.blipGfx = this.add.graphics();

    this.cameras.main.setBackgroundColor(0x001400);
    this.drawBackground();

    const titleStyle = { fontFamily: 'Courier New', fontSize: '22px', color: '#00ff00' as const };
    this.add.text(width / 2, 40, 'ORBITAL DEFENSE RADAR', titleStyle).setOrigin(0.5);
    this.add.text(width / 2, 70, 'INBOUND SIGNATURES DETECTED', {
      ...titleStyle,
      fontSize: '18px',
      color: '#ff5555'
    }).setOrigin(0.5);

    this.statusText = this.add.text(24, height - 64, 'STATUS: SCANNING SECTOR', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#00ff00'
    });

    this.infoText = this.add.text(width / 2, height - 28, 'Tap or press SPACE/ENTER to initialize sonar', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#006600'
    }).setOrigin(0.5);

    this.time.delayedCall(900, () => this.spawnFormation());
    this.time.delayedCall(3800, () => {
      this.readyToLeave = true;
      if (this.userInteracted) {
        this.startNext();
      }
    });
    this.time.delayedCall(6500, () => this.startNext());

    this.input.once('pointerdown', () => {
      this.userInteracted = true;
      this.ensureAudioContext();
      if (this.readyToLeave) {
        this.startNext();
      }
    });

    this.input.keyboard?.once('keydown-SPACE', () => {
      this.userInteracted = true;
      if (this.readyToLeave) this.startNext();
    });
    this.input.keyboard?.once('keydown-ENTER', () => {
      this.userInteracted = true;
      if (this.readyToLeave) this.startNext();
    });

    // Debug overlay toggle
    this.input.keyboard?.on('keydown-D', () => {
      this.debugEnabled = !this.debugEnabled;
      if (!this.debugText) {
        this.debugText = this.add.text(12, 12, '', {
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: '#00ff00'
        }).setDepth(10).setScrollFactor(0);
      }
      this.debugText.setVisible(this.debugEnabled);
      this.updateDebug();
    });
  }

  update(time: number): void {
    this.beamAngle += 0.03;
    if (this.beamAngle > Math.PI * 2) {
      this.beamAngle -= Math.PI * 2;
    }

    this.drawBeam();
    this.updateAliens(time);
    this.updateDebug();
  }

  private drawBackground(): void {
    const rings = 5;
    const step = this.radius / rings;

    this.backgroundGfx.clear();
    this.backgroundGfx.lineStyle(2, 0x00ff00, 0.25);

    for (let i = 1; i <= rings; i++) {
      this.backgroundGfx.strokeCircle(this.centerX, this.centerY, i * step);
    }

    this.backgroundGfx.lineStyle(1, 0x00ff00, 0.2);
    this.backgroundGfx.lineBetween(this.centerX, 0, this.centerX, this.scale.height);
    this.backgroundGfx.lineBetween(0, this.centerY, this.scale.width, this.centerY);
    this.backgroundGfx.lineBetween(0, 0, this.scale.width, this.scale.height);
    this.backgroundGfx.lineBetween(this.scale.width, 0, 0, this.scale.height);

    this.backgroundGfx.lineStyle(3, 0x00ff00, 0.5);
    this.backgroundGfx.strokeCircle(this.centerX, this.centerY, this.radius);
  }

  private drawBeam(): void {
    this.beamGfx.clear();
    const tipX = this.centerX + Math.cos(this.beamAngle) * this.radius;
    const tipY = this.centerY + Math.sin(this.beamAngle) * this.radius;

    this.beamGfx.lineStyle(3, 0xccffcc, 1);
    this.beamGfx.beginPath();
    this.beamGfx.moveTo(this.centerX, this.centerY);
    this.beamGfx.lineTo(tipX, tipY);
    this.beamGfx.strokePath();

    for (let i = 0; i < 36; i++) {
      const trailAngle = this.beamAngle - i * 0.016;
      const opacity = (1 - i / 36) * 0.35;
      this.beamGfx.lineStyle(2, 0x00ff00, opacity);
      this.beamGfx.beginPath();
      this.beamGfx.moveTo(this.centerX, this.centerY);
      this.beamGfx.lineTo(
        this.centerX + Math.cos(trailAngle) * this.radius,
        this.centerY + Math.sin(trailAngle) * this.radius
      );
      this.beamGfx.strokePath();
    }
  }

  private spawnFormation(): void {
    const rows = 5;
    const cols = 9;
    const spacing = Math.min(this.scale.width, this.scale.height) * 0.06;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offsetX = (col - cols / 2) * spacing;
        const offsetY = (row - rows / 2) * spacing;
        const angle = Math.atan2(offsetY, offsetX);

        this.aliens.push({
          targetX: this.centerX + offsetX,
          targetY: this.centerY + offsetY,
          spawnAngle: angle,
          progress: 0,
          alpha: 0,
          decay: 0.02 + Math.random() * 0.02,
          type: row < 2 ? 0 : row < 4 ? 1 : 2
        });
      }
    }

    if (this.statusText) {
      this.statusText.setText('STATUS: TARGETS DETECTED');
      this.statusText.setColor('#ff5555');
    }
    if (this.infoText) {
      this.infoText.setText('Locking solution... stand by');
    }
  }

  private updateAliens(time: number): void {
    if (!this.aliens.length) return;

    this.blipGfx.clear();
    let pingTriggered = false;
    let closest = 1;

    this.aliens.forEach(alien => {
      if (alien.progress < 1) {
        alien.progress = Math.min(1, alien.progress + 0.0012);
      }

      const eased = 1 - Math.pow(1 - alien.progress, 3);
      const startX = this.centerX + Math.cos(alien.spawnAngle) * this.radius;
      const startY = this.centerY + Math.sin(alien.spawnAngle) * this.radius;
      const x = Phaser.Math.Linear(startX, alien.targetX, eased);
      const y = Phaser.Math.Linear(startY, alien.targetY, eased);

      const alienAngle = Math.atan2(y - this.centerY, x - this.centerX);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(alienAngle - this.beamAngle));

      if (diff < 0.18) {
        alien.alpha = 1;
        const dist = Phaser.Math.Distance.Between(this.centerX, this.centerY, x, y) / this.radius;
        if (dist < closest) closest = dist;
        if (time - this.lastPing > 70) {
          pingTriggered = true;
        }
      } else if (alien.alpha > 0) {
        alien.alpha = Math.max(0, alien.alpha - alien.decay);
      }

      if (alien.alpha > 0.05) {
        this.drawBlip(x, y, alien.type, alien.alpha);
      }
    });

    if (pingTriggered) {
      this.playPing(closest);
      this.lastPing = time;
    }
  }

  private drawBlip(x: number, y: number, type: number, alpha: number): void {
    const baseSize = 9;
    this.blipGfx.fillStyle(Phaser.Display.Color.GetColor(0, 255 * alpha, 0), alpha);

    if (type === 0) {
      this.blipGfx.fillRect(x - baseSize, y - baseSize / 2, baseSize * 2, baseSize);
    } else if (type === 1) {
      this.blipGfx.fillRect(x - baseSize, y - baseSize, baseSize * 2, baseSize * 2);
    } else {
      this.blipGfx.fillRect(x - baseSize * 0.8, y - baseSize, baseSize * 1.6, baseSize * 1.5);
    }

    this.blipGfx.lineStyle(1, 0x00ff00, 0.3 * alpha);
    this.blipGfx.strokeCircle(x, y, baseSize * 1.6);
  }

  private ensureAudioContext(): void {
    if (this.audioCtx || typeof window === 'undefined') return;
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    this.audioCtx = new Ctor();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx
        .resume()
        .catch(() => {
          /* ignore */
        });
    }
  }

  private playPing(distanceRatio: number): void {
    if (!this.audioCtx) return;

    const baseFreq = 420;
    const freq = baseFreq + (1 - distanceRatio) * 520;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

    gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, this.audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.2);
  }

  private startNext(): void {
    if (this.started) return;
    this.started = true;
    const nextScene = this.dataIn.nextScene || 'SpaceInvadersScene';
    this.scene.start(nextScene, this.dataIn.payload || {});
  }

  private updateDebug(): void {
    if (!this.debugEnabled || !this.debugText) return;
    this.debugText.setText([
      `Beam: ${this.beamAngle.toFixed(2)}`,
      `Aliens: ${this.aliens.length}`,
      `Ready: ${this.readyToLeave}`,
      `Interacted: ${this.userInteracted}`,
      `Audio: ${this.audioCtx ? this.audioCtx.state : 'none'}`
    ]);
  }
}
