/**
 * Game Mode System
 *
 * Manages switching between Space Invaders (Game 1) and Galaga (Game 2) modes.
 * Modes can auto-switch after X levels or be manually switched via number keys.
 */

export enum GameMode {
  SPACE_INVADERS = 1,
  GALAGA = 2
}

export interface GameModeConfig {
  mode: GameMode;
  levelsSinceLastSwitch: number;
  autoSwitchInterval: number;
}

/**
 * Get display name for a game mode
 */
export function getGameModeName(mode: GameMode): string {
  return mode === GameMode.GALAGA ? 'GALAGA (GAME 2)' : 'SPACE INVADERS (GAME 1)';
}

/**
 * Get short display name for UI
 */
export function getGameModeShortName(mode: GameMode): string {
  return mode === GameMode.GALAGA ? 'GAME 2' : 'GAME 1';
}
