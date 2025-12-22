import Phaser from 'phaser';
import { Alien } from './Alien';
import { Bomb } from './Bomb';
import { ALIEN_SPACING_X, ALIEN_SPACING_Y, GAME_WIDTH, ALIEN_WIDTH, ALIEN_HEIGHT } from '../constants';

/**
 * Alien Grid Entity
 *
 * Manages the formation of all aliens.
 * Handles grid movement, direction changes, and bomb dropping.
 *
 * Extends Phaser.GameObjects.Container to group all aliens.
 */

export class AlienGrid extends Phaser.GameObjects.Container {
  private aliens: (Alien | null)[][] = [];
  private direction: number = 1; // 1 for right, -1 for left
  private speed: number;
  private bombDropChance: number = 0.001;
  private lastBombTime: number = 0;
  private bombDropInterval: number = 1000;
  private moveTimer: Phaser.Time.TimerEvent | null = null;
  private rows: number;
  private cols: number;
  private debugging: boolean = false;
  private stepIndex: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rows: number,
    cols: number,
    speed: number
  ) {
    super(scene, x, y);
    scene.add.existing(this);

    this.speed = speed;
    this.rows = rows;
    this.cols = cols;

    this.createAlienGrid(rows, cols);
    this.startMovement();

    // Initial debug info
    this.debugLog('created', { x: this.x, y: this.y, rows, cols, speed });
    const b = this.getBounds();
    this.debugLog('bounds', { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom) });
  }

  public setDebug(enabled: boolean): void {
    this.debugging = enabled;
    this.debugLog('debugging set to', enabled);
  }

  private debugLog(...args: any[]): void {
    if (this.debugging) console.log('[AlienGrid]', ...args);
  }

  public dumpState(label: string = 'dump'): void {
    const leftmost = this.getLeftmostAliveAlien();
    const rightmost = this.getRightmostAliveAlien();
    const mode = leftmost && (leftmost as any).parentContainer ? 'IN_CONTAINER' : 'WORLD_SPACE';
    const leftEdge = leftmost ? leftmost.x - leftmost.displayWidth * 0.5 : NaN;
    const rightEdge = rightmost ? rightmost.x + rightmost.displayWidth * 0.5 : NaN;
    this.debugLog(label, { mode, gridX: Math.round(this.x), gridY: Math.round(this.y),
      leftmostX: leftmost ? Math.round(leftmost.x) : null,
      rightmostX: rightmost ? Math.round(rightmost.x) : null,
      leftEdge: isNaN(leftEdge) ? null : Math.round(leftEdge),
      rightEdge: isNaN(rightEdge) ? null : Math.round(rightEdge), dir: this.direction });
  }

  /**
   * Create the initial alien formation
   * @param rows - Number of alien rows
   * @param cols - Number of alien columns
   *
   * TODO:
   * 1. Initialize aliens array
   * 2. Create Alien instances in grid pattern
   * 3. Add aliens to this container
   * 4. Set up alien types (different rows have different types)
   */
  private createAlienGrid(rows: number, cols: number): void {
    this.aliens = [];
    
    for (let row = 0; row < rows; row++) {
      this.aliens[row] = [];
      for (let col = 0; col < cols; col++) {
        const localX = col * ALIEN_SPACING_X;
        const localY = row * ALIEN_SPACING_Y;

        // Different alien types for different rows
        let type = 0; // bottom rows
        if (row < 1) type = 2; // top row
        else if (row < 3) type = 1; // middle rows

        // Place in world space relative to grid origin
        const alien = new Alien(this.scene, this.x + localX, this.y + localY, type, { row, col });
        this.aliens[row][col] = alien;
        // Note: do NOT add as a container child; keep in world space to avoid container physics issues
      }
    }

    // Debug: verify world-space placement and edges
    const leftmost = this.getLeftmostAliveAlien();
    const rightmost = this.getRightmostAliveAlien();
    if (leftmost && rightmost) {
      const leftEdge = leftmost.x - ALIEN_WIDTH * 0.5;
      const rightEdge = rightmost.x + ALIEN_WIDTH * 0.5;
      const parentFlag = (leftmost as any).parentContainer ? 'IN_CONTAINER' : 'WORLD_SPACE';
      this.debugLog('postCreate', {
        mode: parentFlag,
        leftmostX: Math.round(leftmost.x), rightmostX: Math.round(rightmost.x),
        leftEdge: Math.round(leftEdge), rightEdge: Math.round(rightEdge)
      });
    }
  }

  /**
   * Update alien grid movement and bomb dropping
   * @param delta - Time since last frame in ms
   *
   * TODO:
   * 1. Move all aliens horizontally
   * 2. Check for edge collision and change direction
   * 3. Move down if direction changed
   * 4. Randomly drop bombs from aliens
   */
  private startMovement(): void {
    this.moveTimer = this.scene.time.addEvent({
      delay: this.speed,
      callback: this.moveStep,
      callbackScope: this,
      loop: true
    });
    this.debugLog('timer started', { delay: this.speed });
  }

  update(delta: number): void {
    // Intentionally light. Physics bodies are synced when aliens actually move
    // via Alien.move(), avoiding jumpy movement from per-frame resets.
  }

  /**
   * Move all aliens horizontally
   *
   * TODO:
   * 1. Calculate movement offset based on direction and speed
   * 2. Move each alive alien
   */
  private moveAliens(): void {
    const dx = 20 * this.direction; // Move 20 pixels per step
    this.debugLog('moveAliens', { step: this.stepIndex, dx });
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          alien.move(dx, 0);
        }
      }
    }
  }
  private moveStep(): void {
    this.stepIndex++;
    this.debugLog('moveStep', { step: this.stepIndex, dir: this.direction });
    // Check for edge collision first
    if (this.checkEdgeCollision()) {
      this.moveDownAndReverse();
    } else {
      this.moveAliens();
    }
    
    // Try to drop bombs
    this.dropBombs();
  }

  /**
   * Check if any alien hit the screen edge
   * @returns true if edge was hit
   *
   * TODO:
   * 1. Get screen boundaries
   * 2. Check each alive alien's position
   * 3. Return true if any alien is at edge
   */
  private checkEdgeCollision(): boolean {
    const margin = 50;
    const leftmost = this.getLeftmostAliveAlien();
    const rightmost = this.getRightmostAliveAlien();
    if (!leftmost || !rightmost) return false;

    // Aliens are in world space now
    const leftEdge = leftmost.x - ALIEN_WIDTH * 0.5;
    const rightEdge = rightmost.x + ALIEN_WIDTH * 0.5;
    const atEdge = (leftEdge <= margin && this.direction === -1) ||
                   (rightEdge >= GAME_WIDTH - margin && this.direction === 1);
    this.debugLog('edgeCheck2', {
      leftmostX: Math.round(leftmost.x), rightmostX: Math.round(rightmost.x),
      leftEdge: Math.round(leftEdge), rightEdge: Math.round(rightEdge),
      margin, dir: this.direction, atEdge
    });
    return atEdge;
  }

  /**
   * Move all aliens down and reverse direction
   *
   * TODO:
   * 1. Reverse direction
   * 2. Move all aliens down by one row height
   */
  private moveDownAndReverse(): void {
    this.direction *= -1;
    this.debugLog('moveDownAndReverse', { newDir: this.direction });
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          alien.move(0, 20);
        }
      }
    }
  }

  /**
   * Sync all alive alien physics bodies to their world positions.
   * Called after container moves to keep Arcade bodies aligned.
   */
  private syncBodiesToWorld(): void {
    let count = 0;
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (!alien || !alien.isAlive()) continue;
        const world = alien.getWorldTransformMatrix();
        const body = alien.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.reset(world.tx, world.ty);
          count++;
        }
      }
    }
    this.debugLog('syncBodiesToWorld', { synced: count });
  }

  private getLeftmostAliveAlien(): Alien | null {
    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          return alien;
        }
      }
    }
    return null;
  }

  private getRightmostAliveAlien(): Alien | null {
    for (let col = this.cols - 1; col >= 0; col--) {
      for (let row = 0; row < this.rows; row++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          return alien;
        }
      }
    }
    return null;
  }

  /**
   * Randomly drop bombs from aliens
   *
   * TODO:
   * 1. Check time since last bomb
   * 2. Pick random alive alien
   * 3. Have alien fire bomb
   * 4. Update last bomb time
   */
  private dropBombs(): void {
    const now = Date.now();
    if (now - this.lastBombTime < this.bombDropInterval) return;
    
    // Get bottom-most alive alien in each column
    for (let col = 0; col < this.cols; col++) {
      let bottomAlien: Alien | null = null;
      
      for (let row = this.rows - 1; row >= 0; row--) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          bottomAlien = alien;
          break;
        }
      }
      
      if (bottomAlien && Math.random() < this.bombDropChance) {
        // Emit dropBomb event for GameScene to handle (aliens are world-space)
        const wx = bottomAlien.x;
        const wy = bottomAlien.y + 20;
        this.debugLog('bombDrop attempt', { col, wx: Math.round(wx), wy: Math.round(wy) });
        this.scene.events.emit('dropBomb', wx, wy);
        if (this.scene.events.listenerCount('dropBomb') > 0) {
          this.lastBombTime = now;
          this.debugLog('bombDrop success');
          break; // Only one bomb per interval
        }
      }
    }
  }

  /**
   * Get all aliens in the grid (for physics group integration)
   * @returns 2D array of all aliens (including null positions)
   */
  getAliens(): (Alien | null)[][] {
    return this.aliens;
  }

  /**
   * Get all alive aliens in the grid (for physics group integration)
   * @returns Flat array of alive aliens
   */
  getAliveAliens(): Alien[] {
    const aliveAliens: Alien[] = [];
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          aliveAliens.push(alien);
        }
      }
    }
    return aliveAliens;
  }

  /**
   * Remove an alien from the grid
   * @param alien - Alien to remove
   */
  removeAlien(alien: Alien): void {
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        if (this.aliens[row][col] === alien) {
          this.aliens[row][col] = null;
          return;
        }
      }
    }
  }

  /**
   * Check if all aliens are destroyed
   * @returns true if no alive aliens remain
   */
  isAllDestroyed(): boolean {
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get number of alive aliens
   * @returns Count of living aliens
   */
  getAliveCount(): number {
    let count = 0;
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Check if aliens reached the player level
   * @returns true if any alien is too low
   */
  reachedPlayer(): boolean {
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive() && this.y + alien.y > 500) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Increase difficulty (speed and bomb frequency)
   * @param newSpeed - New movement speed
   * @param newBombChance - New bomb drop chance
   */
  increaseDifficulty(newSpeed: number, newBombChance: number): void {
    this.speed = newSpeed;
    this.bombDropChance = newBombChance;
    
    // Restart timer with new speed
    if (this.moveTimer) {
      this.moveTimer.remove();
    }
    this.startMovement();
  }

  destroy(): void {
    if (this.moveTimer) {
      this.moveTimer.remove();
    }
    super.destroy();
  }
}
