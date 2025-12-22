import Phaser from 'phaser';
import { Alien } from './Alien';
import { Bomb } from './Bomb';
import { ALIEN_SPACING_X, ALIEN_SPACING_Y } from '../constants';

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
        const x = col * ALIEN_SPACING_X;
        const y = row * ALIEN_SPACING_Y;
        
        // Different alien types for different rows
        let type = 0; // bottom rows
        if (row < 1) type = 2; // top row
        else if (row < 3) type = 1; // middle rows
        
        const alien = new Alien(this.scene, x, y, type, { row, col });
        this.aliens[row][col] = alien;
        this.add(alien);
      }
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
  }

  update(delta: number): void {
    // Bomb dropping is handled in moveStep for better timing
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
    const leftmost = this.getLeftmostAliveAlien();
    const rightmost = this.getRightmostAliveAlien();
    
    if (!leftmost || !rightmost) return false;
    
    const worldX = this.x;
    const leftEdge = worldX + leftmost.x;
    const rightEdge = worldX + rightmost.x;
    
    return (leftEdge <= 50 && this.direction === -1) || 
           (rightEdge >= 750 && this.direction === 1);
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
    
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        const alien = this.aliens[row][col];
        if (alien && alien.isAlive()) {
          alien.move(0, 20);
        }
      }
    }
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
        // Emit dropBomb event for GameScene to handle
        this.scene.events.emit('dropBomb', this.x + bottomAlien.x, this.y + bottomAlien.y + 20);
        if (this.scene.events.listenerCount('dropBomb') > 0) {
          this.lastBombTime = now;
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
