import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Bomb } from '../entities/Bomb';
import { Alien } from '../entities/Alien';
import { AlienGrid } from '../entities/AlienGrid';
import { Shield } from '../entities/Shield';
import { ScoreManager } from '../managers/ScoreManager';
import { LevelManager } from '../managers/LevelManager';
import { AudioManager } from '../managers/AudioManager';
import { GAME_WIDTH, GAME_HEIGHT, SHIELD_COUNT } from '../constants';

/**
 * Game Scene
 *
 * Main game logic with all entities, collision detection, and game state.
 * Handles player input, enemy AI, scoring, and level progression.
 *
 * Extends Phaser.Scene.
 */
export class GameScene extends Phaser.Scene {
  // Game entities
  private player: Player | null = null;
  private alienGrid: AlienGrid | null = null;
  private shields: Shield[] = [];
  
  // Physics groups
  private bullets: Phaser.Physics.Arcade.Group | null = null;
  private bombs: Phaser.Physics.Arcade.Group | null = null;
  private aliens: Phaser.Physics.Arcade.Group | null = null;
  
  // Game state
  private score: number = 0;
  private level: number = 1;
  private lives: number = 3;
  private useWebcam: boolean = false;
  private gameActive: boolean = true;
  
  // UI elements
  private scoreText: Phaser.GameObjects.Text | null = null;
  private livesText: Phaser.GameObjects.Text | null = null;
  private levelText: Phaser.GameObjects.Text | null = null;
  
  // Managers
  private scoreManager: ScoreManager | null = null;
  private levelManager: LevelManager | null = null;
  private audioManager: AudioManager | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Get scene data from previous scene
    const data = this.scene.settings.data as { level?: number; score?: number; useWebcam?: boolean };
    this.level = data.level || 1;
    this.score = data.score || 0;
    this.useWebcam = data.useWebcam || false;
    
    this.setupGameObjects();
    this.setupPhysicsGroups();
    this.setupCollisions();
    this.setupUI();
    this.setupManagers();
    this.setupInput();
    
