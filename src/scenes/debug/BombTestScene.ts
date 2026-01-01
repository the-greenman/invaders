import Phaser from 'phaser';
import { Bomb } from '../../entities/Bomb';
import { Alien } from '../../entities/Alien';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  BOMB_DROP_BASE_CHANCE,
  BOMB_DROP_LEVEL_INCREASE,
  BOMB_DROP_ENABLED
} from '../../constants';
import { DebugBaseScene } from './DebugBaseScene';

/**
 * Bomb Test Scene
 *
 * Debug scene for testing bomb mechanics:
 * - Player drops bombs instead of shooting
 * - Adjust level to see bomb drop rate changes
 * - Visualize bomb drop rate per level
 */
export class BombTestScene extends DebugBaseScene {
  private player?: Phaser.GameObjects.Rectangle;
  private bombs?: Phaser.Physics.Arcade.Group;
  private aliens?: Phaser.Physics.Arcade.Group;
  private alienGrid: (Alien | null)[][] = [];
  private level: number = 1;
  private levelText?: Phaser.GameObjects.Text;
  private statsText?: Phaser.GameObjects.Text;
  private instructionsText?: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private bombsDropped: number = 0;
  private startTime: number = 0;
  private bombDropEnabled: boolean = BOMB_DROP_ENABLED;

  // Alien grid config (scaled down for testing)
  private readonly GRID_ROWS = 3;
  private readonly GRID_COLS = 5;
  private readonly ALIEN_SPACING_X = 90;
  private readonly ALIEN_SPACING_Y = 70;
  private readonly GRID_START_X = 250;
  private readonly GRID_START_Y = 150;

  constructor() {
    super({ key: 'BombTestScene' });
  }

  create(): void {
    this.startTime = Date.now();
    this.bombsDropped = 0;

    this.initDebugBase();

    // Title
    this.add.text(GAME_WIDTH / 2, 30, 'BOMB DROP TEST', {
      fontSize: '28px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    // Instructions
    this.instructionsText = this.add.text(GAME_WIDTH / 2, 65,
      '← →: Change Level  |  T: Toggle Drops  |  ESC: Back', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Level display
    this.levelText = this.add.text(GAME_WIDTH / 2, 95, '', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#ffff00'
    }).setOrigin(0.5);

    // Stats display
    this.statsText = this.add.text(20, 380, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#00ffff',
      lineSpacing: 6
    });

    this.updateDisplays();

    // Create player (rectangle at bottom)
    this.player = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 60,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      0x00ff00
    );
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    // Create physics groups
    this.bombs = this.physics.add.group({
      classType: Bomb,
      runChildUpdate: true,
      maxSize: 50
    });

    this.aliens = this.physics.add.group({
      classType: Alien,
      runChildUpdate: false
    });

    // Create alien grid
    this.createSpaceInvadersGrid();

    // Setup event listener for alien bomb drops
    this.events.on('dropBomb', (x: number, y: number) => {
      this.dropBomb(x, y);
    });

    // Input
    this.cursors = this.input.keyboard?.createCursorKeys();

    this.input.keyboard?.on('keydown-ESC', () => this.exit());
    this.input.keyboard?.on('keydown-LEFT', () => this.changeLevel(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.changeLevel(1));
    this.input.keyboard?.on('keydown-T', () => this.toggleBombDrops());

    // Cleanup on shutdown
    this.events.on('shutdown', () => this.cleanup());
  }

  update(): void {
    if (!this.player || !this.cursors) return;

    this.pollBackToDebugMenu();

    // Player movement
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let moveX = 0;
    if (this.cursors.left.isDown) moveX = -1;
    else if (this.cursors.right.isDown) moveX = 1;
    body.setVelocityX(moveX * 300);

    // Simulate alien bomb dropping
    if (this.bombDropEnabled) {
      this.simulateBombDrops();
    }

    // Update stats periodically
    if (this.time.now % 500 < 16) { // Every ~0.5 second
      this.updateDisplays();
    }

    // Clean up off-screen bombs
    this.bombs?.children.entries.forEach((bomb: any) => {
      if (bomb && bomb.active && bomb.y > GAME_HEIGHT + 50) {
        bomb.setActive(false).setVisible(false);
      }
    });
  }

  private createSpaceInvadersGrid(): void {
    this.alienGrid = [];

    for (let row = 0; row < this.GRID_ROWS; row++) {
      this.alienGrid[row] = [];
      for (let col = 0; col < this.GRID_COLS; col++) {
        const x = this.GRID_START_X + col * this.ALIEN_SPACING_X;
        const y = this.GRID_START_Y + row * this.ALIEN_SPACING_Y;
        const type = row; // Different types per row

        const alien = new Alien(this, x, y, type, { row, col }, `alien-${type}`);
        this.aliens?.add(alien);
        this.alienGrid[row][col] = alien;
      }
    }
  }

  /**
   * Simulate bomb dropping using the configurable constants
   * This replicates the actual game logic
   */
  private simulateBombDrops(): void {
    const dropChance = this.calculateBombDropChance(this.level);

    // Check each alien for bomb drop (per frame, like the actual game would)
    for (let row = 0; row < this.GRID_ROWS; row++) {
      for (let col = 0; col < this.GRID_COLS; col++) {
        const alien = this.alienGrid[row][col];
        if (!alien || !alien.active) continue;

        // Random chance to drop bomb
        if (Math.random() < dropChance) {
          // Find bottom-most alien in this column
          let bottomAlien: Alien | null = null;
          for (let r = this.GRID_ROWS - 1; r >= 0; r--) {
            const a = this.alienGrid[r][col];
            if (a && a.active) {
              bottomAlien = a;
              break;
            }
          }

          if (bottomAlien) {
            this.events.emit('dropBomb', bottomAlien.x, bottomAlien.y + 20);
            return; // Only one bomb per frame max
          }
        }
      }
    }
  }

  private dropBomb(x: number, y: number): void {
    if (!this.bombs) return;

    const bomb = this.bombs.get(x, y, 'bomb') as Bomb | null;
    if (!bomb) return;

    bomb.setActive(true);
    bomb.setVisible(true);
    const body = bomb.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.setVelocity(0, 200); // BOMB_SPEED
      body.checkCollision.none = false;
    }

    this.bombsDropped++;
  }

