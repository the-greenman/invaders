import { BaseGameScene } from '../base/BaseGameScene';
import { Player } from '../../entities/Player';
import { SpaceInvadersGrid } from '../../entities/SpaceInvadersGrid';
import { BaseAlienGrid } from '../../entities/BaseAlienGrid';
import { Alien } from '../../entities/Alien';
import { Shield } from '../../entities/Shield';
import { GameMode } from '../../types/GameMode';
import { GAME_WIDTH, GAME_HEIGHT, ABDUCTION_THRESHOLD_Y } from '../../constants';

/**
 * Space Invaders Game Scene
 * 
 * Implements classic Space Invaders gameplay:
 * - Alien grid moves horizontally and drops down
 * - Game over if aliens reach the player (abduction)
 * - Shields provide cover
 * - Fixed alien formation (no diving attacks)
 */
export class SpaceInvadersScene extends BaseGameScene {
  // Mode-specific entity
  private alienGrid: SpaceInvadersGrid | null = null;

  constructor() {
    super('SpaceInvadersScene');
  }

  // ========================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ========================================================================

  protected createPlayer(): void {
    // Create player at bottom center for SI mode
    const playerStartY = GAME_HEIGHT - 50;
    this.player = new Player(this, GAME_WIDTH / 2, playerStartY, this.playerTextureKey);
  }

  protected createEnemies(): void {
    // Create Space Invaders grid with level config
    const levelConfig = this.levelManager!.getLevelConfig();
    
    this.alienGrid = new SpaceInvadersGrid(
      this,
      100,
      100,
      levelConfig.alienRows,
      levelConfig.alienCols,
      levelConfig.alienSpeed,
      this.alienFaceTextures,
      this.level
    );

    // Add aliens to physics group for collision detection
    this.addAliensToPhysicsGroup();
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

    // Alien vs Player (Space Invaders specific = instant game over)
    this.alienPlayerCollider = this.physics.add.overlap(
      this.aliens,
      this.player,
      this.handleAlienPlayerCollision,
      undefined,
      this
    );

    // Create shields for Space Invaders
    this.createShields();
  }

  protected createModeUI(): void {
    // No additional UI needed for Space Invaders mode
    // Core UI (score, level, lives) is handled by BaseGameScene
  }

  protected createBackground(): void {
    // Space Invaders: Draw abduction threshold line
    const line = this.add.line(0, 0, 0, ABDUCTION_THRESHOLD_Y, GAME_WIDTH, ABDUCTION_THRESHOLD_Y, 0x00ff00, 0.3);
    line.setOrigin(0, 0);
    line.setDepth(-1); // Behind everything else
    this.backgroundElements.push(line);
  }

  protected checkGameConditions(): void {
    if (!this.alienGrid) {
      console.log('[SpaceInvadersScene] checkGameConditions - alienGrid is null, returning');
      return;
    }

    const aliveCount = this.alienGrid.getAliveAliens().length;
    const isDestroyed = this.alienGrid.isAllDestroyed();

    // Only log when something interesting happens
    if (isDestroyed || aliveCount === 0) {
      console.log('[SpaceInvadersScene] checkGameConditions - aliveCount:', aliveCount, 'isDestroyed:', isDestroyed);
    }

    // Check if all aliens destroyed
    if (isDestroyed) {
      console.log('[SpaceInvadersScene] All aliens destroyed! Calling onLevelComplete()');
      this.onLevelComplete();
      return;
    }

    // Check if aliens reached player (Space Invaders specific game over)
    if (this.alienGrid.reachedPlayer()) {
      console.log('[SpaceInvadersScene] Aliens reached player! Game over');
      this.onGameOver();
    }
  }

  protected onLevelComplete(): void {
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

    // Show level complete message
    const completeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LEVEL COMPLETE!', {
      fontSize: '36px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);

    // Wait then either switch mode (auto) or start next level
    this.time.delayedCall(3000, () => {
      completeText.destroy();
      if (!this.shouldAutoSwitch()) {
        this.startNextLevel();
      } else {
        // Switch to Galaga mode
        this.switchToMode(GameMode.GALAGA);
      }
    });
  }

