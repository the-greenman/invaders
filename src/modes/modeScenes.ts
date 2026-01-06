import { GameMode } from '../types/GameMode';

// Optional: specific transition scenes per (from -> to)
const transitionSceneMap: Partial<Record<string, string>> = {
  'SPACE_INVADERS->GALAGA': 'GalagaSkyTransitionScene'
};

// Intro scene per target mode
const modeIntroSceneMap: Partial<Record<GameMode, string>> = {
  [GameMode.SPACE_INVADERS]: 'SpaceInvadersIntroScene',
  [GameMode.GALAGA]: 'GalagaIntroScene'
};

export function getTransitionSceneKey(fromMode: GameMode, toMode: GameMode): string | null {
  const fromKey = GameMode[fromMode];
  const toKey = GameMode[toMode];
  const key = `${fromKey}->${toKey}`;
  return transitionSceneMap[key] || null;
}

export function getModeIntroSceneKey(toMode: GameMode): string | null {
  return modeIntroSceneMap[toMode] || null;
}
