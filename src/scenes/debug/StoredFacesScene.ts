import Phaser from 'phaser';
import { FaceManager } from '../../managers/FaceManager';
import { LocalStorage } from '../../utils/localStorage';
import { DebugBaseScene } from './DebugBaseScene';

interface FaceEntry {
  id: string;
  type: 'current' | 'history';
  imageData: string;
  timestamp?: number;
}

/**
 * Stored Faces Debug Scene
 *
 * Lists stored faces, allows deletion individually or clear-all.
 * Controller-friendly navigation.
 */
export class StoredFacesScene extends DebugBaseScene {
  private entries: FaceEntry[] = [];
  private selectedIndex: number = 0;
  private thumbnails: Phaser.GameObjects.Image[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;
  private lastNavTime: number = 0;
  private deleteAllButton!: Phaser.GameObjects.Text;
  private confirmActive: boolean = false;
  private confirmOverlay?: Phaser.GameObjects.Rectangle;
  private confirmText?: Phaser.GameObjects.Text;


  constructor() {
    super({ key: 'StoredFacesScene' });
  }

  async create(): Promise<void> {
    const { width } = this.cameras.main;

    this.initDebugBase();
    this.add.text(width / 2, 40, 'STORED FACES', {
      fontSize: '28px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    this.add.text(20, 70,
      'Up/Down or DPad to select. A/Enter: delete selected. Y/X: delete all (with confirm). ESC: back.',
      { fontSize: '14px', fontFamily: 'Courier New', color: '#ffffff' }
    );

    this.loadEntries();
    await this.renderEntries();


    // Delete all button (fixed)
    this.deleteAllButton = this.add.text(width - 40, 90, 'DELETE ALL', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#ff6666',
      backgroundColor: '#000000',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0).setInteractive().setScrollFactor(0);
    this.deleteAllButton.on('pointerdown', () => this.handleDeleteAllPress());

    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.deleteSelected());
    this.input.keyboard?.on('keydown-SPACE', () => this.deleteSelected());
    this.input.keyboard?.on('keydown-Y', () => this.handleDeleteAllPress());
    this.input.keyboard?.on('keydown-X', () => this.handleDeleteAllPress());
    this.input.keyboard?.on('keydown-ESC', () => this.startExclusive('DebugMenuScene'));

    // Mouse wheel scroll
    this.input.on('wheel', (_p: any, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy * 0.5, 0, cam.getBounds().height - cam.height);
    });

    if (this.input.gamepad && this.input.gamepad.total > 0) {
      this.pad = this.input.gamepad.gamepads.find(p => p && p.connected) as Phaser.Input.Gamepad.Gamepad | null;
    }
    this.input.gamepad?.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.pad = pad;
    });

    this.events.on('shutdown', () => {
      this.cleanup();
    });
  }

  update(): void {
    this.pollGamepad();
  }

  private loadEntries(): void {
    this.entries = [];
    const currentFace = LocalStorage.getCurrentFace();
    if (currentFace) {
      this.entries.push({ id: 'current', type: 'current', imageData: currentFace });
    }
    const history = LocalStorage.getFaceHistory();
    history.forEach(face => {
      this.entries.push({ id: face.id, type: 'history', imageData: face.imageData, timestamp: face.timestamp });
    });
    if (this.selectedIndex >= this.entries.length) {
      this.selectedIndex = Math.max(0, this.entries.length - 1);
    }

    // Update camera bounds for scrolling
    const startY = 120;
    const rowH = 120;
    const listHeight = startY + this.entries.length * rowH + 50;
    this.cameras.main.setBounds(0, 0, this.cameras.main.width, Math.max(this.cameras.main.height, listHeight));
  }

  private async renderEntries(): Promise<void> {
    this.thumbnails.forEach(t => t.destroy());
    this.labels.forEach(l => l.destroy());
    this.thumbnails = [];
    this.labels = [];

    const startY = 120;
    const rowH = 120;
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const y = startY + i * rowH;
      const key = `face-thumb-${entry.id}`;
      await FaceManager.addBase64Texture(this, key, entry.imageData);
      const thumb = this.add.image(140, y, key).setDisplaySize(100, 100);
      this.thumbnails.push(thumb);

      const labelLines = [
        entry.type === 'current' ? 'Current Face' : `History ${entry.id}`,
        entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''
      ].filter(Boolean);

      const label = this.add.text(220, y - 20, labelLines, {
        fontSize: '16px',
        fontFamily: 'Courier New',
        color: '#ffffff'
      });
      this.labels.push(label);
    }

    this.updateSelectionHighlight();
  }

  private updateSelectionHighlight(): void {
    this.thumbnails.forEach((thumb, idx) => {
      thumb.setTint(idx === this.selectedIndex ? 0x00ffff : 0xffffff);
    });
    this.labels.forEach((label, idx) => {
      label.setColor(idx === this.selectedIndex ? '#00ffff' : '#ffffff');
    });
  }

  private moveSelection(delta: number): void {
    if (this.entries.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.entries.length) % this.entries.length;
    this.updateSelectionHighlight();

    // Auto-scroll to keep selected in view
    const startY = 120;
    const rowH = 120;
    const y = startY + this.selectedIndex * rowH;
    const cam = this.cameras.main;
    const topMargin = 80;
    const bottomMargin = 80;
    if (y < cam.scrollY + topMargin) {
      cam.scrollY = Math.max(0, y - topMargin);
    } else if (y > cam.scrollY + cam.height - bottomMargin) {
      cam.scrollY = Math.min(cam.getBounds().height - cam.height, y - cam.height + bottomMargin);
    }
  }

  private async deleteSelected(): Promise<void> {
    if (this.entries.length === 0) return;
    const entry = this.entries[this.selectedIndex];
    if (entry.type === 'current') {
      LocalStorage.removeCurrentFace();
    } else {
      LocalStorage.removeFaceById(entry.id);
    }
    this.loadEntries();
    await this.renderEntries();
  }

  private async deleteAll(): Promise<void> {
    LocalStorage.clearFaces();
    this.loadEntries();
    await this.renderEntries();
    this.hideConfirm();
  }

  private pollGamepad(): void {
    if (!this.pad || !this.pad.connected) return;
    const now = this.time.now;
    const axisY = this.pad.axes.length > 1 ? this.pad.axes[1].getValue() : 0;
    const up = this.pad.up || axisY < -0.4;
    const down = this.pad.down || axisY > 0.4;
    const fire = this.pad.A || this.pad.buttons[0]?.pressed;
    const altDelete = this.pad.Y || this.pad.buttons[3]?.pressed;
    const isBack = !!this.pad.buttons[this.backButtonIndex]?.pressed;
    if (isBack && !this.prevBack) {
      if (this.confirmActive) {
        this.hideConfirm();
      } else {
        this.startExclusive('DebugMenuScene');
      }
    }
    this.prevBack = isBack;

    if (now - this.lastNavTime > 200) {
      if (up) {
        this.moveSelection(-1);
        this.lastNavTime = now;
      } else if (down) {
        this.moveSelection(1);
        this.lastNavTime = now;
      }
    }

    if (fire) {
      this.deleteSelected();
    } else if (altDelete) {
      this.handleDeleteAllPress();
    }
  }

  private handleDeleteAllPress(): void {
    if (this.confirmActive) return;
    this.showConfirm();
  }

  private cleanup(): void {
    this.input.keyboard?.removeAllListeners();
    this.thumbnails.forEach(t => t.destroy());
    this.labels.forEach(l => l.destroy());
    this.thumbnails = [];
    this.labels = [];
    this.hideConfirm();
  }

  private showConfirm(): void {
    const { width, height } = this.cameras.main;
    this.confirmActive = true;
    this.confirmOverlay = this.add.rectangle(width / 2, height / 2, width * 0.6, 140, 0x000000, 0.8).setScrollFactor(0);
    this.confirmOverlay.setStrokeStyle(2, 0xff6666, 0.8);
    this.confirmText = this.add.text(width / 2, height / 2 - 30, 'Delete ALL faces?', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#ff6666'
    }).setOrigin(0.5).setScrollFactor(0);

    const confirmBtn = this.add.text(width / 2 - 80, height / 2 + 20, 'CONFIRM', {
      fontSize: '18px',
      fontFamily: 'Courier New',
      color: '#ffffff',
      backgroundColor: '#990000',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive().setScrollFactor(0);

    const cancelBtn = this.add.text(width / 2 + 80, height / 2 + 20, 'CANCEL', {
      fontSize: '18px',
      fontFamily: 'Courier New',
      color: '#ffffff',
      backgroundColor: '#006600',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive().setScrollFactor(0);

    confirmBtn.on('pointerdown', () => {
      this.deleteAll();
    });
    cancelBtn.on('pointerdown', () => this.hideConfirm());

    // Map gamepad: A confirm, B cancel
    this.input.keyboard?.once('keydown-ENTER', () => this.deleteAll());
    this.input.keyboard?.once('keydown-SPACE', () => this.deleteAll());
    this.input.keyboard?.once('keydown-ESC', () => this.hideConfirm());

    // Store buttons for cleanup
    this.confirmOverlay.setData('confirmBtn', confirmBtn);
    this.confirmOverlay.setData('cancelBtn', cancelBtn);
  }

  private hideConfirm(): void {
    this.confirmActive = false;
    const confirmBtn = this.confirmOverlay?.getData('confirmBtn') as Phaser.GameObjects.Text | undefined;
    const cancelBtn = this.confirmOverlay?.getData('cancelBtn') as Phaser.GameObjects.Text | undefined;
    confirmBtn?.destroy();
    cancelBtn?.destroy();
    this.confirmOverlay?.destroy();
    this.confirmText?.destroy();
    this.confirmOverlay = undefined;
    this.confirmText = undefined;
  }
}
