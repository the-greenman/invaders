import Phaser from 'phaser';
import { POINTS, ALIEN_WIDTH, ALIEN_HEIGHT, ALIEN_BODY_SCALE } from '../constants';
import { Bomb } from './Bomb';
import { AttackPath } from '../systems/AttackPath';

/**
 * Alien Entity
 *
 * Represents an individual alien sprite in the formation.
 * Handles movement, animation, and collision detection.
 *
 * Extends Phaser.GameObjects.Sprite with physics body.
 *
 * FOR GALAGA MODE (GAME 2):
 * - Supports state machine for attack wave behavior
 * - Tracks formation position for return-to-formation
 * - Follows attack paths during wave attacks
 */

/**
 * Alien State Machine (Galaga Mode)
 *
 *
 * - IN_FORMATION: Moving with the grid formation
 * - ATTACKING: Following an attack path curve
 * - RETURNING: Navigating back to formation position
 * - DESTROYED: Dead, no longer active
 */
export enum AlienState {
  IN_FORMATION = 'IN_FORMATION',
  ATTACKING = 'ATTACKING',
  RETURNING = 'RETURNING',
  DESTROYED = 'DESTROYED'
}

export class Alien extends Phaser.GameObjects.Sprite {
  private points: number;
  private alienType: number; // 0, 1, or 2 for different alien types
  private gridPosition: { row: number; col: number };
  private alive: boolean = true;

