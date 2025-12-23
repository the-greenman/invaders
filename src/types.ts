export interface GameData {
  level: number;
  score: number;
  lives: number;
}

export interface StoredFace {
  id: string;
  imageData: string; // base64
  timestamp: number;
}

export interface HighScore {
  name: string;
  score: number;
  level: number;
  date: number;
}

export interface LevelConfig {
  level: number;
  alienRows: number;
  alienCols: number;
  alienSpeed: number;
  bombFrequency: number;
  alienPointsMultiplier: number;
}

export interface FaceDetectionResult {
  detected: boolean;
  boundingBox?: {
    xMin: number;
    yMin: number;
    width: number;
    height: number;
  };
  confidence?: number;
}

export type AlienType = 'top' | 'middle' | 'bottom';

export interface GameSettings {
  muted: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  controllerFireButton?: number; // index of gamepad button used for fire/start
  controllerBackButton?: number; // index of gamepad button used for back/escape
  controllerStartButton?: number; // index of gamepad button used for start on menus
}
