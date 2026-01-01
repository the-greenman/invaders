import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the RandomProvider module BEFORE imports
vi.mock('../../../src/utils/RandomProvider', () => {
  const mockRandom = {
    between: vi.fn(() => 0),
    floatBetween: vi.fn(() => 0),
    random: vi.fn(() => 0),
    pick: vi.fn((arr: any[]) => arr ? arr[0] : undefined),
    shuffle: vi.fn((arr: any[]) => arr)
  };
  return {
    Random: mockRandom,
    PhaserRandomProvider: vi.fn()
  };
});

import { 
  DiveBombPath, 
  LoopPath, 
  WeavePath, 
  SwoopPath, 
  StrafePath, 
  createRandomAttackPath 
} from '../../../src/systems/AttackPath';
import { Random } from '../../../src/utils/RandomProvider';
import { GAME_HEIGHT, GAME_WIDTH } from '../../../src/constants';

describe('AttackPath', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.clearAllMocks();
    
    // Ensure mocks return default deterministic values
    vi.mocked(Random.between).mockReturnValue(0);
    vi.mocked(Random.floatBetween).mockReturnValue(0);
    vi.mocked(Random.random).mockReturnValue(0);
    vi.mocked(Random.pick).mockImplementation((arr: any[]) => arr[0]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Base Functionality', () => {
    it('should track progress correctly', () => {
      const duration = 1000;
      const path = new DiveBombPath(duration);
      path.start(0, 0);

      // t=0
      let pos = path.getCurrentPosition(0);
      expect(pos.t).toBeCloseTo(0);

      // t=0.5
      vi.advanceTimersByTime(500);
      pos = path.getCurrentPosition(0);
      expect(pos.t).toBeCloseTo(0.5);

      // t=1.0
      vi.advanceTimersByTime(500);
      pos = path.getCurrentPosition(0);
      expect(pos.t).toBeCloseTo(1.0);
    });

    it('should report isComplete correctly', () => {
      const duration = 1000;
      const path = new DiveBombPath(duration);
      path.start(0, 0);

      expect(path.isComplete()).toBe(false);
      vi.advanceTimersByTime(1000);
      expect(path.isComplete()).toBe(true);
    });
  });

  describe('Path Types', () => {
    describe('DiveBombPath', () => {
      it('should start at origin and end near target', () => {
        // Mock Random for deterministic control points
        vi.mocked(Random.between).mockReturnValue(0);
        
        const path = new DiveBombPath(1000);
        path.start(100, 100);

        const start = path.getCurrentPosition(0);
        expect(start.x).toBe(100);
        expect(start.y).toBe(100);

        vi.advanceTimersByTime(1000);
        const end = path.getCurrentPosition(0);
        
        // With Random.between returning 0:
        // targetX = startX + 0 = 100
        // targetY = GAME_HEIGHT + 50
        expect(end.x).toBe(100);
        expect(end.y).toBe(GAME_HEIGHT + 50);
      });
    });

    describe('LoopPath', () => {
      it('should complete a circular loop', () => {
        const path = new LoopPath(1000);
        path.start(0, 0);

        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;
        const radius = 150;

        // t=0 -> cos(0)=1, sin(0)=0 -> x=center+r, y=center
        const start = path.getCurrentPosition(0);
        expect(start.x).toBe(centerX + radius);
        expect(start.y).toBe(centerY);

        // t=0.5 -> cos(PI)=-1, sin(PI)=0 -> x=center-r, y=center
        vi.advanceTimersByTime(500);
        const mid = path.getCurrentPosition(0);
        expect(mid.x).toBeCloseTo(centerX - radius);
        expect(mid.y).toBeCloseTo(centerY);
      });
    });

    describe('StrafePath', () => {
      it('should move horizontally then vertically', () => {
        const path = new StrafePath(1000);
        path.start(100, 100); // Left side start -> midX = 100

        // Phase 1 (t < 0.5): Horizontal
        // Logic: midX = startX > width/2 ? 100 : width - 100
        // 100 < 400 -> midX = 800 - 100 = 700
        
        // t=0.25 (halfway through phase 1)
        vi.advanceTimersByTime(250);
        const p1 = path.getCurrentPosition(0);
        expect(p1.y).toBe(100); // Y stays constant
        expect(p1.x).toBeGreaterThan(100); // Moving right

        // t=0.75 (halfway through phase 2)
        vi.advanceTimersByTime(500);
        const p2 = path.getCurrentPosition(0);
        expect(p2.x).toBe(700); // X stays constant at midX
        expect(p2.y).toBeGreaterThan(100); // Moving down
      });
    });
  });

  describe('Factory', () => {
    it('should create random paths', () => {
      // Mock Random.random to deterministic values
      
      // 0.0 -> First weight (DiveBomb)
      vi.mocked(Random.random).mockReturnValue(0.0);
      expect(createRandomAttackPath()).toBeInstanceOf(DiveBombPath);

      // 0.99 -> Last weight (Strafe)
      vi.mocked(Random.random).mockReturnValue(0.99);
      expect(createRandomAttackPath()).toBeInstanceOf(StrafePath);
    });
  });
});
