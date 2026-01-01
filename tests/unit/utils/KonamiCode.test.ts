import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KonamiCode } from '../../../src/utils/KonamiCode';

describe('KonamiCode', () => {
  let konamiCode: KonamiCode;

  beforeEach(() => {
    konamiCode = new KonamiCode();
  });

  describe('Initialization', () => {
    it('should start with no progress', () => {
      expect(konamiCode.getProgress()).toBe(0);
      expect(konamiCode.isCompleted()).toBe(false);
    });

    it('should provide the correct sequence', () => {
      const sequence = KonamiCode.getSequence();
      expect(sequence).toEqual(['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A']);
    });
  });

  describe('Input Tracking', () => {
    it('should track correct inputs', () => {
      konamiCode.addInput('UP');
      expect(konamiCode.getProgress()).toBe(1);

      konamiCode.addInput('UP');
      expect(konamiCode.getProgress()).toBe(2);

      konamiCode.addInput('DOWN');
      expect(konamiCode.getProgress()).toBe(3);
    });

    it('should reset on wrong input', () => {
      konamiCode.addInput('UP');
      konamiCode.addInput('UP');
      expect(konamiCode.getProgress()).toBe(2);

      konamiCode.addInput('LEFT'); // Wrong! Should be DOWN
      expect(konamiCode.getProgress()).toBe(0);
    });

    it('should complete the code with full sequence', () => {
      const completed = konamiCode.addInput('UP')
        || konamiCode.addInput('UP')
        || konamiCode.addInput('DOWN')
        || konamiCode.addInput('DOWN')
        || konamiCode.addInput('LEFT')
        || konamiCode.addInput('RIGHT')
        || konamiCode.addInput('LEFT')
        || konamiCode.addInput('RIGHT')
        || konamiCode.addInput('B')
        || konamiCode.addInput('A');

      expect(completed).toBe(true);
      expect(konamiCode.isCompleted()).toBe(true);
      expect(konamiCode.getProgress()).toBe(10);
    });

    it('should return true only on the final input', () => {
      expect(konamiCode.addInput('UP')).toBe(false);
      expect(konamiCode.addInput('UP')).toBe(false);
      expect(konamiCode.addInput('DOWN')).toBe(false);
      expect(konamiCode.addInput('DOWN')).toBe(false);
      expect(konamiCode.addInput('LEFT')).toBe(false);
      expect(konamiCode.addInput('RIGHT')).toBe(false);
      expect(konamiCode.addInput('LEFT')).toBe(false);
      expect(konamiCode.addInput('RIGHT')).toBe(false);
      expect(konamiCode.addInput('B')).toBe(false);
      expect(konamiCode.addInput('A')).toBe(true); // Final input!
    });

    it('should not accept inputs after completion', () => {
      // Complete the code
      ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A'].forEach(input => {
        konamiCode.addInput(input as any);
      });

      expect(konamiCode.isCompleted()).toBe(true);

      // Try to add more inputs
      const result = konamiCode.addInput('UP');
      expect(result).toBe(false);
      expect(konamiCode.getProgress()).toBe(10); // Still at 10
    });
  });

  describe('Callback', () => {
    it('should call callback when code is completed', () => {
      const callback = vi.fn();
      konamiCode.onComplete(callback);

      // Enter the complete sequence
      ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A'].forEach(input => {
        konamiCode.addInput(input as any);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback on wrong input', () => {
      const callback = vi.fn();
      konamiCode.onComplete(callback);

      konamiCode.addInput('UP');
      konamiCode.addInput('DOWN'); // Wrong!

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Reset', () => {
    it('should reset the tracker', () => {
      konamiCode.addInput('UP');
      konamiCode.addInput('UP');
      konamiCode.addInput('DOWN');

      expect(konamiCode.getProgress()).toBe(3);

      konamiCode.reset();

      expect(konamiCode.getProgress()).toBe(0);
      expect(konamiCode.isCompleted()).toBe(false);
    });

    it('should allow re-entry after reset', () => {
      // Complete the code
      ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A'].forEach(input => {
        konamiCode.addInput(input as any);
      });

      expect(konamiCode.isCompleted()).toBe(true);

      konamiCode.reset();

      // Should be able to enter the code again
      expect(konamiCode.addInput('UP')).toBe(false);
      expect(konamiCode.getProgress()).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial correct sequences', () => {
      konamiCode.addInput('UP');
      konamiCode.addInput('UP');
      konamiCode.addInput('DOWN');
      konamiCode.addInput('DOWN');
      konamiCode.addInput('LEFT');

      expect(konamiCode.getProgress()).toBe(5);
      expect(konamiCode.isCompleted()).toBe(false);

      // Wrong input
      konamiCode.addInput('UP');
      expect(konamiCode.getProgress()).toBe(0);
    });

    it('should handle rapid repeated inputs', () => {
      konamiCode.addInput('UP');
      konamiCode.addInput('UP');
      konamiCode.addInput('UP'); // Extra UP - should reset

      expect(konamiCode.getProgress()).toBe(0);
    });
  });
});
