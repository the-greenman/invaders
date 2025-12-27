import { BaseGameScene } from '../base/BaseGameScene';
import { Player } from '../../entities/Player';
import { GalagaGrid } from '../../entities/GalagaGrid';
import { Alien, AlienState } from '../../entities/Alien';
import { LevelManager } from '../../managers/LevelManager';
import { GameMode } from '../../types/GameMode';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_HEIGHT, PLAYER_WIDTH } from '../../constants';

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

  constructor() {
    super('GalagaScene');
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

    // Add aliens to physics group
    this.addAliensToPhysicsGroup();
  }

  private addAliensToPhysicsGroup(): void {
    if (!this.aliens || !this.alienGrid) return;

    const aliveAliens = this.alienGrid.getAliveAliens();
    aliveAliens.forEach((alien: any) => {
      if (alien) {
        this.aliens!.add(alien);
      }
    });
  }

  protected setupCollisions(): void {
    // Bullet vs Alien (shared logic)
    this.bulletAlienCollider = this.physics.add.collider(
      this.bullets!,
      this.aliens!,
      (bullet: any, alien: any) => {
        // Handle bullet-alien collision
        if (bullet && bullet.active && alien && alien.isAlive && typeof alien.isAlive === 'function') {
          if (alien.isAlive()) {
            alien.destroy();
            bullet.setActive(false);
            bullet.setVisible(false);
            
            if (alien.getPoints && typeof alien.getPoints === 'function') {
              this.addScore(alien.getPoints());
            }
            this.audioManager?.play('alien-hit');
          }
        }
      }
    );

    // Bomb vs Player (shared logic)
    this.bombPlayerCollider = this.physics.add.collider(
      this.bombs!,
      this.player!,
      (bomb: any, player: any) => {
        if (bomb.active && this.gameActive) {
          bomb.setActive(false);
          bomb.setVisible(false);
          this.loseLife();
          this.audioManager?.play('player-hit');
        }
      }
    );

    // Alien vs Player - Galaga specific (crash, lose life)
    this.alienPlayerCollider = this.physics.add.overlap(
      this.aliens!,
      this.player!,
      (alien: any, player: any) => {
        if (alien && alien.isAlive && typeof alien.isAlive === 'function' && alien.getState && this.gameActive) {
          if (alien.isAlive() && alien.getState() !== AlienState.IN_FORMATION) {
            // Alien crashes into player - both destroyed, lose life
            alien.destroy();
            this.loseLife();
            this.audioManager?.play('player-hit');
          }
        }
      }
    );
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

    // Check if all aliens destroyed
    const aliveAliens = this.aliens?.getChildren().filter((alien: any) => 
      alien.active && alien.isAlive && typeof alien.isAlive === 'function' && alien.isAlive()
    ) || [];

    if (aliveAliens.length === 0) {
      this.onLevelComplete();
      return;
    }

    // In Galaga, aliens don't cause game over by reaching bottom
    // Only losing all lives ends the game
  }

  protected onLevelComplete(): void {
    this.gameActive = false;
    
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
        this.switchToMode(GameMode.SPACE_INVADERS);
      } else {
        // Continue to next level
        this.startNextLevel();
      }
    });
  }

  protected onGameOver(): void {
    this.gameActive = false;
    
    // Transition to GameOverScene
    this.scene.start('GameOverScene', { 
      score: this.score, 
      level: this.level 
    });
  }

  protected updateMode(delta: number): void {
    // Update alien grid
    if (this.alienGrid) {
      this.alienGrid.update(delta);
      
      // Update wave count display
      this.updateWaveCountDisplay();
    }
  }

  // =========================================================================
  // GALAGA-SPECIFIC METHODS
  // =========================================================================

  private updateWaveCountDisplay(): void {
    if (this.waveCountText && this.alienGrid) {
      const waveCount = this.alienGrid.getActiveWaveCount();
      this.waveCountText.setText(`WAVES: ${waveCount}`);
    }
  }

  protected async startNextLevel(): Promise<void> {
    this.level++;
    this.gameActive = true;
    
    // Clear existing entities
    this.clearForNextLevel();
    
    // Setup new level
    this.levelManager = new LevelManager(this.level, this.difficulty);
    const levelConfig = this.levelManager!.getLevelConfig();
    
    // Call parent's prepareAlienFaceTextures through reflection
    await (this as any).prepareAlienFaceTextures();
    
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

    // Update UI
    if (this.levelText) {
      this.levelText.setText(`LEVEL: ${this.level}`);
    }
  }

  private clearForNextLevel(): void {
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
