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

    // Bullet vs Alien (shared logic - points awarded)
    this.bulletAlienCollider = this.physics.add.overlap(
      this.bullets,
      this.aliens,
      this.handleBulletAlienCollision,
      undefined,
      this
    );

    // Bomb vs Player (shared logic - lose life)
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
    if (!this.alienGrid) return;

    // Check if all aliens destroyed
    if (this.alienGrid.isAllDestroyed()) {
      this.onLevelComplete();
      return;
    }

    // Check if aliens reached player (Space Invaders specific game over)
    if (this.alienGrid.reachedPlayer()) {
      this.onGameOver();
    }
  }

  protected onLevelComplete(): void {
    this.gameActive = false;
    
    // Increment level counter for auto-switch
    this.levelsSinceLastSwitch++;
    
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
    this.gameActive = false;
    
    // Save high score
    if (this.scoreManager?.isHighScore()) {
      this.scoreManager.saveHighScore('Player', this.level);
    }
    
    // Transition to game over scene
    this.scene.start('AbductionScene', {
      score: this.score,
      level: this.level,
      playerTextureKey: this.playerTextureKey
    });
  }

  protected updateMode(delta: number): void {
    // Update alien grid
    this.alienGrid?.update(delta);
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

  private startNextLevel(): void {
    this.advanceLevel();
    this.gameActive = true;
    
    // Clear existing entities but keep physics groups and colliders
    this.clearForNextLevel();
    
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
  // COLLISION HANDLERS
  // ========================================================================

  private handleBulletAlienCollision(object1: any, object2: any): void {
    // Determine which object is which
    const bullet = object1 instanceof Alien ? object2 : object1;
    const alien = object1 instanceof Alien ? object1 : object2;
    if (!bullet || !alien) return;

    if (!bullet.isActive() || !alien.isAlive()) return;

    // Destroy bullet
    bullet.hit();

    // Destroy alien and get points
    const points = alien.destroy();
    this.addScore(points);

    // Remove alien from grid
    this.alienGrid?.removeAlien(alien);

    // Play sound
    this.audioManager?.play('alien-hit');
  }

  private handleBombPlayerCollision(object1: any, object2: any): void {
    // Determine which object is which
    const bomb = object1 instanceof Player ? object2 : object1;
    const player = object1 instanceof Player ? object1 : object2;
    if (!bomb || !player) return;

    if (!bomb.isActive() || !player.active) return;

    // Destroy bomb
    bomb.hit();

    // Damage player
    player.takeDamage();
    this.loseLife();

    // Play sound
    this.audioManager?.play('player-hit');
  }

  private handleAlienPlayerCollision(object1: any, object2: any): void {
    const objA = object1 as any;
    const objB = object2 as any;
    const alien = objA instanceof Alien ? objA : (objB instanceof Alien ? objB : null);
    const player = objA instanceof Player ? objA : (objB instanceof Player ? objB : null);
    if (!alien || !player) return;
    
    if (!alien.isAlive() || !player.active) return;
    
    // Space Invaders specific: collision is immediate game over
    this.onGameOver();
  }
}
