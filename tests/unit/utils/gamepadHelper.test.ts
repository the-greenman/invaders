import { describe, it, expect, beforeEach } from 'vitest';
import { GamepadHelper } from '../../../src/utils/gamepadHelper';

describe('GamepadHelper', () => {
  describe('isAnyButtonPressed', () => {
    it('should return false when no buttons are pressed', () => {
      const gamepad = createMockGamepad([]);
      expect(GamepadHelper.isAnyButtonPressed(gamepad)).toBe(false);
    });

    it('should return true when a regular button is pressed', () => {
      const gamepad = createMockGamepad([0]); // Button 0 pressed
      expect(GamepadHelper.isAnyButtonPressed(gamepad)).toBe(true);
    });

    it('should return false when only dpad buttons are pressed', () => {
      const gamepad = createMockGamepad([12]); // Dpad up
      expect(GamepadHelper.isAnyButtonPressed(gamepad)).toBe(false);
    });

    it('should exclude dpad buttons (12-15)', () => {
      const gamepad = createMockGamepad([13]); // Dpad down
      expect(GamepadHelper.isAnyButtonPressed(gamepad)).toBe(false);

      const gamepad2 = createMockGamepad([14]); // Dpad left
      expect(GamepadHelper.isAnyButtonPressed(gamepad2)).toBe(false);

      const gamepad3 = createMockGamepad([15]); // Dpad right
      expect(GamepadHelper.isAnyButtonPressed(gamepad3)).toBe(false);
    });

    it('should exclude specified buttons', () => {
      const gamepad = createMockGamepad([1]); // Button 1 (back button)
      expect(GamepadHelper.isAnyButtonPressed(gamepad, [1])).toBe(false);
    });

    it('should return true when non-excluded button is pressed', () => {
      const gamepad = createMockGamepad([0, 1]); // Buttons 0 and 1 pressed
      expect(GamepadHelper.isAnyButtonPressed(gamepad, [1])).toBe(true); // Button 0 not excluded
    });

    it('should handle multiple pressed buttons correctly', () => {
      const gamepad = createMockGamepad([0, 2, 5]);
      expect(GamepadHelper.isAnyButtonPressed(gamepad)).toBe(true);
    });

    it('should handle gamepad with no buttons gracefully', () => {
      const gamepad = createMockGamepad([], 0);
      expect(GamepadHelper.isAnyButtonPressed(gamepad)).toBe(false);
    });
  });

  describe('isButtonPressed', () => {
    it('should return true when specific button is pressed', () => {
      const gamepad = createMockGamepad([0, 2]);
      expect(GamepadHelper.isButtonPressed(gamepad, 0)).toBe(true);
      expect(GamepadHelper.isButtonPressed(gamepad, 2)).toBe(true);
    });

    it('should return false when specific button is not pressed', () => {
      const gamepad = createMockGamepad([0]);
      expect(GamepadHelper.isButtonPressed(gamepad, 1)).toBe(false);
    });

    it('should handle invalid button index', () => {
      const gamepad = createMockGamepad([0]);
      expect(GamepadHelper.isButtonPressed(gamepad, 100)).toBe(false);
    });
  });

  describe('getAnyPressedButton', () => {
    it('should return first pressed button index', () => {
      const gamepad = createMockGamepad([2, 5]);
      expect(GamepadHelper.getAnyPressedButton(gamepad)).toBe(2);
    });

    it('should return -1 when no buttons pressed', () => {
      const gamepad = createMockGamepad([]);
      expect(GamepadHelper.getAnyPressedButton(gamepad)).toBe(-1);
    });

    it('should skip dpad buttons', () => {
      const gamepad = createMockGamepad([12, 13, 5]);
      expect(GamepadHelper.getAnyPressedButton(gamepad)).toBe(5);
    });

    it('should skip excluded buttons', () => {
      const gamepad = createMockGamepad([1, 5]);
      expect(GamepadHelper.getAnyPressedButton(gamepad, [1])).toBe(5);
    });
  });
});

// Helper to create mock gamepad
function createMockGamepad(pressedButtons: number[], totalButtons: number = 16): Phaser.Input.Gamepad.Gamepad {
  const buttons: any[] = [];
  for (let i = 0; i < totalButtons; i++) {
    buttons.push({
      pressed: pressedButtons.includes(i),
      value: pressedButtons.includes(i) ? 1 : 0
    });
  }

  return {
    buttons,
    connected: true
  } as any;
}
