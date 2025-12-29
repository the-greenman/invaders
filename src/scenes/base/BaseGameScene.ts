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
  protected gameActive: boolean = true;
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
   * Mode-specific game over behavior
   */
  protected abstract onGameOver(): void;

  /**
   * Update mode-specific game logic
   * Called each frame after shared updates
   */
  protected abstract updateMode(delta: number): void;

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
    this.gameActive = true;
    if (this.level === 1 && this.score === 0 && typeof data.lives !== 'number') {
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
    
    // Create game systems in order
    console.log('[BaseGameScene] Setting up physics groups...');
    this.setupPhysicsGroups();
    console.log('[BaseGameScene] Initializing managers...');
    this.initializeManagers();
    console.log('[BaseGameScene] Creating player...');
    this.createPlayer();
    console.log('[BaseGameScene] Creating enemies...');
    this.createEnemies();
    console.log('[BaseGameScene] Setting up collisions...');
    this.setupCollisions();
    console.log('[BaseGameScene] Creating core UI...');
    this.createCoreUI();
    console.log('[BaseGameScene] Creating mode UI...');
    this.createModeUI();
    console.log('[BaseGameScene] Creating background...');
    this.createBackground();
    console.log('[BaseGameScene] Setting up input...');
    this.setupInput();
    console.log('[BaseGameScene] Create complete!');
    
    // Mark as initialized
    this._isInitialized = true;
    console.log('[BaseGameScene] Initialization complete!');

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

    // Mode-specific update
    this.updateMode(delta);

    // Check win/lose conditions
    this.checkGameConditions();

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
  // MODE SWITCHING
  // =========================================================================

  protected shouldAutoSwitch(): boolean {
    // Don't increment here - it should only increment when level actually completes
    return this.levelsSinceLastSwitch >= AUTO_SWITCH_INTERVAL;
  }

  protected switchToMode(newMode: GameMode): void {
    console.log(`[${this.constructor.name}] Switching to ${getGameModeName(newMode)}`);
    this.scene.start('ModeTransitionScene', {
      fromMode: this.currentGameMode,
      toMode: newMode,
      level: this.level,
      score: this.score,
      useWebcam: this.useWebcam,
      lives: this.lives,
      difficulty: this.difficulty,
      advanceLevel: true
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
    this.input.keyboard?.off('keydown-L');

    this.audioManager?.cleanup();
    this.touchControlManager?.destroy();
    this.touchControlManager = null;

    this.clearGameObjects();
  }

  private clearGameObjects(): void {
    this.backgroundElements.forEach(el => el.destroy());
    this.backgroundElements = [];
    
    this.bullets = null;
    this.bombs = null;
    this.aliens = null;
  }

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

  private async prepareAlienFaceTextures(): Promise<void> {
    const levelConfig = this.levelManager?.getLevelConfig();
    if (!levelConfig) return;
    
    const totalAliens = levelConfig.alienRows * levelConfig.alienCols;
    const history = LocalStorage.getFaceHistory();
    const textures: string[] = [];
    const defaultKey = await this.ensureDefaultAlienFaceTexture();

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
    
    while (textures.length < totalAliens && defaultKey) {
      textures.push(defaultKey);
    }

    this.alienFaceTextures = textures;
  }

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
