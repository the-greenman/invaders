import Phaser from 'phaser';

/**
 * Shield Entity
 *
 * Represents a destructible barrier that protects the player.
 * Handles pixel-level destruction from bullets and bombs.
 *
 * Extends Phaser.GameObjects.Sprite with custom collision detection.
 */

export class Shield extends Phaser.GameObjects.Sprite {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textureKey: string;
  private destroyed: boolean = false;
  private pixelCount: number = 0;
  private static shieldCounter: number = 0;

  private static generateTextureKey(): string {
    return `shield-${Shield.shieldCounter++}`;
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Generate unique texture key using static helper
    const textureKey = Shield.generateTextureKey();
    
    // Create canvas texture first
    const canvas = scene.textures.createCanvas(textureKey, 60, 40);
    if (!canvas) {
      throw new Error('Failed to create canvas texture');
    }
    
    const ctx = canvas.getContext();
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Draw initial shield shape
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, 0, 60, 40);
    
    // Create some holes in the shield (classic Space Invaders style)
    ctx.clearRect(5, 5, 5, 5);
    ctx.clearRect(15, 10, 5, 5);
    ctx.clearRect(25, 5, 5, 5);
    ctx.clearRect(35, 10, 5, 5);
    ctx.clearRect(45, 5, 5, 5);
    ctx.clearRect(10, 20, 5, 5);
    ctx.clearRect(20, 15, 5, 5);
    ctx.clearRect(30, 15, 5, 5);
    ctx.clearRect(40, 20, 5, 5);
    
    // Now call super with the texture key
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    
    // Initialize instance properties
    this.textureKey = textureKey;
    this.canvas = canvas.getCanvas();
    this.ctx = ctx;
    this.pixelCount = this.countPixels();
  }

  /**
   * Initialize pixel data for collision detection
   *
   * TODO:
   * 1. Create canvas matching shield texture size
   * 2. Draw shield texture to canvas
   * 3. Get pixel data for collision detection
   */
  private countPixels(): number {
    // Simple approximation - count non-transparent pixels in a few sample areas
    // This is much faster than scanning the entire canvas
    const imageData = this.ctx.getImageData(0, 0, 60, 40);
    let count = 0;
    
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) count++;
    }
    
    return count;
  }

  /**
   * Check collision with a point
   * @param x - X coordinate to check
   * @param y - Y coordinate to check
   * @returns true if point collides with shield pixels
   *
   * TODO:
   * 1. Convert world coordinates to local shield coordinates
   * 2. Check if coordinates are within shield bounds
   * 3. Check pixel data at coordinates
   * 4. Return true if pixel is not transparent
   */
  checkPixelCollision(worldX: number, worldY: number): boolean {
    if (this.destroyed) return false;

    // Convert world coordinates to local shield coordinates
    const localX = Math.floor(worldX - this.x + 30); // 30 = width/2
    const localY = Math.floor(worldY - this.y + 20); // 20 = height/2
    
    // Check if coordinates are within shield bounds
    if (localX < 0 || localX >= 60 || localY < 0 || localY >= 40) {
      return false;
    }
    
    // Check pixel data at coordinates
    const imageData = this.ctx.getImageData(localX, localY, 1, 1);
    return imageData.data[3] > 0; // Check alpha channel
  }

  /**
   * Destroy pixels in a circular area
   * @param x - Center X of destruction
   * @param y - Center Y of destruction
   * @param radius - Radius of destruction
   *
   * TODO:
   * 1. Convert world coordinates to local coordinates
   * 2. Clear pixels in circular area on canvas
   * 3. Update texture from canvas
   * 4. Check if shield is completely destroyed
   */
  destroyPixels(worldX: number, worldY: number, radius: number): void {
    if (this.destroyed) return;

    // Convert world coordinates to local coordinates
    const localX = worldX - this.x + 30;
    const localY = worldY - this.y + 20;
    
    // Clear pixels in circular area
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(localX, localY, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    
    // Update texture
    (this.texture as Phaser.Textures.CanvasTexture).refresh();
    
    // Check if shield is completely destroyed
    this.pixelCount = this.countPixels();
    if (this.pixelCount < 50) { // Less than 50 pixels remaining
      this.destroyed = true;
      this.setVisible(false);
    }
  }

  /**
   * Create explosion effect at position
   * @param x - Explosion X position
   * @param y - Explosion Y position
   *
   * TODO:
   * 1. Create particle effect
   * 2. Play destruction sound
   * 3. Call destroyPixels with appropriate radius
   */
  explode(worldX: number, worldY: number): void {
    // Create explosion effect at hit position
    const explosion = this.scene.add.circle(worldX, worldY, 6, 0x00ff00);
    explosion.setAlpha(0.6);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 2,
      duration: 150,
      onComplete: () => explosion.destroy()
    });
    
    // Destroy pixels in area
    this.destroyPixels(worldX, worldY, 8);
  }

  /**
   * Check if shield is completely destroyed
   * @returns true if no pixels remain
   *
   * TODO:
   * 1. Scan pixel data for any non-transparent pixels
   * 2. Return false if any pixels found
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Reset shield to original state
   *
   * TODO:
   * 1. Reset destroyed flag
   * 2. Redraw original shield texture
   * 3. Update pixel data
   */
  reset(): void {
    // Clear and redraw shield
    this.ctx.clearRect(0, 0, 60, 40);
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillRect(0, 0, 60, 40);
    
    // Redraw holes
    this.ctx.clearRect(5, 5, 5, 5);
    this.ctx.clearRect(15, 10, 5, 5);
    this.ctx.clearRect(25, 5, 5, 5);
    this.ctx.clearRect(35, 10, 5, 5);
    this.ctx.clearRect(45, 5, 5, 5);
    this.ctx.clearRect(10, 20, 5, 5);
    this.ctx.clearRect(20, 15, 5, 5);
    this.ctx.clearRect(30, 15, 5, 5);
    this.ctx.clearRect(40, 20, 5, 5);
    
    // Update texture and state
    (this.texture as Phaser.Textures.CanvasTexture).refresh();
    this.destroyed = false;
    this.setVisible(true);
    this.pixelCount = this.countPixels();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clean up texture
    this.scene.textures.remove(this.textureKey);
    super.destroy();
  }
}
