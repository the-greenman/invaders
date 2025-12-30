import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { Bullet } from '../../entities/Bullet';
import { Bomb } from '../../entities/Bomb';
import { Alien } from '../../entities/Alien';
import { Shield } from '../../entities/Shield';
import { ScoreManager } from '../../managers/ScoreManager';
import { LevelManager } from '../../managers/LevelManager';
import { AudioManager } from '../../managers/AudioManager';
import { FaceManager } from '../../managers/FaceManager';
import { TouchControlManager } from '../../managers/TouchControlManager';
import { SpriteManager } from '../../managers/SpriteManager';
import { LocalStorage } from '../../utils/localStorage';
import { GameMode, getGameModeName } from '../../types/GameMode';
import { DifficultyPreset } from '../../types/DifficultyPreset';
import { GAME_WIDTH, GAME_HEIGHT, SHIELD_COUNT, PLAYER_CORE_RADIUS, PLAYER_HEIGHT, PLAYER_WIDTH, ALIEN_WIDTH, ALIEN_HEIGHT, ALIEN_CORE_RADIUS, COLORS, ALIEN_TINT_ALPHA, ABDUCTION_THRESHOLD_Y, AUTO_SWITCH_INTERVAL, ENABLE_MANUAL_MODE_SWITCH } from '../../constants';

/**
 * Base Game Scene - Abstract class for all game modes
 *
 * Provides shared functionality for:
 * - Game state management (score, level, lives, gameActive)
 * - Physics groups (bullets, bombs, enemies)
 * - Manager initialization and cleanup
 * - Core UI elements
 * - Input handling
 * - Template methods for mode-specific implementation
 *
 * Extended by SpaceInvadersScene and GalagaScene
 */
export abstract class BaseGameScene extends Phaser.Scene {
  // Game entities (protected for subclass access)
  protected player: Player | null = null;
  protected shields: Shield[] = [];

  // Physics groups
  protected bullets: Phaser.Physics.Arcade.Group | null = null;
  protected bombs: Phaser.Physics.Arcade.Group | null = null;
  protected aliens: Phaser.Physics.Arcade.Group | null = null;

  // Colliders
  protected bulletAlienCollider: Phaser.Physics.Arcade.Collider | null = null;
  protected bombPlayerCollider: Phaser.Physics.Arcade.Collider | null = null;
  protected alienPlayerCollider: Phaser.Physics.Arcade.Collider | null = null;

  // Game state
  protected score: number = 0;
  protected level: number = 1;
  protected lives: number = 3;
  protected useWebcam: boolean = false;
  protected gameActive: boolean = false; // Default to false, enabled after init
  protected playerTextureKey: string = 'player';

  // Game Mode
  protected currentGameMode: GameMode = GameMode.SPACE_INVADERS;
  protected levelsSinceLastSwitch: number = 0;
  protected difficulty: DifficultyPreset = DifficultyPreset.MEDIUM;

  private lastLifeLostAt: number = 0;
  private _loggedFirstUpdate: boolean = false;
  private _isInitialized: boolean = false;

  // UI elements
  protected scoreText: Phaser.GameObjects.Text | null = null;
  protected levelText: Phaser.GameObjects.Text | null = null;
  protected livesText: Phaser.GameObjects.Text | null = null;
  protected gameModeText: Phaser.GameObjects.Text | null = null;
  protected waveCountText: Phaser.GameObjects.Text | null = null;
  
  // Managers
  protected scoreManager: ScoreManager | null = null;
  protected levelManager: LevelManager | null = null;
  protected audioManager: AudioManager | null = null;
  protected touchControlManager: TouchControlManager | null = null;
  protected spriteManager: SpriteManager | null = null;
  protected debugCollisions: boolean = false;
  private lastDebugLog: number = 0;
  protected alienFaceTextures: string[] = [];
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private backButtonIndex: number = 10;
  private muteButtonIndex: number = 4;
  private prevBackPressed: boolean = false;
  private prevMutePressed: boolean = false;
  private muteButton: Phaser.GameObjects.Text | null = null;

  protected disableBackToMenu: boolean = false;

  // Background elements (mode-specific)
  protected backgroundElements: Phaser.GameObjects.GameObject[] = [];

  constructor(key: string) {
    super({ key });
  }

