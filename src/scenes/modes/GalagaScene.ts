import { BaseGameScene } from '../base/BaseGameScene';
import { Player } from '../../entities/Player';
import { GalagaGrid } from '../../entities/GalagaGrid';
import { Alien, AlienState } from '../../entities/Alien';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_HEIGHT, AUTO_SWITCH_INTERVAL } from '../../constants';
import { GameMode } from '../../types/GameMode';
import { CountdownOverlay } from '../../ui/CountdownOverlay';

/**
 * Galaga Scene
 * 
 * Implements the Galaga game mode with:
 * - 3 fixed rows of aliens
 * - Wave attack patterns
 * - Alien vs Player collision (crash, lose life)
 * - Animated cloud background
 * - Wave count display
 */
export class GalagaScene extends BaseGameScene {
  private alienGrid: GalagaGrid | null = null;
  protected bulletAlienCollider: Phaser.Physics.Arcade.Collider | null = null;
  protected bombPlayerCollider: Phaser.Physics.Arcade.Collider | null = null;
  protected alienPlayerCollider: Phaser.Physics.Arcade.Collider | null = null;
  private clouds: Phaser.GameObjects.Graphics[] = [];
  private _hasCheckedInitialConditions: boolean = false;
  private _aliensReady: boolean = false;
  private startCountdown?: CountdownOverlay;

  constructor() {
    super('GalagaScene');
  }

  async create(): Promise<void> {
    await super.create();
    this.beginStartCountdown();
  }

  // =========================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // =========================================================================

  protected createPlayer(): void {
    // Create Player at bottom center
    const playerStartY = GAME_HEIGHT - PLAYER_HEIGHT - 20;
    this.player = new Player(this, GAME_WIDTH / 2, playerStartY, this.playerTextureKey);
  }

  protected createEnemies(): void {
    console.log('[GalagaScene] createEnemies called');
    
    // Create GalagaGrid with level config
    const levelConfig = this.levelManager!.getLevelConfig();
    
    this.alienGrid = new GalagaGrid(
      this,
      100,
      100,
      3, // Fixed 3 rows for Galaga
      levelConfig.alienCols,
      levelConfig.galagaFormationSpeed || 60,
      levelConfig.galagaHomingStrength || 0,
      this.alienFaceTextures,
      this.level,
      {
        minSize: levelConfig.galagaWaveMinSize,
        maxSize: levelConfig.galagaWaveMaxSize,
        maxWaves: levelConfig.galagaMaxSimultaneousWaves
      }
    );

    console.log('[GalagaScene] GalagaGrid created');

    // Add aliens to physics group
    this.addAliensToPhysicsGroup();
  }

  private addAliensToPhysicsGroup(): void {
    if (!this.aliens || !this.alienGrid) return;

    const aliveAliens = this.alienGrid.getAliveAliens();
    console.log(`[GalagaScene] Adding ${aliveAliens.length} aliens to physics group`);
    
    aliveAliens.forEach((alien: any) => {
      if (alien) {
        this.aliens!.add(alien);
      }
    });
    
    console.log(`[GalagaScene] Physics group now has ${this.aliens.getChildren().length} aliens`);
    
    // Mark that aliens are ready
    this._aliensReady = true;
  }

  protected setupCollisions(): void {
    if (!this.bullets || !this.bombs || !this.aliens || !this.player) return;

    // Bullet vs Alien (use shared handler from BaseGameScene)
    this.bulletAlienCollider = this.physics.add.overlap(
      this.bullets,
      this.aliens,
      this.handleBulletAlienCollision,
      undefined,
      this
    );

    // Bomb vs Player (use shared handler from BaseGameScene)
    this.bombPlayerCollider = this.physics.add.overlap(
      this.bombs,
      this.player,
      this.handleBombPlayerCollision,
      undefined,
      this
    );

    // Alien vs Player - Galaga specific (crash, lose life)
    this.alienPlayerCollider = this.physics.add.overlap(
      this.aliens,
      this.player,
      this.handleAlienPlayerCollision,
      undefined,
      this
    );
  }

  // ========================================================================
  // GALAGA-SPECIFIC COLLISION HANDLER
  // ========================================================================

