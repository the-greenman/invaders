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
import { FaceManager } from '../managers/FaceManager';
import { TouchControlManager } from '../managers/TouchControlManager';
import { LocalStorage } from '../utils/localStorage';
import { GAME_WIDTH, GAME_HEIGHT, SHIELD_COUNT, PLAYER_CORE_RADIUS, PLAYER_HEIGHT, PLAYER_WIDTH, ALIEN_WIDTH, ALIEN_HEIGHT, ALIEN_CORE_RADIUS, COLORS, ALIEN_TINT_ALPHA, ABDUCTION_THRESHOLD_Y } from '../constants';

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
  private playerTextureKey: string = 'player';
  
  // UI elements
  private scoreText: Phaser.GameObjects.Text | null = null;
  private livesText: Phaser.GameObjects.Text | null = null;
  private levelText: Phaser.GameObjects.Text | null = null;
  
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

  constructor() {
    super({ key: 'GameScene' });
  }

  async create(): Promise<void> {
    // Get scene data from previous scene
    const data = this.scene.settings.data as { level?: number; score?: number; useWebcam?: boolean; viewport?: { x: number; y: number; width: number; height: number } };
    this.level = data.level || 1;
    this.score = data.score || 0;
    this.useWebcam = data.useWebcam || false;
    
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
    this.backButtonIndex = settings.controllerBackButton ?? 10;

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
    
    // Setup shutdown event for cleanup
    this.events.on('shutdown', () => {
      this.shutdown();
    });
  }

  update(): void {
    if (!this.gameActive) return;

    this.pollGamepadNavigation();

    // Update player
    this.player?.update(16); // Approximate 60fps delta

    // Clean up bullets that are out of bounds
    this.bullets?.children.entries.forEach((bullet: any) => {
      if (bullet && bullet.active) {
        if (bullet.y < -20) {
          bullet.setActive(false);
          bullet.setVisible(false);
        }
      }
    });

    // Clean up bombs that are out of bounds
    this.bombs?.children.entries.forEach((bomb: any) => {
      if (bomb && bomb.active) {
        if (bomb.y > GAME_HEIGHT + 20) {
          bomb.setActive(false);
          bomb.setVisible(false);
        }
      }
    });

    // Update alien grid
    this.alienGrid?.update(16);

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
    
    // Create alien grid
    this.levelManager = new LevelManager(this.level);
    const levelConfig = this.levelManager.getLevelConfig();
    this.alienGrid = new AlienGrid(this, 100, 100, levelConfig.alienRows, levelConfig.alienCols, levelConfig.alienSpeed, this.alienFaceTextures);
    
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
    
    // Alien vs Player (game over)
    this.physics.add.overlap(
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
    const bomb = new Bomb(this, x, y);
    this.bombs.add(bomb);
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
    if (backPressed && !this.prevBackPressed) {
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
    const bullet = object1 as Bullet;
    const alien = object2 as Alien;
    
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

  private async startNextLevel(): Promise<void> {
    this.level++;
    this.gameActive = true;
    
    // Clear existing entities but keep physics groups and colliders
    this.clearForNextLevel();
    
    // Setup new level
    this.levelManager = new LevelManager(this.level);
    const levelConfig = this.levelManager.getLevelConfig();
    await this.prepareAlienFaceTextures();
    this.alienGrid = new AlienGrid(this, 100, 100, levelConfig.alienRows, levelConfig.alienCols, levelConfig.alienSpeed, this.alienFaceTextures);
    
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

  shutdown(): void {
    // Cleanup managers
    this.audioManager?.cleanup();
    this.touchControlManager?.destroy();
    this.touchControlManager = null;

    // Clear game objects
    this.clearGameObjects();
  }

  /**
   * Build the player texture with the current face (if any) using shared FaceManager logic.
   */
  private async preparePlayerTexture(): Promise<void> {
    const currentFace = FaceManager.getCurrentFace();
    if (!currentFace) {
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
    const history = LocalStorage.getFaceHistory();
    if (history.length === 0) {
      this.alienFaceTextures = [];
      return;
    }
    const meta = this.cache.json.get('alien1-face-meta');
    const coreRadius = meta?.rx ?? ALIEN_CORE_RADIUS;
    const centerX = meta ? meta.relativeX * ALIEN_WIDTH : undefined;
    const centerY = meta ? meta.relativeY * ALIEN_HEIGHT : undefined;

    const textures: string[] = [];
    for (const face of history) {
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
    this.alienFaceTextures = textures;
  }
}