  // =========================================================================
  // ABSTRACT TEMPLATE METHODS - Must be implemented by subclasses
  // =========================================================================

  /**
   * Create the player entity
   * Mode-specific positioning and setup
   */
  protected abstract createPlayer(): void;

  /**
   * Create the enemy grid/entities
   * Mode-specific enemy creation
   */
  protected abstract createEnemies(): void;

  /**
   * Setup collision handlers
   * Mode-specific collision logic
   */
  protected abstract setupCollisions(): void;

  /**
   * Create mode-specific UI elements
   * Additional UI beyond the core UI
   */
  protected abstract createModeUI(): void;

  /**
   * Create mode-specific background
   * Visual elements behind the game
   */
  protected abstract createBackground(): void;

  /**
   * Check win/lose conditions
   * Mode-specific game over conditions
   */
  protected abstract checkGameConditions(): void;

  /**
   * Handle level completion
   * Mode-specific level complete behavior
   */
  protected abstract onLevelComplete(): void;

  /**
   * Handle game over
   * Override this to customize game over behavior for specific modes
   * By default, calls endGame() with no custom scene
   */
  protected onGameOver(): void {
    this.endGame();
  }

  /**
   * Update mode-specific game logic
   * Called each frame after shared updates
   */
  protected abstract updateMode(delta: number): void;

  // =========================================================================
  // CENTRALIZED INITIALIZATION
  // =========================================================================

  /**
   * Initialize game entities in the correct order
   * Used by: create(), restartGame(), and scene transitions
   *
   * CRITICAL ORDER:
   * 1. Setup physics groups
   * 2. Initialize managers (levelManager, spriteManager, etc.)
   * 3. Prepare textures (needs managers from step 2)
   * 4. Create player (needs textures from step 3)
   * 5. Create enemies (needs textures from step 3)
   * 6. Setup collisions
   * 7. Create UI
   * 8. Create background
   */
  protected async initializeGameEntities(): Promise<void> {
    console.log('[BaseGameScene] initializeGameEntities() - Starting...');

    // 1. Setup physics groups
    console.log('[BaseGameScene] Setting up physics groups...');
    this.setupPhysicsGroups();

    // 2. Initialize managers (creates levelManager, spriteManager, etc.)
    console.log('[BaseGameScene] Initializing managers...');
    this.initializeManagers();

    // 3. Prepare textures (requires managers from step 2)
    console.log('[BaseGameScene] Preparing player texture...');
    await this.preparePlayerTexture();
    console.log('[BaseGameScene] Player texture prepared:', this.playerTextureKey);

    console.log('[BaseGameScene] Preparing alien textures...');
    await this.prepareAlienFaceTextures();
    console.log('[BaseGameScene] Alien textures prepared:', this.alienFaceTextures.length);

    // 4. Create player (uses textures from step 3)
    console.log('[BaseGameScene] Creating player...');
    this.createPlayer();

    // 5. Create enemies (uses textures from step 3)
    console.log('[BaseGameScene] Creating enemies...');
    this.createEnemies();

    // 6. Setup collisions
    console.log('[BaseGameScene] Setting up collisions...');
    this.setupCollisions();

    // 7. Create UI
    console.log('[BaseGameScene] Creating core UI...');
    this.createCoreUI();
    console.log('[BaseGameScene] Creating mode UI...');
    this.createModeUI();

    // 8. Create background
    console.log('[BaseGameScene] Creating background...');
    this.createBackground();

    console.log('[BaseGameScene] initializeGameEntities() - Complete!');
  }

  // =========================================================================
  // SHARED IMPLEMENTATION - Common to all game modes
  // =========================================================================