    // Setup shutdown event for cleanup
    this.events.on('shutdown', () => {
      this.shutdown();
    });
  }

  update(): void {
    if (!this.gameActive) return;
    
    // Update player
    this.player?.update(16); // Approximate 60fps delta
    
    // Update bullets and remove inactive ones
    this.bullets?.children.entries.forEach((bullet: any) => {
      if (bullet && bullet.update) {
        bullet.update(16);
      }
    });
    
    // Update bombs and remove inactive ones
    this.bombs?.children.entries.forEach((bomb: any) => {
      if (bomb && bomb.update) {
        bomb.update(16);
      }
    });
    
    // Update alien grid
    this.alienGrid?.update(16);
    
    // Check win/lose conditions
    this.checkGameConditions();
  }

  private setupGameObjects(): void {
    // Create player
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 50);
    
    // Create alien grid
    this.levelManager = new LevelManager(this.level);
    const levelConfig = this.levelManager.getLevelConfig();
    this.alienGrid = new AlienGrid(this, 100, 100, levelConfig.alienRows, levelConfig.alienCols, levelConfig.alienSpeed);
    
    // Add aliens to physics group for collision detection
    this.addAliensToPhysicsGroup();
    
    // Create shields
    this.createShields();
  }

  private addAliensToPhysicsGroup(): void {
    if (!this.aliens || !this.alienGrid) return;
    
    const aliveAliens = this.alienGrid.getAliveAliens();
    aliveAliens.forEach(alien => {
      this.aliens!.add(alien);
    });
  }

  private createShields(): void {
    const shieldSpacing = GAME_WIDTH / (SHIELD_COUNT + 1);
    
    for (let i = 0; i < SHIELD_COUNT; i++) {
      const x = shieldSpacing * (i + 1);
      const y = GAME_HEIGHT - 150;
      const shield = new Shield(this, x, y);
      this.shields.push(shield);
    }
  }

  private setupPhysicsGroups(): void {
    // Create physics groups for collision detection
    this.bullets = this.physics.add.group({
      classType: Bullet,
      runChildUpdate: false // We'll update manually
    });
    
    this.bombs = this.physics.add.group({
      classType: Bomb,
      runChildUpdate: false // We'll update manually
    });
    
    this.aliens = this.physics.add.group({
      classType: Alien,
      runChildUpdate: false // AlienGrid handles updates
    });
  }

  private setupCollisions(): void {
    if (!this.bullets || !this.bombs || !this.aliens || !this.player) return;
    
    // Bullet vs Alien
    this.physics.add.overlap(
      this.bullets,
      this.aliens,
      this.handleBulletAlienCollision,
      undefined,
      this
    );
    
    // Bomb vs Player
    this.physics.add.overlap(
      this.bombs,
      this.player,
      this.handleBombPlayerCollision,
      undefined,
      this
    );
    
    // Bullet vs Shield
    this.physics.add.overlap(
      this.bullets,
      this.shields,
      this.handleBulletShieldCollision,
      undefined,
      this
    );
    
    // Bomb vs Shield
    this.physics.add.overlap(
      this.bombs,
      this.shields,
      this.handleBombShieldCollision,
      undefined,
      this
    );
    
    // Alien vs Player (game over)
    this.physics.add.overlap(
      this.aliens,
      this.player,
      this.handleAlienPlayerCollision,
      undefined,
      this
    );
  }

  private setupUI(): void {
    // Score display
    this.scoreText = this.add.text(10, 10, `SCORE: ${this.score}`, {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    });
    
    // Lives display
    this.livesText = this.add.text(10, 40, `LIVES: ${this.lives}`, {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    });
    
    // Level display
    this.levelText = this.add.text(10, 70, `LEVEL: ${this.level}`, {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    });
  }

  private setupManagers(): void {
    // Initialize managers
    this.scoreManager = new ScoreManager();
    this.levelManager = new LevelManager(this.level);
    this.audioManager = new AudioManager(this);
    
    // Load initial score
    if (this.score > 0) {
      this.scoreManager.addPoints(this.score);
    }
  }

  private setupInput(): void {
    // Player shooting is handled by Player class via events
    // Listen for projectile events from entities
    this.events.on('fireBullet', (x: number, y: number) => {
      this.fireBullet(x, y);
    });
    
    this.events.on('dropBomb', (x: number, y: number) => {
      this.dropBomb(x, y);
    });
    
    // Additional game controls
    this.input.keyboard?.on('keydown-P', () => {
      this.togglePause();
    });
  }

  /**
   * Fire a bullet from the player and add it to the physics group
   * Called by Player entity when shooting
   */
  fireBullet(x: number, y: number): Bullet | null {
    if (!this.bullets || !this.gameActive) return null;
    
    const bullet = new Bullet(this, x, y);
    this.bullets.add(bullet);
    
    // Play shoot sound
    this.audioManager?.play('shoot');
    
    return bullet;
  }

  /**
   * Drop a bomb from an alien and add it to the physics group
   * Called by AlienGrid when dropping bombs
   */
  dropBomb(x: number, y: number): Bomb | null {
    if (!this.bombs || !this.gameActive) return null;
    
    const bomb = new Bomb(this, x, y);
    this.bombs.add(bomb);
    
    return bomb;
  }

  private handleBulletAlienCollision(object1: any, object2: any): void {
    const bullet = object1 as Bullet;
    const alien = object2 as Alien;
    
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
    const bomb = object1 as Bomb;
    const player = object2 as Player;
    
    if (!bomb.isActive() || !player.active) return;
    
    // Destroy bomb
    bomb.hit();
    
    // Damage player
    player.takeDamage();
    this.handlePlayerDeath();
    
    // Play sound
    this.audioManager?.play('player-hit');
  }

  private handleBulletShieldCollision(object1: any, object2: any): void {
    const bullet = object1 as Bullet;
    const shield = object2 as Shield;
    
    if (!bullet.isActive() || shield.isDestroyed()) return;
    
    // Check pixel collision
    if (shield.checkPixelCollision(bullet.x, bullet.y)) {
      bullet.hit();
      shield.explode(bullet.x, bullet.y);
    }
  }

  private handleBombShieldCollision(object1: any, object2: any): void {
    const bomb = object1 as Bomb;
    const shield = object2 as Shield;
    
    if (!bomb.isActive() || shield.isDestroyed()) return;
    
    // Check pixel collision
    if (shield.checkPixelCollision(bomb.x, bomb.y)) {
      bomb.hit();
      shield.explode(bomb.x, bomb.y);
    }
  }

  private handleAlienPlayerCollision(object1: any, object2: any): void {
    const alien = object1 as Alien;
    const player = object2 as Player;
    
    if (!alien.isAlive() || !player.active) return;
    
    // Game over immediately
    this.gameOver();
  }

  private handlePlayerDeath(): void {
    this.lives--;
    this.updateLivesDisplay();
    
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      // Respawn player after delay
      this.time.delayedCall(2000, () => {
        this.player?.reset();
      });
    }
  }

  private addScore(points: number): void {
    this.score += points;
    this.scoreManager?.addPoints(points);
    this.updateScoreDisplay();
  }

  private updateScoreDisplay(): void {
    if (this.scoreText) {
      this.scoreText.setText(`SCORE: ${this.score}`);
    }
  }

  private updateLivesDisplay(): void {
    if (this.livesText) {
      this.livesText.setText(`LIVES: ${this.lives}`);
    }
  }

  private checkGameConditions(): void {
    if (!this.alienGrid) return;
    
    // Check if all aliens destroyed
    if (this.alienGrid.isAllDestroyed()) {
      this.levelComplete();
    }
    
    // Check if aliens reached player
    if (this.alienGrid.reachedPlayer()) {
      this.gameOver();
    }
  }

  private levelComplete(): void {
    this.gameActive = false;
    
    // Show level complete message
    const completeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LEVEL COMPLETE!', {
      fontSize: '36px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    }).setOrigin(0.5);
    
    // Wait then start next level
    this.time.delayedCall(3000, () => {
      completeText.destroy();
      this.startNextLevel();
    });
  }

  private startNextLevel(): void {
    this.level++;
    this.gameActive = true;
    
    // Clear existing entities
    this.clearGameObjects();
    
    // Setup new level
    this.levelManager = new LevelManager(this.level);
    const levelConfig = this.levelManager.getLevelConfig();
    this.alienGrid = new AlienGrid(this, 100, 100, levelConfig.alienRows, levelConfig.alienCols, levelConfig.alienSpeed);
    
    // Add aliens to physics group for collision detection
    this.addAliensToPhysicsGroup();
    
    // Reset shields
    this.shields.forEach(shield => shield.reset());
    
    // Update display
    if (this.levelText) {
      this.levelText.setText(`LEVEL: ${this.level}`);
    }
  }

  private gameOver(): void {
    this.gameActive = false;
    
    // Save high score
    if (this.scoreManager?.isHighScore()) {
      this.scoreManager.saveHighScore('Player', this.level);
    }
    
    // Transition to game over scene
    this.scene.start('GameOverScene', { score: this.score, level: this.level });
  }

  private clearGameObjects(): void {
    // Clear alien grid
    this.alienGrid?.destroy();
    this.alienGrid = null;
    
    // Clear physics groups (bullets, bombs, aliens)
    this.bullets?.clear(true, true);
    this.bombs?.clear(true, true);
    this.aliens?.clear(true, true);
  }

  private togglePause(): void {
    // Simple pause implementation
    this.scene.pause();
    
    // Show pause message
    const pauseText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSED\nPress P to resume', {
      fontSize: '24px',
      fontFamily: 'Courier New',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5);
    
    // Resume on P key
    this.input.keyboard?.once('keydown-P', () => {
      pauseText.destroy();
      this.scene.resume();
    });
  }

  shutdown(): void {
    // Cleanup managers
    this.audioManager?.cleanup();
    
    // Clear game objects
    this.clearGameObjects();
  }
}
