import Phaser from 'phaser';

type DebugMenuItem = {
  label: string;
  scene: string;
  shortcut?: {
    display: string;
    phaserKeydownEvent: string;
  };
};

export class DebugMenuScene extends Phaser.Scene {
  private menuItems: DebugMenuItem[] = [
    { label: 'Player Movement & Shooting', scene: 'PlayerTestScene', shortcut: { display: '1', phaserKeydownEvent: 'keydown-ONE' } },
    { label: 'Armada Movement', scene: 'ArmadaTestScene', shortcut: { display: '2', phaserKeydownEvent: 'keydown-TWO' } },
    { label: 'Bullet Collisions', scene: 'CollisionTestScene', shortcut: { display: '3', phaserKeydownEvent: 'keydown-THREE' } },
    { label: 'Camera Capture to Sprite', scene: 'CameraTestScene', shortcut: { display: '4', phaserKeydownEvent: 'keydown-FOUR' } },
    { label: 'Sprite Debug (SVG & Faces)', scene: 'SpriteDebugScene', shortcut: { display: '5', phaserKeydownEvent: 'keydown-FIVE' } },
    { label: 'Compare: Game vs Sprite Debug', scene: 'CompareScene', shortcut: { display: '6', phaserKeydownEvent: 'keydown-SIX' } },
    { label: 'Controller Debug', scene: 'ControllerDebugScene', shortcut: { display: '7', phaserKeydownEvent: 'keydown-SEVEN' } },
    { label: 'Stored Faces', scene: 'StoredFacesScene', shortcut: { display: '8', phaserKeydownEvent: 'keydown-EIGHT' } },
    { label: 'Abduction Animation', scene: 'AbductionScene', shortcut: { display: '9', phaserKeydownEvent: 'keydown-NINE' } },
    { label: 'Abduction Line', scene: 'AbductionLineScene', shortcut: { display: '0', phaserKeydownEvent: 'keydown-ZERO' } },
    { label: 'Bomb Drop Test', scene: 'BombTestScene', shortcut: { display: 'B', phaserKeydownEvent: 'keydown-B' } },
    { label: 'Mobile Touch Controls', scene: 'MobileDebugScene', shortcut: { display: 'M', phaserKeydownEvent: 'keydown-M' } },
    { label: 'Back to Main Menu', scene: 'MenuScene', shortcut: { display: 'ESC', phaserKeydownEvent: 'keydown-ESC' } }
  ];

  private textObjects: Phaser.GameObjects.Text[] = [];
  private selectedIndex: number = 0;

  private scrollOffset: number = 0;
  private itemsPerPage: number = 0;
  private menuStartY: number = 150;
  private menuItemSpacing: number = 40;
  
  // Input state
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevUp: boolean = false;
  private prevDown: boolean = false;
  private prevFire: boolean = false;
  private lastStickMove: number = 0;