  async create(): Promise<void> {
    console.log('[BaseGameScene] create() called for', this.constructor.name);
    
    // Get scene data from previous scene
    const data = this.scene.settings.data as { 
      level?: number; 
      score?: number; 
      lives?: number; 
      useWebcam?: boolean; 
      viewport?: { x: number; y: number; width: number; height: number }, 
      startMode?: GameMode; 
      disableBackToMenu?: boolean;
      difficulty?: DifficultyPreset;
    };
    
    console.log('[BaseGameScene] Scene data:', data);
    
    this.level = data.level || 1;
    this.score = data.score || 0;
    this.useWebcam = data.useWebcam || false;
    this.disableBackToMenu = !!data.disableBackToMenu;
    this.difficulty = data.difficulty || DifficultyPreset.MEDIUM;
    
    console.log('[BaseGameScene] Parsed data - level:', this.level, 'mode:', data.startMode, 'difficulty:', this.difficulty);
    
    if (typeof data.lives === 'number') {
      this.lives = data.lives;
    }

    // Mode selection
    if (data.startMode !== undefined) {
      this.currentGameMode = data.startMode;
      this.levelsSinceLastSwitch = 0;
    } else if (this.level === 1 && this.score === 0) {
      this.currentGameMode = GameMode.SPACE_INVADERS;
      this.levelsSinceLastSwitch = 0;
    }
    
    // Reset game state
    this.gameActive = false; // Wait for initialization
    if (this.level === 1 && this.score === 0 && typeof data.lives !== 'number') {
      this.lives = 3;
    }

    // Optional viewport for split-screen debug
    if (data.viewport) {
      this.cameras.main.setViewport(data.viewport.x, data.viewport.y, data.viewport.width, data.viewport.height);
    }

    const settings = LocalStorage.getSettings();
    this.backButtonIndex = settings.controllerBackButton ?? 1;

    // Initialize all game entities in correct order
    console.log('[BaseGameScene] About to call initializeGameEntities()...');
    await this.initializeGameEntities();
    console.log('[BaseGameScene] initializeGameEntities() returned');

    // Setup input (last step)
    console.log('[BaseGameScene] Setting up input...');
    this.setupInput();
    console.log('[BaseGameScene] Input setup complete');

    // Mark as initialized and activate game
    this._isInitialized = true;
    console.log('[BaseGameScene] Marked as initialized');

    this.gameActive = true;
    console.log('[BaseGameScene] Game activated! Initialization complete!');

    // Setup shutdown handler
    this.events.once('shutdown', this.handleShutdown, this);
  }

  update(time: number, delta: number): void {
    if (!this.gameActive) return;

    // Only log checkGameConditions call once
    if (!this._loggedFirstUpdate) {
      console.log('[BaseGameScene] First update() call - gameActive:', this.gameActive);
      this._loggedFirstUpdate = true;
    }

    if (this.player) {
      this.registry.set('playerX', this.player.x);
    }

    this.pollGamepadNavigation();

    // Update player
    this.player?.update(16);

    // Update mode-specific logic
    this.updateMode(delta);

    // Check game conditions (only after initialization)
    if (this._isInitialized) {
      this.checkGameConditions();
    }

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

    // Periodic collision debug
    if (this.debugCollisions) {
      const now = this.time.now;
      if (now - this.lastDebugLog > 500) {
        const bulletsCount = this.bullets ? this.bullets.getChildren().length : 0;
        const aliensCount = this.aliens ? this.aliens.getChildren().length : 0;
        const anyOverlap = this.physics.overlap(this.bullets as any, this.aliens as any);
        console.log(`[${this.constructor.name}][dbg] bullets:`, bulletsCount, 'aliens:', aliensCount, 'overlap?', anyOverlap);
        this.lastDebugLog = now;
      }
    }
  }

  protected setupPhysicsGroups(): void {
    // Create physics groups for collision detection
    this.bullets = this.physics.add.group({
      classType: Bullet,
      runChildUpdate: false
    });
    
    this.bombs = this.physics.add.group({
      classType: Bomb,
      runChildUpdate: true
    });
    
    this.aliens = this.physics.add.group({
      classType: Alien,
      runChildUpdate: false
    });
  }

  protected createCoreUI(): void {
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

    // Game Mode display
    this.gameModeText = this.add.text(GAME_WIDTH - 20, 50, getGameModeName(this.currentGameMode), {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#ffff00'
    })
    .setOrigin(1, 0);

    // Wave count display (for Galaga)
    this.waveCountText = this.add.text(GAME_WIDTH - 20, 75, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#00ffff'
    })
    .setOrigin(1, 0)
    .setVisible(this.currentGameMode === GameMode.GALAGA);

    // Debug hint for manual mode switching
    if (ENABLE_MANUAL_MODE_SWITCH) {
      this.add.text(10, GAME_HEIGHT - 30, '', {
        fontSize: '14px',
        fontFamily: 'Courier New',
        color: '#666666'
      });
    }