  private handleAlienPlayerCollision(object1: any, object2: any): void {
    const alien = object1 instanceof Alien ? object1 : (object2 instanceof Alien ? object2 : null);
    const player = object1 instanceof Player ? object1 : (object2 instanceof Player ? object2 : null);
    if (!alien || !player) return;

    // Only collide with diving aliens (not formation aliens)
    if (!alien.isAlive() || !player.active || !this.gameActive) return;
    if (alien.getState() === AlienState.IN_FORMATION) return;

    // Alien crashes into player - both destroyed, lose life
    alien.destroy();
    this.loseLife();
    this.audioManager?.play('player-hit');
  }

  protected createModeUI(): void {
    // Wave count display for Galaga
    if (this.waveCountText) {
      this.waveCountText.setVisible(true);
      this.updateWaveCountDisplay();
    }
  }

  protected createBackground(): void {
    // Create animated clouds
    const cloudCount = 5;
    const cloudColor = 0x4a5568; // Gray clouds
    const cloudAlpha = 0.4;

    for (let i = 0; i < cloudCount; i++) {
      const cloud = this.add.graphics();
      cloud.setDepth(-1); // Behind everything else
      
      // Random starting position
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT * 0.5;
      
      // Draw simple cloud shape using circles
      cloud.fillStyle(cloudColor, cloudAlpha);
      const cloudWidth = 40 + Math.random() * 30;
      const cloudHeight = 20 + Math.random() * 15;
      
      // Multiple circles to form cloud shape
      cloud.fillCircle(0, 0, cloudHeight);
      cloud.fillCircle(cloudWidth * 0.3, -cloudHeight * 0.3, cloudHeight * 0.8);
      cloud.fillCircle(cloudWidth * 0.7, cloudHeight * 0.2, cloudHeight * 0.9);
      cloud.fillCircle(cloudWidth, 0, cloudHeight * 0.7);
      
      cloud.setPosition(x, y);
      this.clouds.push(cloud);
      
      // Animate cloud movement
      const driftSpeed = 20 + Math.random() * 30; // pixels per second
      this.tweens.add({
        targets: cloud,
        x: GAME_WIDTH + cloudWidth,
        duration: (GAME_WIDTH + cloudWidth) / driftSpeed * 1000,
        repeat: -1,
        onRepeat: () => {
          cloud.x = -cloudWidth;
          cloud.y = Math.random() * GAME_HEIGHT * 0.5;
        }
      });
      
      this.clouds.push(cloud);
    }
  }

  protected checkGameConditions(): void {
    if (!this.gameActive) return;

    // Don't check until aliens are ready
    if (!this._aliensReady || !this.alienGrid) {
      return;
    }

    // Debug: Check alien grid state
    const aliveCount = this.alienGrid.getAliveCount();
    const isDestroyed = this.alienGrid.isAllDestroyed();
    console.log(`[GalagaScene] checkGameConditions - aliveCount: ${aliveCount}, isAllDestroyed: ${isDestroyed}, aliensReady: ${this._aliensReady}`);

    // Check if all aliens destroyed (use grid's method like Space Invaders does)
    if (isDestroyed) {
      console.log(`[GalagaScene] Aliens destroyed, calling onLevelComplete()`);
      this.onLevelComplete();
      return;
    }

    // In Galaga, aliens don't cause game over by reaching bottom
    // Only losing all lives ends the game
  }

  protected onLevelComplete(): void {
    console.log(`[GalagaScene] Level ${this.level} complete! levelsSinceLastSwitch: ${this.levelsSinceLastSwitch}`);
    this.gameActive = false;

    // Increment level counter for auto-switch
    this.levelsSinceLastSwitch++;

    // Clear all bombs immediately to prevent player death during victory screen
    this.clearAllBombs();

    // Disable player collisions to prevent any remaining projectiles from hitting player
    if (this.player) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      if (playerBody) {
        playerBody.checkCollision.none = true;
      }
    }

