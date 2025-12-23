import Phaser from 'phaser';

export class DebugMenuScene extends Phaser.Scene {
  private menuItems: { text: string; scene: string }[] = [
    { text: '1 - Player Movement & Shooting', scene: 'PlayerTestScene' },
    { text: '2 - Armada Movement', scene: 'ArmadaTestScene' },
    { text: '3 - Bullet Collisions', scene: 'CollisionTestScene' },
    { text: '4 - Camera Capture to Sprite', scene: 'CameraTestScene' },
    { text: '5 - Sprite Debug (SVG & Faces)', scene: 'SpriteDebugScene' },
    { text: '6 - Compare: Game vs Sprite Debug', scene: 'CompareScene' },
    { text: '7 - Controller Debug', scene: 'ControllerDebugScene' },
    { text: '8 - Stored Faces', scene: 'StoredFacesScene' },
    { text: '9 - Abduction Animation', scene: 'AbductionScene' },
    { text: '0 - Abduction Line', scene: 'AbductionLineScene' },
    { text: 'ESC - Back to Main Menu', scene: 'MenuScene' }
  ];

  private textObjects: Phaser.GameObjects.Text[] = [];
  private selectedIndex: number = 0;
  
  // Input state
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevUp: boolean = false;
  private prevDown: boolean = false;
  private prevFire: boolean = false;
  private lastStickMove: number = 0;

  constructor() {
    super({ key: 'DebugMenuScene' });
  }

  create(): void {
    const { width } = this.cameras.main;

    this.add.text(width / 2, 60, 'DEBUG MENU', {
      fontSize: '36px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    // Create menu items
    this.menuItems.forEach((item, i) => {
      const text = this.add.text(width / 2, 150 + i * 40, item.text, {
        fontSize: '22px',
        fontFamily: 'Courier New',
        color: i === 0 ? '#ffff00' : '#ffffff'
      }).setOrigin(0.5);
      
      this.textObjects.push(text);
    });

    this.setupKeyboard();
    
    // Initial connection check
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      this.gamepad = this.input.gamepad.getPad(0);
    }
  }

  update(): void {
    this.handleGamepadInput();
  }

  private setupKeyboard(): void {
    // Number keys shortcuts
    this.input.keyboard?.on('keydown-ONE', () => this.launchScene(0));
    this.input.keyboard?.on('keydown-TWO', () => this.launchScene(1));
    this.input.keyboard?.on('keydown-THREE', () => this.launchScene(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.launchScene(3));
    this.input.keyboard?.on('keydown-FIVE', () => this.launchScene(4));
    this.input.keyboard?.on('keydown-SIX', () => this.launchScene(5));
    this.input.keyboard?.on('keydown-SEVEN', () => this.launchScene(6));
    this.input.keyboard?.on('keydown-EIGHT', () => this.launchScene(7));
    this.input.keyboard?.on('keydown-NINE', () => this.launchScene(8));
    this.input.keyboard?.on('keydown-ZERO', () => this.launchScene(9));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));

    // Navigation keys
    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.launchScene(this.selectedIndex));
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
    
    // Update visuals
    this.textObjects.forEach((text, i) => {
      text.setColor(i === this.selectedIndex ? '#ffff00' : '#ffffff');
    });
  }

  private launchScene(index: number): void {
    const item = this.menuItems[index];
    if (item) {
      this.scene.start(item.scene);
    }
  }
}
