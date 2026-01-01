import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KonamiCode } from '../../../src/utils/KonamiCode';

describe('KonamiCode', () => {
  let konamiCode: KonamiCode;

  beforeEach(() => {
    konamiCode = new KonamiCode(1000); // 1 second timeout
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

  describe('Timeout', () => {
    it('should reset sequence after timeout', () => {
      const startTime = 1000;

      // Start entering the code
      konamiCode.addInput('UP', startTime);
      konamiCode.addInput('UP', startTime + 100);
      konamiCode.addInput('DOWN', startTime + 200);

      expect(konamiCode.getProgress()).toBe(3);

      // Wait longer than timeout (1000ms) and try to continue with wrong input
      const timedOutInput = konamiCode.addInput('DOWN', startTime + 1500);

      expect(timedOutInput).toBe(false);
      expect(konamiCode.getProgress()).toBe(0); // Reset because DOWN isn't the start

      // But if we press the correct start input after timeout, it should work
      konamiCode.addInput('UP', startTime + 1600);
      expect(konamiCode.getProgress()).toBe(1);
    });

    it('should not timeout if inputs are fast enough', () => {
      const startTime = 1000;

      // Enter code quickly (100ms between each)
      konamiCode.addInput('UP', startTime);
      konamiCode.addInput('UP', startTime + 100);
      konamiCode.addInput('DOWN', startTime + 200);
      konamiCode.addInput('DOWN', startTime + 300);
      konamiCode.addInput('LEFT', startTime + 400);
      konamiCode.addInput('RIGHT', startTime + 500);
      konamiCode.addInput('LEFT', startTime + 600);
      konamiCode.addInput('RIGHT', startTime + 700);
      konamiCode.addInput('B', startTime + 800);
      const completed = konamiCode.addInput('A', startTime + 900);

      expect(completed).toBe(true);
      expect(konamiCode.isCompleted()).toBe(true);
    });

    it('should check timeout manually with checkTimeout()', () => {
      const startTime = 1000;

      konamiCode.addInput('UP', startTime);
      konamiCode.addInput('UP', startTime + 100);

      expect(konamiCode.getProgress()).toBe(2);

      // Check timeout before it expires
      const timedOut1 = konamiCode.checkTimeout(startTime + 500);
      expect(timedOut1).toBe(false);
      expect(konamiCode.getProgress()).toBe(2); // Still there

      // Check timeout after it expires
      const timedOut2 = konamiCode.checkTimeout(startTime + 1500);
      expect(timedOut2).toBe(true);
      expect(konamiCode.getProgress()).toBe(0); // Reset
    });

    it('should not timeout after completion', () => {
      const startTime = 1000;

      // Complete the code
      ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A'].forEach((input, i) => {
        konamiCode.addInput(input as any, startTime + i * 100);
      });

      expect(konamiCode.isCompleted()).toBe(true);

      // Try to timeout after completion
      const timedOut = konamiCode.checkTimeout(startTime + 10000);
      expect(timedOut).toBe(false);
      expect(konamiCode.isCompleted()).toBe(true);
    });

    it('should allow custom timeout values', () => {
      const customKonami = new KonamiCode(500); // 500ms timeout
      const startTime = 1000;

      customKonami.addInput('UP', startTime);
      customKonami.addInput('UP', startTime + 100);

      expect(customKonami.getProgress()).toBe(2);

      // After 601ms from last input (more than 500ms timeout)
      // Last input was at 1100, so 1100 + 501 = 1601
      customKonami.addInput('DOWN', startTime + 601);

      // Should timeout and reset, then try DOWN which isn't the start
      expect(customKonami.getProgress()).toBe(0);

      // Start fresh with correct input
      customKonami.addInput('UP', startTime + 700);
      expect(customKonami.getProgress()).toBe(1);
    });
  });
});