    // Show completion text
    const completeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LEVEL COMPLETE!', {
      fontSize: '32px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    // Check for mode switch
    this.time.delayedCall(2000, () => {
      completeText.destroy();

      if (this.shouldAutoSwitch()) {
        console.log(`[GalagaScene] Auto-switching to Space Invaders after ${this.levelsSinceLastSwitch} levels`);
        this.switchToMode(GameMode.SPACE_INVADERS);
      } else {
        console.log(`[GalagaScene] Continuing to next level. levelsSinceLastSwitch: ${this.levelsSinceLastSwitch}/${AUTO_SWITCH_INTERVAL}`);
        // Continue to next level
        this.startNextLevel();
      }
    });
  }

  protected onGameOver(): void {
    // Use AbductionScene for Galaga game over (same as Space Invaders)
    this.endGame({
      gameOverScene: 'AbductionScene',
      additionalData: {
        playerTextureKey: this.playerTextureKey
      }
    });
  }

  protected updateMode(delta: number): void {
    // Update alien grid
    if (this.alienGrid) {
      this.alienGrid.update(delta);
    }

    // Update wave count display (only if UI is initialized)
    this.updateWaveCountDisplay();
  }

  protected onResetState(): void {
    console.log('[GalagaScene] onResetState() - resetting mode-specific variables');
    // Reset Galaga specific state
    this.alienGrid = null;
    this._hasCheckedInitialConditions = false;
    this._aliensReady = false;
    // clouds will be cleared in onClearEntities
  }

  protected onClearEntities(): void {
    console.log('[GalagaScene] onClearEntities - resetting _aliensReady to false');

    // Reset aliens ready flag
    this._aliensReady = false;

    this.startCountdown?.destroy();
    this.startCountdown = undefined;

    // Clear alien grid
    if (this.alienGrid) {
      this.alienGrid.destroy();
      this.alienGrid = null;
    }

    // Clear physics groups
    this.aliens?.clear(true, true);
    this.bullets?.clear(true, true);
    this.bombs?.clear(true, true);

    // Clear clouds
    this.clouds.forEach(cloud => cloud.destroy());
    this.clouds = [];
  }

  // =========================================================================
  // GALAGA-SPECIFIC METHODS
  // =========================================================================

  private beginStartCountdown(): void {
    // Pause gameplay update loop until countdown completes
    this.gameActive = false;
    this.startCountdown = new CountdownOverlay(this, {
      start: 3,
      label: 'More invaders... get ready!',
      onComplete: () => {
        this.gameActive = true;
      }
    });
  }

  private updateWaveCountDisplay(): void {
    if (this.waveCountText && this.waveCountText.active && this.alienGrid) {
      const waveCount = this.alienGrid.getActiveWaveCount();
      this.waveCountText.setText(`WAVES: ${waveCount}`);
    }
  }

  protected async startNextLevel(): Promise<void> {
    // Advance to next level
    this.advanceLevel();
    this.gameActive = true;

    // Re-enable player collisions
    if (this.player) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      if (playerBody) {
        playerBody.checkCollision.none = false;
        playerBody.checkCollision.up = true;
        playerBody.checkCollision.down = true;
        playerBody.checkCollision.left = true;
        playerBody.checkCollision.right = true;
      }
    }

    // Clear existing entities
    this.clearForNextLevel();

    // Prepare alien textures for new level (in case alien count changed)
    await this.prepareAlienFaceTextures();

    // Get level config (levelManager was already advanced by advanceLevel())
    const levelConfig = this.levelManager!.getLevelConfig();

    // Recreate enemies
    this.alienGrid = new GalagaGrid(
      this,
      100,
      100,
      3,
      levelConfig.alienCols,
      levelConfig.galagaFormationSpeed || 60,
      levelConfig.galagaHomingStrength || 0,
      this.alienFaceTextures,
      this.level,
      {
        minSize: levelConfig.galagaWaveMinSize,
        maxSize: levelConfig.galagaWaveMaxSize,
        maxWaves: levelConfig.galagaMaxSimultaneousWaves
      }
    );

    // Add new aliens to physics group
    this.addAliensToPhysicsGroup();
  }

  private clearForNextLevel(): void {
    console.log('[GalagaScene] clearForNextLevel - resetting _aliensReady to false');

    // Reset aliens ready flag
    this._aliensReady = false;

    // Clear alien grid
    if (this.alienGrid) {
      this.alienGrid.destroy();
      this.alienGrid = null;
    }

    // Clear physics groups
    this.aliens?.clear(true, false);
    this.bullets?.clear(true, false);
    this.bombs?.clear(true, false);
  }

  // =========================================================================
  // OVERRIDE FOR CLEANUP
  // =========================================================================

  protected onDestroy(): void {
    // Clear Galaga-specific entities
    if (this.alienGrid) {
      this.alienGrid.destroy();
      this.alienGrid = null;
    }
    
    this.clouds.forEach(cloud => cloud.destroy());
    this.clouds = [];
  }
}
