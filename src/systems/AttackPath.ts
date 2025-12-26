import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

/**
 * Attack Path System - Curves for Galaga Wave Attacks
 *
 * Base class and 5 concrete implementations for different attack patterns.
 *
 *
 * 1. Implement the base AttackPath class with:
 *    - start(startX, startY) method to initialize path
 *    - getCurrentPosition(delta) returns {x, y, t} where t is progress 0-1
 *    - isComplete() returns true when path finished
 * 2. Implement 5 concrete path classes:
 *    - DiveBombPath (quadratic bezier)
 *    - LoopPath (parametric circle)
 *    - WeavePath (sine wave + linear)
 *    - SwoopPath (cubic bezier)
 *    - StrafePath (two-phase linear)
 * 3. Each path should:
 *    - Take duration in constructor (how long path takes to complete)
 *    - Use time-based progress (t = elapsed / duration)
 *    - Return positions along the curve at any time t
 *
 * MATH REFERENCES:
 * - Quadratic Bezier: P = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
 * - Cubic Bezier: P = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
 * - Parametric Circle: x = cx + r*cos(θ), y = cy + r*sin(θ)
 * - Sine Wave: x = baseX + amplitude * sin(t * frequency * 2π)
 */

/**
 * Base class for all attack paths
 */
export abstract class AttackPath {
  protected duration: number; // milliseconds
  protected startTime: number = 0;
  protected startX: number = 0;
  protected startY: number = 0;

  constructor(duration: number) {
    this.duration = duration;
  }

  /**
   * Start the path from a position
   */
  start(startX: number, startY: number): void {
    this.startX = startX;
    this.startY = startY;
    this.startTime = Date.now();
  }

  /**
   * Get current position along path
   * @param delta - Frame delta time (for future use)
   * @returns {x, y, t} where t is progress 0-1
   */
  getCurrentPosition(delta: number): { x: number; y: number; t: number } {
    const elapsed = Date.now() - this.startTime;
    const t = Math.min(elapsed / this.duration, 1.0);
    return this.getPointAtTime(t);
  }

  /**
   * Check if path complete
   */
  isComplete(): boolean {
    return (Date.now() - this.startTime) >= this.duration;
  }

  /**
   * Abstract method - calculate position at time t (0-1)
   * Each path type implements its own curve math
   */
  abstract getPointAtTime(t: number): { x: number; y: number; t: number };
}

/**
 * DiveBombPath - Simple quadratic bezier dive
 *
 * TODO: Implement using quadratic bezier formula:
 * P = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
 *
 * Where:
 * - P₀ = start position
 * - P₁ = control point (randomly offset from start)
 * - P₂ = target position (bottom of screen)
 */
export class DiveBombPath extends AttackPath {
  private controlX: number = 0;
  private controlY: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;

  constructor(duration: number = 3000) {
    super(duration);
  }

  start(startX: number, startY: number): void {
    super.start(startX, startY);

    // Control point: offset from start for curve
    this.controlX = startX + Phaser.Math.Between(-100, 100);
    this.controlY = startY + 400;

    // Target: near bottom of screen
    this.targetX = startX + Phaser.Math.Between(-100, 100);
    this.targetY = GAME_HEIGHT + 50; // Just off screen
  }

  getPointAtTime(t: number): { x: number; y: number; t: number } {
    // Quadratic Bezier: P = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const x = Math.pow(1-t, 2) * this.startX +
              2 * (1-t) * t * this.controlX +
              Math.pow(t, 2) * this.targetX;
    const y = Math.pow(1-t, 2) * this.startY +
              2 * (1-t) * t * this.controlY +
              Math.pow(t, 2) * this.targetY;
    return { x, y, t };
  }
}

/**
 * LoopPath - 360° circular loop
 *
 * TODO: Implement using parametric circle:
 * x = centerX + radius * cos(angle)
 * y = centerY + radius * sin(angle)
 * where angle = t * 2π for full circle
 */
export class LoopPath extends AttackPath {
  private centerX: number = 0;
  private centerY: number = 0;
  private radius: number = 150;

  constructor(duration: number = 4000) {
    super(duration);
  }