  // Galaga Mode (Game 2) State Machine
  private alienState: AlienState = AlienState.IN_FORMATION;
  private formationPosition: { x: number; y: number } = { x: 0, y: 0 };
  private attackPath: AttackPath | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: number = 0,
    gridPosition: { row: number; col: number },
    textureKey?: string
  ) {
    super(scene, x, y, textureKey || `alien-${type}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.alienType = type;
    this.gridPosition = gridPosition;
    
    // Set points based on alien type
    this.points = [POINTS.ALIEN_BOTTOM, POINTS.ALIEN_MIDDLE, POINTS.ALIEN_TOP][type] || POINTS.ALIEN_BOTTOM;

    this.setDisplaySize(ALIEN_WIDTH, ALIEN_HEIGHT);
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Body sized by configurable multiplier vs sprite dimensions
    body.setSize(ALIEN_WIDTH * ALIEN_BODY_SCALE, ALIEN_HEIGHT * ALIEN_BODY_SCALE, true); // center body on sprite
    body.setImmovable(true);

    // Play animation if available
    if (this.scene.anims.exists(`alien-${type}-anim`)) {
      this.play(`alien-${type}-anim`);
    }
  }

  /**
   * Update alien state
   * @param delta - Time since last frame in ms
   *
   * TODO:
   * 1. Update animation if needed
   * 2. Handle state changes
   */
  update(delta: number): void {
    if (!this.alive) return;

    // Aliens are primarily controlled by AlienGrid
    // Individual update logic can be added here if needed
  }

  /**
   * Move alien by specified offset
   * @param dx - Horizontal movement
   * @param dy - Vertical movement
   *
   * TODO:
   * 1. Update position
   * 2. Update physics body
   */
  move(dx: number, dy: number): void {
    if (!this.alive) return;

    this.x += dx;
    this.y += dy;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(this.x, this.y);
  }

  /**
   * Handle alien being destroyed
   *
   * TODO:
   * 1. Mark as not alive
   * 2. Play explosion animation
   * 3. Play sound effect
   * 4. Return points value
   */
  destroy(fromScene?: boolean): number {
    if (!this.alive) return 0;

    this.alive = false;
    
    // Play explosion effect only if NOT destroyed by scene shutdown
    const sceneAny = this.scene as any;
    const isSceneActive = typeof sceneAny?.sys?.isActive === 'function' ? !!sceneAny.sys.isActive() : true;
    if (!fromScene && this.scene && this.scene.add && this.scene.tweens && isSceneActive) {
      const explosion = this.scene.add.circle(this.x, this.y, 16, 0xff0000);
      explosion.setAlpha(0.8);
      this.scene.tweens.add({
        targets: explosion,
        alpha: 0,
        scale: 2,
        duration: 300,
        onComplete: () => explosion.destroy()
      });
    }
    
    // Could play sound here
    // this.scene.sound.play('explosion');
    
    super.destroy(fromScene);
    return this.points;
  }

  /**
   * Fire a bomb from this alien
   * @returns Bomb object or null if can't fire
   *
   * TODO:
   * 1. Check if alien can fire (based on position or random chance)
   * 2. Create new Bomb at alien position
   * 3. Return the bomb
   */
  fireBomb(): Bomb | null {
    if (!this.alive) return null;
    
    // Bomb firing is controlled by AlienGrid for better difficulty tuning
    // This method just creates the bomb when called
    const bomb = new Bomb(this.scene, this.x, this.y + 20);
    return bomb;
  }

  /**
   * Check if alien is still alive
   * @returns true if alien is alive
   */
  isAlive(): boolean {
    return this.alive;
  }

  /**
   * Get alien's point value
   * @returns Points awarded for destroying this alien
   */
  getPoints(): number {
    return this.points;
  }

  /**
   * Get alien's grid position
   * @returns Grid coordinates {row, col}
   */
  getGridPosition(): { row: number; col: number } {
    return this.gridPosition;
  }

  // ============================================================================
  // Galaga Mode (Game 2) - State Machine Methods
  // ============================================================================

  /**
   * Get alien's current state
   * @returns Current AlienState
   *
   * This is used by GalagaGrid and WaveManager to determine behavior
   */
  getState(): AlienState {
    return this.alienState;
  }

  /**
   * Set alien's state
   * @param newState - The state to transition to
   *
   * State transitions:
   * - IN_FORMATION → ATTACKING (when launching wave)
   * - ATTACKING → RETURNING (when attack path complete)
   * - RETURNING → IN_FORMATION (when arrived at formation)
   * - Any → DESTROYED (when killed)
   */
  setAlienState(newState: AlienState): void {
    this.alienState = newState;
    if (newState === AlienState.DESTROYED) {
      this.alive = false;
    }
  }

  /**
   * Set formation position (where alien should return to)
   * @param x - Formation X coordinate
   * @param y - Formation Y coordinate
   *
   * Called by WaveManager before launching wave to record home position
   */
  setFormationPosition(x: number, y: number): void {
    this.formationPosition = { x, y };
  }

  /**
   * Get formation position
   * @returns Formation coordinates {x, y}
   *
   * Used by WaveManager when navigating alien back to formation
   */
  getFormationPosition(): { x: number; y: number } {
    return this.formationPosition;
  }

  /**
   * Set attack path for wave attack
   * @param path - AttackPath instance (DiveBomb, Loop, Weave, etc.)
   *
   * Called by WaveManager when launching wave
   * Path must be started with path.start(x, y) before assigning
   */
  setAttackPath(path: AttackPath): void {
    this.attackPath = path;
  }

  /**
   * Get current attack path
   * @returns AttackPath or null
   *
   * Used by WaveManager to check if path is complete
   */
  getAttackPath(): AttackPath | null {
    return this.attackPath;
  }

  /**
   * Follow attack path (update position along curve)
   * @param delta - Time since last frame in ms
   *
   * Called by WaveManager.update() when alien state is ATTACKING
   * Gets current position from path and moves alien there
   *
   * ALGORITHM:
   * 1. Get current position from attackPath.getCurrentPosition(delta)
   * 2. Set alien position to path position
   * 3. Update physics body with body.reset(x, y)
   */
  followPath(delta: number, targetX?: number, homingStrength: number = 0): void {
    if (!this.alive || !this.attackPath || this.alienState !== AlienState.ATTACKING) {
      return;
    }

    const pos = this.attackPath.getCurrentPosition(delta);
    let x = pos.x;
    if (typeof targetX === 'number' && homingStrength > 0) {
      const maxSteer = 120 * (delta / 1000);
      const steer = Phaser.Math.Clamp((targetX - x) * homingStrength, -maxSteer, maxSteer);
      x += steer;
    }

    this.setPosition(x, pos.y);
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.reset(x, pos.y);
    }
  }
}
