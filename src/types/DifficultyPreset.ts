export enum DifficultyPreset {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXTREME = 'EXTREME',
}

export function getDifficultyName(preset: DifficultyPreset): string {
  switch (preset) {
    case DifficultyPreset.EASY:
      return 'Easy';
    case DifficultyPreset.MEDIUM:
      return 'Medium';
    case DifficultyPreset.HARD:
      return 'Hard';
    case DifficultyPreset.EXTREME:
      return 'Extreme';
    default:
      return 'Medium';
  }
}
