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
  faceImage?: string; // base64 image data for the player face at the time of the score
}

export interface LevelConfig {
  level: number;
  alienRows: number;
  alienCols: number;
  alienSpeed: number;
  bombFrequency: number;
  alienPointsMultiplier: number;

  // Galaga Mode (Game 2) - Optional parameters
  // TODO FOR CODING AGENT:
  // These parameters control Galaga-specific difficulty scaling
  galagaFormationSpeed?: number;  // Smooth side-to-side movement speed (pixels/sec)
  galagaWaveFrequency?: number;   // How often to launch waves (0-1, higher = more frequent)
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
