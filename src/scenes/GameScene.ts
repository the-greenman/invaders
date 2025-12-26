import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Bomb } from '../entities/Bomb';
import { Alien } from '../entities/Alien';
import { SpaceInvadersGrid } from '../entities/SpaceInvadersGrid';
import { GalagaGrid } from '../entities/GalagaGrid';
import { BaseAlienGrid } from '../entities/BaseAlienGrid';
import { Shield } from '../entities/Shield';
import { ScoreManager } from '../managers/ScoreManager';
import { LevelManager } from '../managers/LevelManager';
import { AudioManager } from '../managers/AudioManager';
import { FaceManager } from '../managers/FaceManager';
import { TouchControlManager } from '../managers/TouchControlManager';
import { LocalStorage } from '../utils/localStorage';
import { GameMode, getGameModeName } from '../types/GameMode';
import { getModeIntroSceneKey, getTransitionSceneKey } from '../modes/modeScenes';
import { GAME_WIDTH, GAME_HEIGHT, SHIELD_COUNT, PLAYER_CORE_RADIUS, PLAYER_HEIGHT, PLAYER_WIDTH, ALIEN_WIDTH, ALIEN_HEIGHT, ALIEN_CORE_RADIUS, COLORS, ALIEN_TINT_ALPHA, ABDUCTION_THRESHOLD_Y, AUTO_SWITCH_INTERVAL, ENABLE_MANUAL_MODE_SWITCH } from '../constants';

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
  private alienGrid: BaseAlienGrid | null = null; // Polymorphic: can be SpaceInvadersGrid or GalagaGrid
  private shields: Shield[] = [];

  // Physics groups
  private bullets: Phaser.Physics.Arcade.Group | null = null;
  private bombs: Phaser.Physics.Arcade.Group | null = null;
  private aliens: Phaser.Physics.Arcade.Group | null = null;

  // Colliders
  private bulletAlienCollider: Phaser.Physics.Arcade.Collider | null = null;
  private bombPlayerCollider: Phaser.Physics.Arcade.Collider | null = null;
  private alienPlayerCollider: Phaser.Physics.Arcade.Collider | null = null;

  // Game state
  private score: number = 0;
  private level: number = 1;
  private lives: number = 3;
  private useWebcam: boolean = false;
  private gameActive: boolean = true;
  private playerTextureKey: string = 'player';

  // Game Mode (Galaga Mode Integration)
  private currentGameMode: GameMode = GameMode.SPACE_INVADERS;
  private levelsSinceLastSwitch: number = 0;

  // UI elements
  private scoreText: Phaser.GameObjects.Text | null = null;
  private levelText: Phaser.GameObjects.Text | null = null;
  private livesText: Phaser.GameObjects.Text | null = null;
  private gameModeText: Phaser.GameObjects.Text | null = null; // Display current mode
  private waveCountText: Phaser.GameObjects.Text | null = null; // For Galaga mode
  
  // Managers
  private scoreManager: ScoreManager | null = null;
  private levelManager: LevelManager | null = null;
  private audioManager: AudioManager | null = null;
  private touchControlManager: TouchControlManager | null = null;
  private debugCollisions: boolean = false;
  private lastDebugLog: number = 0;
  private alienFaceTextures: string[] = [];
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private backButtonIndex: number = 10;
  private muteButtonIndex: number = 4;
  private prevBackPressed: boolean = false;
  private prevMutePressed: boolean = false;
  private muteButton: Phaser.GameObjects.Text | null = null;

  private disableBackToMenu: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  async create(): Promise<void> {
    // Get scene data from previous scene
    const data = this.scene.settings.data as { level?: number; score?: number; useWebcam?: boolean; viewport?: { x: number; y: number; width: number; height: number }, startMode?: GameMode; disableBackToMenu?: boolean };
    this.level = data.level || 1;
    this.score = data.score || 0;
    this.useWebcam = data.useWebcam || false;
    this.disableBackToMenu = !!data.disableBackToMenu;
    if (data.startMode !== undefined) {
      this.currentGameMode = data.startMode;
      this.levelsSinceLastSwitch = 0;
    }
    
    // Reset game state
    this.gameActive = true;
    if (this.level === 1 && this.score === 0) {
      this.lives = 3;
    }

    // Optional viewport for split-screen debug
    if (data.viewport) {
      this.cameras.main.setViewport(data.viewport.x, data.viewport.y, data.viewport.width, data.viewport.height);
    }

    const settings = LocalStorage.getSettings();
    this.backButtonIndex = settings.controllerBackButton ?? 1;

    // Prepare textures with faces if available
    await this.preparePlayerTexture();
    await this.prepareAlienFaceTextures();
    
    // Create physics groups first so we can add aliens to them
    this.setupPhysicsGroups();
    this.setupGameObjects();
    this.setupCollisions();
    this.setupUI();
    this.setupManagers();
    this.setupInput();

    // Setup shutdown handler using Phaser's event system
    this.events.once('shutdown', this.handleShutdown, this);
  }

  /**
   * Called when scene is being shut down
   */
  private handleShutdown(): void {
    console.log('[GameScene] shutdown called');

    // Destroy collision handlers first - CRITICAL for preventing duplicate collisions
    if (this.bulletAlienCollider) {
      this.bulletAlienCollider.destroy();
      this.bulletAlienCollider = null;
    }
    if (this.bombPlayerCollider) {
      this.bombPlayerCollider.destroy();
      this.bombPlayerCollider = null;
    }
    if (this.alienPlayerCollider) {
      this.alienPlayerCollider.destroy();
      this.alienPlayerCollider = null;
    }

    // Remove event listeners to prevent memory leaks
    this.events.off('fireBullet');
    this.events.off('dropBomb');
    this.input.keyboard?.off('keydown-P');
    this.input.keyboard?.off('keydown-L');

    // Cleanup managers
    this.audioManager?.cleanup();
    this.touchControlManager?.destroy();
    this.touchControlManager = null;

    // Clear game objects
    this.clearGameObjects();
  }

  update(): void {
    if (!this.gameActive) return;

    this.pollGamepadNavigation();

    // Update player
    this.player?.update(16); // Approximate 60fps delta

    // Clean up bullets that are out of bounds
    if (this.bullets && this.bullets.children) {
      this.bullets.children.entries.forEach((bullet: any) => {
        if (bullet && bullet.active) {
          if (bullet.y < -20) {
            bullet.setActive(false);
            bullet.setVisible(false);
          }
        }
      });
    }

    // Clean up bombs that are out of bounds
    if (this.bombs && this.bombs.children) {
      this.bombs.children.entries.forEach((bomb: any) => {
        if (bomb && bomb.active) {
          if (bomb.y > GAME_HEIGHT + 40) {
            bomb.setActive(false);
            bomb.setVisible(false);
          }
        }
      });
    }

    // Update alien grid
    this.alienGrid?.update(16);

    // Update wave count UI (Galaga mode only)
    if (this.waveCountText) {
      if (this.currentGameMode === GameMode.GALAGA && this.alienGrid instanceof GalagaGrid) {
        const waveCount = (this.alienGrid as GalagaGrid).getActiveWaveCount?.() ?? 0;
        this.waveCountText.setVisible(true);
        this.waveCountText.setText(`WAVES: ${waveCount}`);
      } else {
        this.waveCountText.setVisible(false);
      }
    }

    // Check win/lose conditions
    this.checkGameConditions();

    // Periodic collision debug
    if (this.debugCollisions) {
      const now = this.time.now;
      if (now - this.lastDebugLog > 500) {
        const bulletsCount = this.bullets ? this.bullets.getChildren().length : 0;
        const aliensCount = this.aliens ? this.aliens.getChildren().length : 0;
        // @ts-ignore
        const anyOverlap = this.physics.overlap(this.bullets as any, this.aliens as any);
        console.log('[GameScene][dbg] bullets:', bulletsCount, 'aliens:', aliensCount, 'overlap?', anyOverlap);
        this.lastDebugLog = now;
      }
    }
  }

  private setupGameObjects(): void {
    // Create player
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, this.playerTextureKey);

    // Create alien grid using factory pattern based on currentGameMode
    this.levelManager = new LevelManager(this.level);
    const levelConfig = this.levelManager.getLevelConfig();

    // Mode-specific creation
    if (this.currentGameMode === GameMode.GALAGA) {
      // Galaga grid (Game 2)
      this.alienGrid = new GalagaGrid(
        this,
        100,
        100,
        3,
        levelConfig.alienCols,
        levelConfig.galagaFormationSpeed || 60,
        this.alienFaceTextures,
        this.level
      );
    } else {
      // Space Invaders grid (Game 1)
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
    }

    // Add aliens to physics group for collision detection
    this.addAliensToPhysicsGroup();

  }

  private addAliensToPhysicsGroup(): void {
    if (!this.aliens || !this.alienGrid) return;

    const aliveAliens = this.alienGrid.getAliveAliens();
    aliveAliens.forEach(alien => {
      this.aliens!.add(alien);
    });
    // Debug: confirm count
    // console.log('[GameScene] aliens in group:', this.aliens.getChildren().length);
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
      runChildUpdate: true // Allow bombs to cull themselves
    });
    
    this.aliens = this.physics.add.group({
      classType: Alien,
      runChildUpdate: false // AlienGrid handles updates
    });
  }

  private setupCollisions(): void {
    if (!this.bullets || !this.bombs || !this.aliens || !this.player) return;

    // Bullet vs Alien
    this.bulletAlienCollider = this.physics.add.overlap(
      this.bullets,
      this.aliens,
      this.handleBulletAlienCollision,
      undefined,
      this
    );

    // Bomb vs Player
    this.bombPlayerCollider = this.physics.add.overlap(
      this.bombs,
      this.player,
      this.handleBombPlayerCollision,
      undefined,
      this
    );

    // Alien vs Player (game over)
    this.alienPlayerCollider = this.physics.add.overlap(
      this.aliens,
      this.player,
      this.handleAlienPlayerCollision,
      undefined,
      this
    );
    // Debug: log setup complete
    // console.log('[GameScene] collisions set up');
  }

  private setupUI(): void {
    // Score display
    this.scoreText = this.add.text(10, 10, `SCORE: ${this.score}`, {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    });

    // Level display
    this.levelText = this.add.text(10, 40, `LEVEL: ${this.level}`, {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    });

    // Lives display
    this.livesText = this.add.text(10, 70, `LIVES: ${this.lives}`, {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    });

    // Game Mode display (top-right, below mute button)
    this.gameModeText = this.add.text(GAME_WIDTH - 20, 50, getGameModeName(this.currentGameMode), {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#ffff00' // Yellow for visibility
    })
    .setOrigin(1, 0); // Top-right anchor

    // Wave count display (only visible in Galaga mode)
    this.waveCountText = this.add.text(GAME_WIDTH - 20, 75, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#00ffff' // Cyan
    })
    .setOrigin(1, 0)
    .setVisible(this.currentGameMode === GameMode.GALAGA);

    // Debug hint for manual mode switching
    if (ENABLE_MANUAL_MODE_SWITCH) {
      this.add.text(10, GAME_HEIGHT - 30, 'Press 1 or 2 to switch modes', {
        fontSize: '14px',
        fontFamily: 'Courier New',
        color: '#666666'
      });
    }

    // Mute button
    const isMuted = this.audioManager?.isMuted() ?? false;
    this.muteButton = this.add.text(GAME_WIDTH - 20, 20, isMuted ? 'MUSIC: OFF' : 'MUSIC: ON', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    })
    .setOrigin(1, 0) // Top-right anchor
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => this.handleMuteToggle());

    // Abduction threshold line
    const thresholdY = ABDUCTION_THRESHOLD_Y;
    const line = this.add.line(0, 0, 0, thresholdY, GAME_WIDTH, thresholdY, 0x00ff00, 0.3);
    line.setOrigin(0, 0);
    this.add.text(GAME_WIDTH - 150, thresholdY - 20, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    });
  }

  private setupManagers(): void {
    // Initialize managers
    this.scoreManager = new ScoreManager();
    this.levelManager = new LevelManager(this.level);
    this.audioManager = new AudioManager(this);
    this.touchControlManager = new TouchControlManager(this);

    // Register all sound effects
    this.audioManager.registerSound('shoot');
    this.audioManager.registerSound('explosion');
    this.audioManager.registerSound('alien-hit');
    this.audioManager.registerSound('player-hit');

    // Start background music
    this.audioManager.playMusic('background-music');

    // Load initial score
    if (this.score > 0) {
      this.scoreManager.addPoints(this.score);
    }

    // Set touch controls on player if available
    if (this.player && this.touchControlManager) {
      this.player.setTouchControls(this.touchControlManager);
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

    // Toggle collision debug
    this.input.keyboard?.on('keydown-L', () => {
      this.debugCollisions = !this.debugCollisions;
      console.log('[GameScene] collision debug', this.debugCollisions ? 'ON' : 'OFF');
    });

    // Manual mode switching (if enabled)
    if (ENABLE_MANUAL_MODE_SWITCH) {
      this.input.keyboard?.on('keydown-ONE', () => {
        this.forceGameMode(GameMode.SPACE_INVADERS);
      });

      this.input.keyboard?.on('keydown-TWO', () => {
        this.forceGameMode(GameMode.GALAGA);
      });
    }

    this.input.gamepad?.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepad = pad;
    });
  }

  /**
   * Fire a bullet from the player and add it to the physics group
   * Called by Player entity when shooting
   */
  fireBullet(x: number, y: number): Bullet | null {
    if (!this.bullets || !this.gameActive) return null;
    const bullet = this.bullets.get(x, y, 'bullet') as Bullet | null;
    if (!bullet) return null;
    bullet.launch(x, y);

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

    // Get bomb from pool (similar to bullets)
    const bomb = this.bombs.get(x, y, 'bomb') as Bomb | null;
    if (!bomb) return null;

    // Ensure bomb is properly initialized
    bomb.setActive(true);
    bomb.setVisible(true);
    const body = bomb.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.setVelocity(0, 200); // BOMB_SPEED
      body.checkCollision.none = false;
    }

    return bomb;
  }

  private pollGamepadNavigation(): void {
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      if (!this.gamepad || !this.gamepad.connected) {
        this.gamepad = this.input.gamepad.getPad(0);
      }
    }
    if (!this.gamepad || !this.gamepad.connected) {
      return;
    }
    const backPressed = this.backButtonIndex >= 0 ? this.gamepad.buttons[this.backButtonIndex]?.pressed : false;
    if (!this.disableBackToMenu && backPressed && !this.prevBackPressed) {
      this.scene.start('MenuScene');
      return;
    }
    this.prevBackPressed = !!backPressed;

    // Check mute toggle
    const mutePressed = this.gamepad.buttons[this.muteButtonIndex]?.pressed;
    if (mutePressed && !this.prevMutePressed) {
      this.handleMuteToggle();
    }
    this.prevMutePressed = !!mutePressed;
  }

  private handleMuteToggle(): void {
    if (!this.audioManager) return;
    this.audioManager.toggleMute();
    const isMuted = this.audioManager.isMuted();
    if (this.muteButton) {
      this.muteButton.setText(isMuted ? 'MUSIC: OFF' : 'MUSIC: ON');
    }
  }

  private handleBulletAlienCollision(object1: any, object2: any): void {
    // Determine which object is which
    const bullet = object1 instanceof Bullet ? object1 : (object2 instanceof Bullet ? object2 : null);
    const alien = object1 instanceof Alien ? object1 : (object2 instanceof Alien ? object2 : null);
    if (!bullet || !alien) return;

    if (!bullet.isActive() || !alien.isAlive()) return;
    // console.log('[GameScene] overlap bullet-alien', bullet.x, bullet.y, alien.x, alien.y);

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
    const bomb = object1 instanceof Bomb ? object1 : (object2 instanceof Bomb ? object2 : null);
    const player = object1 instanceof Player ? object1 : (object2 instanceof Player ? object2 : null);
    if (!bomb || !player) return;

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
    const objA = object1 as any;
    const objB = object2 as any;
    const alien = objA instanceof Alien ? objA : (objB instanceof Alien ? objB : null);
    const player = objA instanceof Player ? objA : (objB instanceof Player ? objB : null);
    if (!alien || !player) return;
    
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

    // Check if aliens reached player (Space Invaders only)
    // In Galaga, aliens can dive past the player and return to formation
    if (this.currentGameMode === GameMode.SPACE_INVADERS && this.alienGrid.reachedPlayer()) {
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
    
    // Wait then either switch mode (auto) or start next level
    this.time.delayedCall(3000, () => {
      completeText.destroy();
      if (!this.checkAutoSwitch()) {
        this.startNextLevel();
      }
    });
  }

  private async startNextLevel(): Promise<void> {
    this.level++;
    this.gameActive = true;
    
    // Clear existing entities but keep physics groups and colliders
    this.clearForNextLevel();
    
    // Setup new level
    this.levelManager = new LevelManager(this.level);
    const levelConfig = this.levelManager.getLevelConfig();
    await this.prepareAlienFaceTextures();
    if (this.currentGameMode === GameMode.GALAGA) {
      this.alienGrid = new GalagaGrid(
        this,
        100,
        100,
        3,
        levelConfig.alienCols,
        levelConfig.galagaFormationSpeed || 60,
        this.alienFaceTextures,
        this.level
      );
    } else {
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
    }
    
    // Add aliens to physics group for collision detection
    this.addAliensToPhysicsGroup();
    
    // Update display
    if (this.levelText) {
      this.levelText.setText(`LEVEL: ${this.level}`);
    }
  }

  // For level transitions: keep physics groups/colliders, clear entities only
  private clearForNextLevel(): void {
    // Remove alien grid
    this.alienGrid?.destroy();
    this.alienGrid = null;

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

  private gameOver(): void {
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

  private clearGameObjects(): void {
    // Clear alien grid
    this.alienGrid?.destroy();
    this.alienGrid = null;
    
    // Note: Physics groups are automatically cleaned up by Phaser during scene shutdown
    // We just need to nullify our references
    this.bullets = null;
    this.bombs = null;
    this.aliens = null;
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

  // ============================================================================
  // Game Mode Switching (Galaga Mode Integration)
  // ============================================================================

  /**
   * Force a specific game mode (manual switch)
   * @param mode - The mode to switch to
   *
   * Called by number key handlers (1 and 2). Shows transition scene
   * then restarts current level with new mode.
   */
  private forceGameMode(mode: GameMode): void {
    if (this.currentGameMode === mode) {
      return; // Already in this mode
    }
    console.log(`[GameScene] Manual mode switch to ${getGameModeName(mode)}`);
    // Choose dedicated transition scene or target mode intro scene; fallback to default
    const key = getTransitionSceneKey(this.currentGameMode, mode)
      || getModeIntroSceneKey(mode)
      || 'ModeTransitionScene';
    this.scene.start(key, {
      fromMode: this.currentGameMode,
      toMode: mode,
      level: this.level,
      score: this.score,
      useWebcam: this.useWebcam,
      advanceLevel: false
    });
  }

  /**
   * Switch game mode (internal method)
   * @param newMode - The mode to switch to
   *
   * Called by checkAutoSwitch() when AUTO_SWITCH_INTERVAL is reached.
   * Shows transition scene then advances to next level with new mode.
   */
  private switchGameMode(newMode: GameMode): void {
    console.log(`[GameScene] Auto mode switch to ${getGameModeName(newMode)}`);
    const key = getTransitionSceneKey(this.currentGameMode, newMode)
      || getModeIntroSceneKey(newMode)
      || 'ModeTransitionScene';
    this.scene.start(key, {
      fromMode: this.currentGameMode,
      toMode: newMode,
      level: this.level,
      score: this.score,
      useWebcam: this.useWebcam,
      advanceLevel: true
    });
  }

  /**
   * Check if auto mode switch should occur
   *
   * Called when level is completed. Checks if levelsSinceLastSwitch
   * has reached AUTO_SWITCH_INTERVAL and switches modes if so.
   *
   * @returns true if mode switched, false otherwise
   */
  private checkAutoSwitch(): boolean {
    this.levelsSinceLastSwitch++;
    if (this.levelsSinceLastSwitch >= AUTO_SWITCH_INTERVAL) {
      const newMode = this.currentGameMode === GameMode.SPACE_INVADERS
        ? GameMode.GALAGA
        : GameMode.SPACE_INVADERS;
      this.switchGameMode(newMode);
      return true;
    }
    return false;
  }

  /**
   * Build the player texture with the current face (if any) using shared FaceManager logic.
   */
  private async preparePlayerTexture(): Promise<void> {
    const currentFace = FaceManager.getCurrentFace();
    if (!currentFace) {
      const meta = this.cache.json.get('player-face-meta');
      if (this.textures.exists('default-face')) {
        const targetKey = 'player-face-default';
        try {
          FaceManager.composeFaceTexture(this, {
            baseKey: 'player',
            faceKey: 'default-face',
            targetKey,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            coreRadius: meta?.rx ?? PLAYER_CORE_RADIUS,
            faceCenterX: meta ? meta.relativeX * PLAYER_WIDTH : undefined,
            faceCenterY: meta ? meta.relativeY * PLAYER_HEIGHT : undefined,
            faceScale: 1.0,
            backingAlpha: 1.0
          });
          this.playerTextureKey = targetKey;
          return;
        } catch (e) {
          console.warn('Failed to compose default player face', e);
        }
      }
      this.playerTextureKey = 'player';
      return;
    }

    const srcKey = 'player-face-src';
    const targetKey = 'player-face-composite';
    try {
      await FaceManager.addBase64Texture(this, srcKey, currentFace);
      const meta = this.cache.json.get('player-face-meta');
      this.playerTextureKey = FaceManager.composeFaceTexture(this, {
        baseKey: 'player',
        faceKey: srcKey,
        targetKey,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        coreRadius: meta?.rx ?? PLAYER_CORE_RADIUS,
        faceCenterX: meta ? meta.relativeX * PLAYER_WIDTH : undefined,
        faceCenterY: meta ? meta.relativeY * PLAYER_HEIGHT : undefined,
        faceScale: 1.0,
        backingAlpha: 1.0
      });
    } catch (e) {
      console.warn('Failed to build player face texture, falling back to default', e);
      this.playerTextureKey = 'player';
    }
  }

  /**
   * Build alien face textures from stored face history (applied to alien-0 variants).
   */
  private async prepareAlienFaceTextures(): Promise<void> {
    const levelConfig = new LevelManager(this.level).getLevelConfig();
    const totalAliens = levelConfig.alienRows * levelConfig.alienCols;
    const history = LocalStorage.getFaceHistory();
    const textures: string[] = [];
    const defaultKey = await this.ensureDefaultAlienFaceTexture();

    // Use each stored face at most once per armada
    const facesToUse = history.slice(0, totalAliens);
    const meta = this.cache.json.get('alien1-face-meta');
    const coreRadius = meta?.rx ?? ALIEN_CORE_RADIUS;
    const centerX = meta ? meta.relativeX * ALIEN_WIDTH : undefined;
    const centerY = meta ? meta.relativeY * ALIEN_HEIGHT : undefined;

    for (const face of facesToUse) {
      const srcKey = `alien-face-src-${face.id}`;
      const targetKey = `alien-face-${face.id}`;
      try {
        await FaceManager.addBase64Texture(this, srcKey, face.imageData);
        // Tint faces green for aliens
        const tintedKey = `${srcKey}-green`;
        try {
          const tinted = await FaceManager.tintImage(face.imageData, COLORS.GREEN_TINT);
          await FaceManager.addBase64Texture(this, tintedKey, tinted);
        } catch {
          // fallback to original if tint fails
        }
        FaceManager.composeFaceTexture(this, {
          baseKey: 'alien-0',
          faceKey: (this.textures.exists(tintedKey) ? tintedKey : srcKey),
          targetKey,
          width: ALIEN_WIDTH,
          height: ALIEN_HEIGHT,
          coreRadius,
          faceCenterX: centerX,
          faceCenterY: centerY,
          faceScale: 1.0,
          backingAlpha: ALIEN_TINT_ALPHA
        });
        textures.push(targetKey);
      } catch (e) {
        console.warn('Failed to build alien face texture', e);
      }
    }
    // Fill remaining slots with default face so there are no duplicates of captured faces
    while (textures.length < totalAliens && defaultKey) {
      textures.push(defaultKey);
    }

    this.alienFaceTextures = textures;
  }

  /**
   * Build (or reuse) the default face texture for aliens.
   */
  private async ensureDefaultAlienFaceTexture(): Promise<string | null> {
    if (!this.textures.exists('default-face')) return null;
    const meta = this.cache.json.get('alien1-face-meta');
    const coreRadius = meta?.rx ?? ALIEN_CORE_RADIUS;
    const centerX = meta ? meta.relativeX * ALIEN_WIDTH : undefined;
    const centerY = meta ? meta.relativeY * ALIEN_HEIGHT : undefined;
    const targetKey = 'alien-face-default';

    if (this.textures.exists(targetKey)) {
      return targetKey;
    }

    let faceKey: string = 'default-face';
    const base64 = this.textures.getBase64('default-face');
    if (base64) {
      try {
        const tinted = await FaceManager.tintImage(base64, COLORS.GREEN_TINT);
        const tintedKey = 'alien-face-default-tinted';
        await FaceManager.addBase64Texture(this, tintedKey, tinted);
        faceKey = tintedKey;
      } catch (e) {
        console.warn('Failed to tint default face for aliens, using original', e);
      }
    }

    FaceManager.composeFaceTexture(this, {
      baseKey: 'alien-0',
      faceKey,
      targetKey,
      width: ALIEN_WIDTH,
      height: ALIEN_HEIGHT,
      coreRadius,
      faceCenterX: centerX,
      faceCenterY: centerY,
      faceScale: 1.0,
      backingAlpha: ALIEN_TINT_ALPHA
    });
    return targetKey;
  }
}
