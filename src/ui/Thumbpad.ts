import Phaser from 'phaser';

/**
 * Thumbpad Component
 *
 * A reusable virtual thumbpad/joystick for touch controls.
 * Displays a circular pad with a draggable thumb that returns to center.
 */
export class Thumbpad {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private radius: number;
  private thumbRadius: number;

  // Visual elements
  private baseCircle?: Phaser.GameObjects.Graphics;
  private thumbCircle?: Phaser.GameObjects.Graphics;
  private zone?: Phaser.GameObjects.Zone;

  // State
  private isDragging: boolean = false;
  private currentAngle: number = 0;
  private currentDistance: number = 0;
  private activePointerId: number | null = null;

  // Movement output
  private horizontalAxis: number = 0; // -1 to 1
  private verticalAxis: number = 0; // -1 to 1 (for future use)

  // Stored event handlers for cleanup
  private pointerMoveHandler?: (pointer: Phaser.Input.Pointer) => void;
  private pointerUpHandler?: (pointer: Phaser.Input.Pointer) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number = 60) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.thumbRadius = radius * 0.4;

    this.create();
  }

  private create(): void {
    // Base circle (outer boundary)
    this.baseCircle = this.scene.add.graphics();
    this.baseCircle.setDepth(1000);
    this.baseCircle.setScrollFactor(0);
    this.drawBase();

    // Thumb circle (draggable center)
    this.thumbCircle = this.scene.add.graphics();
    this.thumbCircle.setDepth(1001);
    this.thumbCircle.setScrollFactor(0);
    this.drawThumb(this.x, this.y);

    // Interactive zone
    this.zone = this.scene.add.zone(this.x, this.y, this.radius * 2, this.radius * 2);
    this.zone.setOrigin(0.5);
    this.zone.setInteractive();
    this.zone.setScrollFactor(0);
    this.zone.setDepth(1000);

    this.setupEvents();
  }

  private drawBase(): void {
    if (!this.baseCircle) return;

    this.baseCircle.clear();

    // Outer ring
    this.baseCircle.lineStyle(3, 0x00ff00, 0.5);
    this.baseCircle.strokeCircle(this.x, this.y, this.radius);

    // Inner fill
    this.baseCircle.fillStyle(0x00ff00, 0.1);
    this.baseCircle.fillCircle(this.x, this.y, this.radius);

    // Center crosshair
    this.baseCircle.lineStyle(1, 0x00ff00, 0.3);
    this.baseCircle.lineBetween(this.x - 10, this.y, this.x + 10, this.y);
    this.baseCircle.lineBetween(this.x, this.y - 10, this.x, this.y + 10);
  }

  private drawThumb(thumbX: number, thumbY: number): void {
    if (!this.thumbCircle) return;

    this.thumbCircle.clear();

    // Thumb shadow
    this.thumbCircle.fillStyle(0x000000, 0.2);
    this.thumbCircle.fillCircle(thumbX + 2, thumbY + 2, this.thumbRadius);

    // Thumb
    this.thumbCircle.fillStyle(0x00ff00, 0.6);
    this.thumbCircle.fillCircle(thumbX, thumbY, this.thumbRadius);

    // Thumb outline
    this.thumbCircle.lineStyle(2, 0x00ff00, 0.9);
    this.thumbCircle.strokeCircle(thumbX, thumbY, this.thumbRadius);
  }

  private setupEvents(): void {
    if (!this.zone) return;

    // Pointer down - start dragging
    this.zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointerId === null) {
        this.activePointerId = pointer.id;
        this.isDragging = true;
        this.updateThumbPosition(pointer.x, pointer.y);
      }
    });

    // Store handler references for cleanup
    this.pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && this.activePointerId === pointer.id) {
        this.updateThumbPosition(pointer.x, pointer.y);
      }
    };

    this.pointerUpHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.activePointerId === pointer.id) {
        this.isDragging = false;
        this.activePointerId = null;
        this.resetThumb();
      }
    };

    // Global pointer move - track dragging
    this.scene.input.on('pointermove', this.pointerMoveHandler);

    // Global pointer up - stop dragging
    this.scene.input.on('pointerup', this.pointerUpHandler);
    this.scene.input.on('pointerupoutside', this.pointerUpHandler);
  }

  private updateThumbPosition(pointerX: number, pointerY: number): void {
    // Calculate offset from center
    const deltaX = pointerX - this.x;
    const deltaY = pointerY - this.y;

    // Calculate angle and distance
    this.currentAngle = Math.atan2(deltaY, deltaX);
    this.currentDistance = Math.min(
      Math.sqrt(deltaX * deltaX + deltaY * deltaY),
      this.radius - this.thumbRadius
    );

    // Calculate thumb position
    const thumbX = this.x + Math.cos(this.currentAngle) * this.currentDistance;
    const thumbY = this.y + Math.sin(this.currentAngle) * this.currentDistance;

    // Update visual
    this.drawThumb(thumbX, thumbY);

    // Calculate normalized axes (-1 to 1)
    const maxDistance = this.radius - this.thumbRadius;
    this.horizontalAxis = (Math.cos(this.currentAngle) * this.currentDistance) / maxDistance;
    this.verticalAxis = (Math.sin(this.currentAngle) * this.currentDistance) / maxDistance;

    // Apply deadzone
    const deadzone = 0.15;
    if (Math.abs(this.horizontalAxis) < deadzone) this.horizontalAxis = 0;
    if (Math.abs(this.verticalAxis) < deadzone) this.verticalAxis = 0;
  }

  private resetThumb(): void {
    this.drawThumb(this.x, this.y);
    this.horizontalAxis = 0;
    this.verticalAxis = 0;
    this.currentDistance = 0;
  }

  /**
   * Get horizontal axis value (-1 = left, 1 = right, 0 = center)
   */
  getHorizontalAxis(): number {
    return this.horizontalAxis;
  }

  /**
   * Get vertical axis value (-1 = up, 1 = down, 0 = center)
   */
  getVerticalAxis(): number {
    return this.verticalAxis;
  }

  /**
   * Get current distance from center (0 to 1)
   */
  getDistance(): number {
    return this.currentDistance / (this.radius - this.thumbRadius);
  }

  /**
   * Check if thumbpad is currently being dragged
   */
  isDraggingThumb(): boolean {
    return this.isDragging;
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.baseCircle?.setVisible(visible);
    this.thumbCircle?.setVisible(visible);
    this.zone?.setActive(visible);
  }

  /**
   * Set alpha (transparency)
   */
  setAlpha(alpha: number): void {
    this.baseCircle?.setAlpha(alpha);
    this.thumbCircle?.setAlpha(alpha);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Remove scene input listeners
    if (this.pointerMoveHandler) {
      this.scene.input.off('pointermove', this.pointerMoveHandler);
    }
    if (this.pointerUpHandler) {
      this.scene.input.off('pointerup', this.pointerUpHandler);
      this.scene.input.off('pointerupoutside', this.pointerUpHandler);
    }

    // Destroy game objects
    this.baseCircle?.destroy();
    this.thumbCircle?.destroy();
    this.zone?.destroy();
  }
}
