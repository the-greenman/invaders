import { DifficultyPreset } from './DifficultyPreset';

export interface DifficultyMultipliers {
  speedMultiplier: number;
  bombFrequencyMultiplier: number;
  waveIntervalMultiplier: number; // >1 = longer gap between waves, <1 = shorter gap
  waveSizeMultiplier: number;     // >1 = larger waves, <1 = smaller waves
  rowCountMultiplier: number;     // scales number of alien rows
  levelScalingMultiplier: number; // accelerates or slows level-over-level scaling
  pointsMultiplier: number;       // scales score points awarded
  maxSimultaneousWaves: number;   // cap for concurrent waves in Galaga
}

export const DIFFICULTY_CONFIGS: Record<DifficultyPreset, DifficultyMultipliers> = {
  [DifficultyPreset.EASY]: {
    speedMultiplier: 0.85,
    bombFrequencyMultiplier: 0.75,
    waveIntervalMultiplier: 1.25,
    waveSizeMultiplier: 0.85,
    rowCountMultiplier: 0.9,
    levelScalingMultiplier: 0.9,
    pointsMultiplier: 0.8,
    maxSimultaneousWaves: 1,
  },
  [DifficultyPreset.MEDIUM]: {
    speedMultiplier: 1.0,
    bombFrequencyMultiplier: 1.0,
    waveIntervalMultiplier: 1.0,
    waveSizeMultiplier: 1.0,
    rowCountMultiplier: 1.0,
    levelScalingMultiplier: 1.0,
    pointsMultiplier: 1.0,
    maxSimultaneousWaves: 2,
  },
  [DifficultyPreset.HARD]: {
    speedMultiplier: 1.3,        // Increased from 1.15
    bombFrequencyMultiplier: 1.4, // Increased from 1.2
    waveIntervalMultiplier: 0.85, // Slightly shorter gaps
    waveSizeMultiplier: 1.15,     // Slightly larger waves
    rowCountMultiplier: 1.2,     // Increased from 1.05
    levelScalingMultiplier: 1.2, // Increased from 1.15
    pointsMultiplier: 1.3,       // Increased from 1.2
    maxSimultaneousWaves: 3,
  },
  [DifficultyPreset.EXTREME]: {
    speedMultiplier: 1.35,
    bombFrequencyMultiplier: 1.5,
    waveIntervalMultiplier: 0.75,
    waveSizeMultiplier: 1.25,
    rowCountMultiplier: 1.15,
    levelScalingMultiplier: 1.35,
    pointsMultiplier: 1.5,
    maxSimultaneousWaves: 4,
  },
};