  start(startX: number, startY: number): void {
    super.start(startX, startY);
    // Calculate loop center
    this.centerX = GAME_WIDTH / 2;
    this.centerY = GAME_HEIGHT / 2;
  }

  getPointAtTime(t: number): { x: number; y: number; t: number } {
    // Parametric circle: x = cx + r*cos(θ), y = cy + r*sin(θ)
    const angle = t * Math.PI * 2;
    const x = this.centerX + this.radius * Math.cos(angle);
    const y = this.centerY + this.radius * Math.sin(angle);
    return { x, y, t };
  }
}

/**
 * WeavePath - Sine wave with linear descent
 *
 * TODO: Combine sine wave (horizontal) with linear movement (vertical)
 */
export class WeavePath extends AttackPath {
  private amplitude: number = 100;
  private frequency: number = 2;

  constructor(duration: number = 3500) {
    super(duration);
  }

  getPointAtTime(t: number): { x: number; y: number; t: number } {
    // Sine wave (horizontal) + linear descent (vertical)
    const x = this.startX + this.amplitude * Math.sin(t * this.frequency * Math.PI * 2);
    const y = this.startY + (GAME_HEIGHT - this.startY) * t;
    return { x, y, t };
  }
}

/**
 * SwoopPath - Wide cubic bezier arc
 *
 * TODO: Implement using cubic bezier with 2 control points
 * for smoother, more dramatic curves
 */
export class SwoopPath extends AttackPath {
  private control1X: number = 0;
  private control1Y: number = 0;
  private control2X: number = 0;
  private control2Y: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;

  constructor(duration: number = 3500) {
    super(duration);
  }

  start(startX: number, startY: number): void {
    super.start(startX, startY);
    // Calculate cubic bezier control points for S-curve
    const side = startX < GAME_WIDTH / 2 ? 1 : -1;
    this.control1X = startX + (side * 200);
    this.control1Y = startY + 200;
    this.control2X = startX - (side * 200);
    this.control2Y = startY + 400;
    this.targetX = startX;
    this.targetY = GAME_HEIGHT + 50;
  }

  getPointAtTime(t: number): { x: number; y: number; t: number } {
    // Cubic Bezier: P = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
    const t1 = 1 - t;
    const x = Math.pow(t1, 3) * this.startX +
              3 * Math.pow(t1, 2) * t * this.control1X +
              3 * t1 * Math.pow(t, 2) * this.control2X +
              Math.pow(t, 3) * this.targetX;
    const y = Math.pow(t1, 3) * this.startY +
              3 * Math.pow(t1, 2) * t * this.control1Y +
              3 * t1 * Math.pow(t, 2) * this.control2Y +
              Math.pow(t, 3) * this.targetY;
    return { x, y, t };
  }
}

/**
 * StrafePath - Two-phase (horizontal then vertical)
 *
 * TODO: First half: move horizontally across screen
 *       Second half: dive vertically down
 */
export class StrafePath extends AttackPath {
  private midX: number = 0;
  private midY: number = 0;

  constructor(duration: number = 4000) {
    super(duration);
  }

  start(startX: number, startY: number): void {
    super.start(startX, startY);
    // Calculate midpoint for phase transition
    this.midX = startX > GAME_WIDTH/2 ? 100 : GAME_WIDTH - 100;
    this.midY = startY;
  }

  getPointAtTime(t: number): { x: number; y: number; t: number } {
    if (t < 0.5) {
      // Phase 1: Horizontal strafe
      const phaseT = t * 2; // 0-1 for first half
      const x = this.startX + (this.midX - this.startX) * phaseT;
      const y = this.startY;
      return { x, y, t };
    } else {
      // Phase 2: Vertical dive
      const phaseT = (t - 0.5) * 2; // 0-1 for second half
      const x = this.midX;
      const y = this.midY + (GAME_HEIGHT - this.midY) * phaseT;
      return { x, y, t };
    }
  }
}

/**
 * Factory function to create random attack path
 */
export function createRandomAttackPath(): AttackPath {
  const patterns = [DiveBombPath, LoopPath, WeavePath, SwoopPath, StrafePath];
  const weights = [0.3, 0.15, 0.25, 0.2, 0.1]; // Probability distribution

  // Weighted random selection
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return new patterns[i]();
    }
  }

  return new DiveBombPath(); // Fallback
}
