/**
 * GamepadHelper
 *
 * Utility functions for handling gamepad input in a consistent way across scenes.
 * Provides helpers to detect button presses while excluding dpad and other specified buttons.
 */

// Standard gamepad button indices for dpad
const DPAD_BUTTONS = [12, 13, 14, 15]; // up, down, left, right

export class GamepadHelper {
  /**
   * Check if any button (excluding dpad and specified buttons) is pressed
   * @param gamepad - The gamepad to check
   * @param excludeButtons - Additional button indices to exclude (e.g., back button)
   * @returns true if any non-excluded button is pressed
   */
  static isAnyButtonPressed(
    gamepad: Phaser.Input.Gamepad.Gamepad,
    excludeButtons: number[] = []
  ): boolean {
    if (!gamepad || !gamepad.buttons) return false;

    for (let i = 0; i < gamepad.buttons.length; i++) {
      // Skip dpad buttons
      if (DPAD_BUTTONS.includes(i)) continue;

      // Skip explicitly excluded buttons
      if (excludeButtons.includes(i)) continue;

      // Check if button is pressed
      if (gamepad.buttons[i]?.pressed) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a specific button is pressed
   * @param gamepad - The gamepad to check
   * @param buttonIndex - The button index to check
   * @returns true if the button is pressed
   */
  static isButtonPressed(
    gamepad: Phaser.Input.Gamepad.Gamepad,
    buttonIndex: number
  ): boolean {
    if (!gamepad || !gamepad.buttons) return false;
    return !!gamepad.buttons[buttonIndex]?.pressed;
  }

  /**
   * Get the index of the first pressed button (excluding dpad and specified buttons)
   * @param gamepad - The gamepad to check
   * @param excludeButtons - Additional button indices to exclude
   * @returns the button index, or -1 if no button is pressed
   */
  static getAnyPressedButton(
    gamepad: Phaser.Input.Gamepad.Gamepad,
    excludeButtons: number[] = []
  ): number {
    if (!gamepad || !gamepad.buttons) return -1;

    for (let i = 0; i < gamepad.buttons.length; i++) {
      // Skip dpad buttons
      if (DPAD_BUTTONS.includes(i)) continue;

      // Skip explicitly excluded buttons
      if (excludeButtons.includes(i)) continue;

      // Return first pressed button
      if (gamepad.buttons[i]?.pressed) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Check if the gamepad is connected
   * @param gamepad - The gamepad to check
   * @returns true if gamepad exists and is connected
   */
  static isConnected(gamepad: Phaser.Input.Gamepad.Gamepad | null): boolean {
    return !!gamepad && gamepad.connected;
  }
}