    // Mute button
    this.muteButton = this.add.text(GAME_WIDTH - 20, 20, 'MUSIC: ON', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#00ff00'
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => this.handleMuteToggle());
  }

  protected initializeManagers(): void {
    // Initialize managers with difficulty
    this.scoreManager = new ScoreManager();
    this.levelManager = new LevelManager(this.level, this.difficulty);
    this.audioManager = new AudioManager(this);
    this.touchControlManager = new TouchControlManager(this);
    this.spriteManager = SpriteManager.getInstance(this);

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

  protected setupInput(): void {
    // Listen for projectile events
    this.events.on('fireBullet', (x: number, y: number) => {
      this.fireBullet(x, y);
    });
    
    this.events.on('dropBomb', (x: number, y: number) => {
      this.dropBomb(x, y);
    });
    
    // Additional game controls
    this.input.keyboard?.on('keydown-P', () => {
      this.pauseGame();
    });

    // Restart game
    this.input.keyboard?.on('keydown-R', () => {
      this.restartGame();
    });

    // Toggle collision debug
    this.input.keyboard?.on('keydown-L', () => {
      this.debugCollisions = !this.debugCollisions;
      console.log(`[${this.constructor.name}] collision debug`, this.debugCollisions ? 'ON' : 'OFF');
    });

    // Manual mode switching
    if (ENABLE_MANUAL_MODE_SWITCH) {
      this.input.keyboard?.on('keydown-ONE', () => {
        this.forceMode(GameMode.SPACE_INVADERS);
      });

      this.input.keyboard?.on('keydown-TWO', () => {
        this.forceMode(GameMode.GALAGA);
      });
    }

    this.input.gamepad?.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepad = pad;
    });
  }

  // =========================================================================
  // SHARED COLLISION HANDLERS
  // =========================================================================

  /**
   * Handle bullet-alien collision (shared logic for both modes)
   */
  protected handleBulletAlienCollision(object1: any, object2: any): void {
    // Determine which object is which
    const bullet = object1 instanceof Alien ? object2 : object1;
    const alien = object1 instanceof Alien ? object1 : object2;
    if (!bullet || !alien) return;

    // Check if both are active/alive
    if (!bullet.isActive || !bullet.isActive()) return;
    if (!alien.isAlive || !alien.isAlive()) return;

    // Destroy bullet
    bullet.hit();

    // Destroy alien and get points
    const points = alien.destroy();
    this.addScore(points);

    // Play sound
    this.audioManager?.play('alien-hit');
  }

  /**
   * Handle bomb-player collision (shared logic for both modes)
   */
  protected handleBombPlayerCollision(object1: any, object2: any): void {
    // Determine which object is which
    const bomb = object1 instanceof Player ? object2 : object1;
    const player = object1 instanceof Player ? object1 : object2;
    if (!bomb || !player) return;

    // Check if both are active
    if (!bomb.isActive || !bomb.isActive()) return;
    if (!player.active) return;

    // Destroy bomb
    bomb.hit();

    // Damage player
    player.takeDamage();
    this.loseLife();

    // Play sound
    this.audioManager?.play('player-hit');
  }

  // =========================================================================
  // SHARED GAME LOGIC
  // =========================================================================

  protected fireBullet(x: number, y: number): Bullet | null {
    if (!this.bullets || !this.gameActive) return null;
    const bullet = this.bullets.get(x, y, 'bullet') as Bullet | null;
    if (!bullet) return null;
    bullet.launch(x, y);

    this.audioManager?.play('shoot');
    return bullet;
  }

  protected dropBomb(x: number, y: number): Bomb | null {
    if (!this.bombs || !this.gameActive) return null;

    const bomb = this.bombs.get(x, y, 'bomb') as Bomb | null;
    if (!bomb) return null;

    bomb.setActive(true);
    bomb.setVisible(true);
    const body = bomb.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.setVelocity(0, 200);
      body.checkCollision.none = false;
    }

    return bomb;
  }

  protected addScore(points: number): void {
    this.score += points;
    this.scoreManager?.addPoints(points);
    this.updateScoreDisplay();
  }

  protected updateScoreDisplay(): void {
    if (this.scoreText) {
      this.scoreText.setText(`SCORE: ${this.score}`);
    }
  }

  protected updateLivesDisplay(): void {
    if (this.livesText) {
      this.livesText.setText(`LIVES: ${this.lives}`);
    }
  }

  protected loseLife(): void {
    const now = this.time?.now ?? Date.now();
    if (now - this.lastLifeLostAt < 750) {
      return;
    }
    this.lastLifeLostAt = now;

    this.lives--;
    this.updateLivesDisplay();

    if (this.lives <= 0) {
      this.onGameOver();
    }
  }

  protected advanceLevel(): void {
    this.level++;
    this.levelManager?.nextLevel();
    
    if (this.levelText) {
      this.levelText.setText(`LEVEL: ${this.level}`);
    }
  }

  protected pauseGame(): void {
    this.scene.pause();

    const pauseText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSED\nPress P to resume', {
      fontSize: '24px',
      fontFamily: 'Courier New',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-P', () => {
      pauseText.destroy();
      this.scene.resume();
    });
  }

  protected resumeGame(): void {
    this.scene.resume();
  }

  // =========================================================================
  // GAME RESTART
  // =========================================================================

  /**
   * Standardized game restart handler
   * Resets all state and reinitializes the game
   *
   * Override resetGameState() in subclasses to reset mode-specific variables
   */
  protected async restartGame(): Promise<void> {
    console.log('[BaseGameScene] restartGame() called - resetting to level 1');

    // Reset all state using template method
    this.resetGameState();

    console.log('[BaseGameScene] State reset - level:', this.level, 'score:', this.score, 'lives:', this.lives);

    // Clear all entities
    this.clearAllEntities();

    // Reinitialize everything using centralized method
    await this.initializeGameEntities();

    // Mark as initialized and activate game
    this._isInitialized = true;
    this.gameActive = true;

    console.log('[BaseGameScene] restartGame() complete - final level:', this.level);
  }

  /**
   * Reset all game state variables
   * Template method - override onResetState() in subclasses to reset mode-specific variables
   */
  protected resetGameState(): void {
    console.log('[BaseGameScene] resetGameState() - resetting base variables');

    // Reset game state variables
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.gameActive = false; // Will be set to true after initialization
    this.levelsSinceLastSwitch = 0;

    // Reset initialization flags
    this._isInitialized = false;
    this._loggedFirstUpdate = false;

    // Reset score manager
    if (this.scoreManager) {
      this.scoreManager = new ScoreManager();
    }

    // Call subclass hook for mode-specific reset
    this.onResetState();

    console.log('[BaseGameScene] Base state reset complete');
  }

  /**
   * Hook for subclasses to reset mode-specific state variables
   * Override this to reset your mode's private/protected variables
   */
  protected onResetState(): void {
    // Override in subclasses to reset mode-specific variables
    console.log('[BaseGameScene] onResetState() - no mode-specific reset (override in subclass)');
  }

  protected clearAllEntities(): void {
    // Clear physics groups
    if (this.bullets) {
      this.bullets.clear(true, true);
    }
    if (this.aliens) {
      this.aliens.clear(true, true);
    }
    if (this.bombs) {
      this.bombs.clear(true, true);
    }
    
    // Clear sprite manager cache
    if (this.spriteManager) {
      this.spriteManager.clearCache();
    }
    
    // Clear mode-specific entities (implemented in subclasses)
    this.onClearEntities();
    
    // Clear UI elements
    this.children.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Text) {
        child.destroy();
      }
    });
  }

  protected onClearEntities(): void {
    // Override in subclasses to clear mode-specific entities
  }

  // =========================================================================
  // GAME OVER
  // =========================================================================

  /**
   * Standardized game over handler
   * Saves high score and transitions to game over scene
   *
   * @param options - Customization options for game over
   *   - gameOverScene: Custom scene to transition to (default: 'GameOverScene')
   *   - additionalData: Extra data to pass to the game over scene
   */
  protected endGame(options?: {
    gameOverScene?: string;
    additionalData?: Record<string, any>;
  }): void {
    this.gameActive = false;

    // Save high score if applicable
    if (this.scoreManager?.isHighScore()) {
      this.scoreManager.saveHighScore('Player', this.level);
    }

    // Prepare data to pass to game over scene
    const gameOverData = {
      score: this.score,
      level: this.level,
      gameMode: this.currentGameMode,
      difficulty: this.difficulty,
      ...options?.additionalData
    };

    // Transition to game over scene (default or custom)
    const targetScene = options?.gameOverScene || 'GameOverScene';
    this.scene.start(targetScene, gameOverData);
  }

  // =========================================================================
  // MODE SWITCHING
  // =========================================================================

  protected shouldAutoSwitch(): boolean {
    // Don't increment here - it should only increment when level actually completes
    return this.levelsSinceLastSwitch >= AUTO_SWITCH_INTERVAL;
  }

  protected switchToMode(newMode: GameMode): void {
    console.log(`[${this.constructor.name}] Switching to ${getGameModeName(newMode)}`);
    
    // Reset level counter when switching modes
    this.levelsSinceLastSwitch = 0;
    
    this.scene.start('ModeTransitionScene', {
      fromMode: this.currentGameMode,
      toMode: newMode,
      level: this.level,
      score: this.score,
      lives: this.lives,
      useWebcam: this.useWebcam,
      difficulty: this.difficulty,
      advanceLevel: false
    });
  }

  protected forceMode(mode: GameMode): void {
    if (this.currentGameMode === mode) {
      return;
    }
    console.log(`[${this.constructor.name}] Force switch to ${getGameModeName(mode)}`);
    this.scene.start('ModeTransitionScene', {
      fromMode: this.currentGameMode,
      toMode: mode,
      level: this.level,
      score: this.score,
      useWebcam: this.useWebcam,
      lives: this.lives,
      difficulty: this.difficulty,
      advanceLevel: false
    });
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

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

  private handleShutdown(): void {
    console.log(`[${this.constructor.name}] shutdown called`);

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

    this.events.off('fireBullet');
    this.events.off('dropBomb');
    this.input.keyboard?.off('keydown-P');
    this.input.keyboard?.off('keydown-R');
    this.input.keyboard?.off('keydown-L');

    this.audioManager?.cleanup();
    this.touchControlManager?.destroy();
    this.touchControlManager = null;

    // Allow subclasses to cleanup
    this.onShutdown();

    this.clearGameObjects();
  }

  /**
   * Hook for subclasses to cleanup mode-specific resources on shutdown
   */
  protected onShutdown(): void {
    // Override in subclasses
  }

  private clearGameObjects(): void {
    this.backgroundElements.forEach(el => el.destroy());
    this.backgroundElements = [];
    
    this.bullets = null;
    this.bombs = null;
    this.aliens = null;
  }

  protected async preparePlayerTexture(): Promise<void> {
    console.log('[BaseGameScene] preparePlayerTexture() - spriteManager exists:', !!this.spriteManager);

    if (!this.spriteManager) {
      console.log('[BaseGameScene] No sprite manager, using default player texture');
      this.playerTextureKey = 'player';
      return;
    }

    try {
      console.log('[BaseGameScene] Calling spriteManager.buildPlayerSprite()...');
      this.playerTextureKey = await this.spriteManager.buildPlayerSprite();
      console.log('[BaseGameScene] Player texture built:', this.playerTextureKey);
    } catch (e) {
      console.error('[BaseGameScene] Failed to build player sprite:', e);
      this.playerTextureKey = 'player';
    }
  }

  protected async prepareAlienFaceTextures(): Promise<void> {
    console.log('[BaseGameScene] prepareAlienFaceTextures() - levelManager exists:', !!this.levelManager, 'spriteManager exists:', !!this.spriteManager);

    const levelConfig = this.levelManager?.getLevelConfig();
    if (!levelConfig || !this.spriteManager) {
      console.log('[BaseGameScene] Missing levelConfig or spriteManager, skipping alien textures');
      this.alienFaceTextures = [];
      return;
    }

    const totalAliens = levelConfig.alienRows * levelConfig.alienCols;
    console.log('[BaseGameScene] Building', totalAliens, 'alien sprites...');

    try {
      this.alienFaceTextures = await this.spriteManager.buildAlienSprites(totalAliens);
      console.log('[BaseGameScene] Alien textures built:', this.alienFaceTextures.length, '/', totalAliens);
    } catch (e) {
      console.error('[BaseGameScene] Failed to build alien sprites:', e);
      this.alienFaceTextures = [];
    }
  }
}