  private toggleBombDrops(): void {
    this.bombDropEnabled = !this.bombDropEnabled;
    this.updateDisplays();
  }

  private changeLevel(delta: number): void {
    this.level = Math.max(1, Math.min(20, this.level + delta));
    this.updateDisplays();
  }

  private updateDisplays(): void {
    // Calculate bomb drop chance for current level
    const dropChance = this.calculateBombDropChance(this.level);
    const dropsPerSecond = this.calculateDropsPerSecond(this.level);
    const dropsPerMinute = dropsPerSecond * 60;

    // Update level text
    if (this.levelText) {
      this.levelText.setText(`Level ${this.level} - ${this.bombDropEnabled ? 'DROPS ENABLED' : 'DROPS DISABLED'}`);
    }

    // Calculate time elapsed and drop rate
    const timeElapsed = (Date.now() - this.startTime) / 1000;
    const currentDropRate = timeElapsed > 0 ? (this.bombsDropped / timeElapsed).toFixed(2) : '0.00';

    // Count active aliens
    const activeAliens = this.alienGrid.flat().filter(a => a && a.active).length;

    // Update stats text
    if (this.statsText) {
      this.statsText.setText([
        `=== CONFIGURATION ===`,
        `Base Chance: ${BOMB_DROP_BASE_CHANCE.toFixed(4)} (${(BOMB_DROP_BASE_CHANCE * 100).toFixed(2)}%)`,
        `Level Increase: +${BOMB_DROP_LEVEL_INCREASE.toFixed(4)} per level`,
        `Enabled: ${BOMB_DROP_ENABLED ? 'YES' : 'NO'} (Toggle: T)`,
        ``,
        `=== LEVEL ${this.level} SIMULATION ===`,
        `Drop Chance/Frame: ${(dropChance * 100).toFixed(3)}%`,
        `Est. Drops/Sec: ${dropsPerSecond.toFixed(2)} (@ 60 FPS)`,
        `Est. Drops/Min: ${dropsPerMinute.toFixed(1)}`,
        ``,
        `=== LIVE STATS ===`,
        `Active Aliens: ${activeAliens}/${this.GRID_ROWS * this.GRID_COLS}`,
        `Active Bombs: ${this.bombs?.countActive(true) || 0}`,
        `Total Dropped: ${this.bombsDropped}`,
        `Time Elapsed: ${timeElapsed.toFixed(1)}s`,
        `Actual Rate: ${currentDropRate} bombs/sec`
      ].join('\n'));
    }
  }

  /**
   * Calculate bomb drop chance for a given level
   */
  private calculateBombDropChance(level: number): number {
    return BOMB_DROP_BASE_CHANCE + (BOMB_DROP_LEVEL_INCREASE * (level - 1));
  }

  /**
   * Estimate drops per second for a given level
   * Based on actual alien count in test grid
   */
  private calculateDropsPerSecond(level: number): number {
    const dropChance = this.calculateBombDropChance(level);
    const fps = 60;
    const alienCount = this.alienGrid.flat().filter(a => a && a.active).length;
    // Per frame, each alien has dropChance probability
    // Expected drops per frame = alienCount * dropChance
    // Expected drops per second = fps * alienCount * dropChance
    return fps * alienCount * dropChance;
  }

  private exit(): void {
    this.scene.start('DebugMenuScene');
  }

  private cleanup(): void {
    // Safely clear physics groups (they may already be destroyed by Phaser)
    try {
      if (this.bombs && this.bombs.children) {
        this.bombs.clear(true, true);
      }
    } catch (e) {
      // Group already destroyed by Phaser
    }

    try {
      if (this.aliens && this.aliens.children) {
        this.aliens.clear(true, true);
      }
    } catch (e) {
      // Group already destroyed by Phaser
    }

    this.alienGrid = [];
    this.input.keyboard?.removeAllKeys();
    this.events.off('dropBomb');
  }
}