  protected onGameOver(): void {
    // Use AbductionScene for Space Invaders game over (custom animation)
    this.endGame({
      gameOverScene: 'AbductionScene',
      additionalData: {
        playerTextureKey: this.playerTextureKey
      }
    });
  }

  protected updateMode(delta: number): void {
    // Update alien grid
    this.alienGrid?.update(delta);
  }

  protected onResetState(): void {
    console.log('[SpaceInvadersScene] onResetState() - resetting mode-specific variables');
    // Reset Space Invaders specific state
    // alienGrid will be recreated during initialization, so just null it out
    this.alienGrid = null;
  }

  protected onClearEntities(): void {
    console.log('[SpaceInvadersScene] onClearEntities()');
    this.alienGrid?.destroy();
    this.alienGrid = null;

    this.shields.forEach(shield => shield.destroy());
    this.shields = [];
  }

  protected onShutdown(): void {
    console.log('[SpaceInvadersScene] onShutdown()');
    this.onClearEntities();
  }

  // ========================================================================
  // SPACE INVADERS SPECIFIC IMPLEMENTATIONS
  // ========================================================================

  private createShields(): void {
    const shieldSpacing = GAME_WIDTH / 5; // 5 shields for SI
    
    for (let i = 0; i < 5; i++) {
      const x = shieldSpacing * (i + 0.5);
      const y = GAME_HEIGHT - 150;
      const shield = new Shield(this, x, y);
      this.shields.push(shield);
    }
  }

  private addAliensToPhysicsGroup(): void {
    if (!this.aliens || !this.alienGrid) return;

    const aliveAliens = this.alienGrid.getAliveAliens();
    aliveAliens.forEach(alien => {
      this.aliens!.add(alien);
    });
  }

  private async startNextLevel(): Promise<void> {
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

    // Clear existing entities but keep physics groups and colliders
    this.clearForNextLevel();

    // Prepare alien textures for new level (in case alien count changed)
    await this.prepareAlienFaceTextures();

    // Setup new level
    const levelConfig = this.levelManager!.getLevelConfig();
    this.alienGrid = new SpaceInvadersGrid(
      this,
      100,
      100,
      levelConfig.alienRows,
      levelConfig.alienCols,
      levelConfig.alienSpeed,
      this.alienFaceTextures,
      this.level
    );

    // Add aliens to physics group for collision detection
    this.addAliensToPhysicsGroup();
  }

  private clearForNextLevel(): void {
    // Remove alien grid
    this.alienGrid?.destroy();
    this.alienGrid = null;

    // Remove shields
    this.shields.forEach(shield => shield.destroy());
    this.shields = [];

    // Deactivate/destroy remaining bullets and bombs
    if (this.bullets) {
      (this.bullets.getChildren() as any[]).forEach(c => c.setActive(false).setVisible(false));
    }
    if (this.bombs) {
      (this.bombs.getChildren() as any[]).forEach(c => c.setActive(false).setVisible(false));
    }

    // Remove old aliens from group entirely
    if (this.aliens) {
      (this.aliens.getChildren() as any[]).forEach(a => a.destroy());
      this.aliens.clear(true, true);
    }
  }

  // ========================================================================
  // SPACE INVADERS-SPECIFIC COLLISION HANDLER
  // ========================================================================

  private handleAlienPlayerCollision(object1: any, object2: any): void {
    const alien = object1 instanceof Alien ? object1 : (object2 instanceof Alien ? object2 : null);
    const player = object1 instanceof Player ? object1 : (object2 instanceof Player ? object2 : null);
    if (!alien || !player) return;

    if (!alien.isAlive() || !player.active) return;

    // Space Invaders specific: collision is immediate game over (abduction)
    this.onGameOver();
  }
}