  private initialUpdateEvent: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'DebugMenuScene' });
  }

  create(): void {
    this.resetState();

    const { width, height } = this.cameras.main;

    this.add.text(width / 2, 60, 'DEBUG MENU', {
      fontSize: '36px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    this.itemsPerPage = Math.max(1, Math.floor((height - this.menuStartY - 40) / this.menuItemSpacing));

    this.menuItems.forEach((item, i) => {
      const prefix = item.shortcut ? `${item.shortcut.display} - ` : '';
      const text = this.add.text(width / 2, this.menuStartY + i * this.menuItemSpacing, `${prefix}${item.label}`, {
        fontSize: '22px',
        fontFamily: 'Courier New',
        color: '#ffffff'
      }).setOrigin(0.5);
      
      this.textObjects.push(text);
    });

    this.setupKeyboard();

    this.input.on('wheel', this.onWheel, this);
    
    // Initial connection check
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      this.gamepad = this.input.gamepad.getPad(0);
    }

    this.initialUpdateEvent = this.time.delayedCall(0, () => {
      this.updateMenuView();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  update(): void {
    this.handleGamepadInput();
  }

  private setupKeyboard(): void {
    this.menuItems.forEach((item, index) => {
      if (!item.shortcut) return;

      this.input.keyboard?.on(item.shortcut.phaserKeydownEvent, () => {
        this.launchScene(index);
      });
    });

    // Navigation keys
    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.launchScene(this.selectedIndex));

    this.input.keyboard?.on('keydown-PAGEUP', () => this.scrollBy(-this.itemsPerPage));
    this.input.keyboard?.on('keydown-PAGEDOWN', () => this.scrollBy(this.itemsPerPage));
  }

  private resetState(): void {
    if (this.initialUpdateEvent) {
      this.initialUpdateEvent.remove(false);
      this.initialUpdateEvent = null;
    }

    this.input.off('wheel', this.onWheel, this);
    this.input.keyboard?.removeAllListeners();

    this.textObjects.forEach((text) => text.destroy());
    this.textObjects = [];
    this.selectedIndex = 0;
    this.scrollOffset = 0;

    this.gamepad = null;
    this.prevUp = false;
    this.prevDown = false;
    this.prevFire = false;
    this.lastStickMove = 0;
  }

  private onShutdown(): void {
    if (this.initialUpdateEvent) {
      this.initialUpdateEvent.remove(false);
      this.initialUpdateEvent = null;
    }

    this.input.off('wheel', this.onWheel, this);
    this.input.keyboard?.removeAllListeners();

    this.textObjects.forEach((text) => text.destroy());
    this.textObjects = [];
  }

  private onWheel(_pointer: Phaser.Input.Pointer, _over: unknown[], _dx: number, dy: number): void {
    const direction = dy > 0 ? 1 : -1;
    this.scrollBy(direction);
  }

  private handleGamepadInput(): void {
    if (!this.input.gamepad) return;
    
    // Refresh gamepad if needed
    if (!this.gamepad || !this.gamepad.connected) {
      this.gamepad = this.input.gamepad.getPad(0);
    }
    
    if (!this.gamepad || !this.gamepad.connected) return;

    const now = Date.now();
    const axisY = this.gamepad.axes[1].getValue();
    const dpadUp = this.gamepad.up;
    const dpadDown = this.gamepad.down;

    // Up
    const isUp = dpadUp || axisY < -0.5;
    if (isUp && !this.prevUp) {
      if (now - this.lastStickMove > 200) {
        this.moveSelection(-1);
        this.lastStickMove = now;
      }
    }
    this.prevUp = isUp;

    // Down
    const isDown = dpadDown || axisY > 0.5;
    if (isDown && !this.prevDown) {
      if (now - this.lastStickMove > 200) {
        this.moveSelection(1);
        this.lastStickMove = now;
      }
    }
    this.prevDown = isDown;

    // Select (A button)
    const isFire = this.gamepad.A || this.gamepad.buttons[0]?.pressed;
    if (isFire && !this.prevFire) {
      this.launchScene(this.selectedIndex);
    }
    this.prevFire = isFire;
    
    // Back (B button or Start) - Optional shortcut to Main Menu
    if (this.gamepad.B || this.gamepad.buttons[1]?.pressed) {
        // Debounce handled by scene transition, but good to be careful
        this.scene.start('MenuScene');
    }
  }

  private moveSelection(delta: number): void {
    // Update index
    this.selectedIndex = (this.selectedIndex + delta + this.menuItems.length) % this.menuItems.length;

    this.ensureSelectedVisible();
    this.updateMenuView();
  }

  private scrollBy(delta: number): void {
    if (this.menuItems.length <= this.itemsPerPage) return;

    const maxOffset = Math.max(0, this.menuItems.length - this.itemsPerPage);
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + delta, 0, maxOffset);
    this.updateMenuView();
  }

  private ensureSelectedVisible(): void {
    if (this.menuItems.length <= this.itemsPerPage) {
      this.scrollOffset = 0;
      return;
    }

    const maxOffset = Math.max(0, this.menuItems.length - this.itemsPerPage);
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + this.itemsPerPage) {
      this.scrollOffset = this.selectedIndex - this.itemsPerPage + 1;
    }

    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, maxOffset);
  }

  private updateMenuView(): void {
    const { width } = this.cameras.main;

    this.textObjects.forEach((text, i) => {
      const row = i - this.scrollOffset;
      const visible = row >= 0 && row < this.itemsPerPage;
      text.setVisible(visible);
      if (visible) {
        text.setPosition(width / 2, this.menuStartY + row * this.menuItemSpacing);
        if (i === this.selectedIndex) {
          text.setTint(0xffff00);
        } else {
          text.clearTint();
        }
      }
    });
  }

  private launchScene(index: number): void {
    const item = this.menuItems[index];
    if (item) {
      this.scene.start(item.scene);
    }
  }
}
