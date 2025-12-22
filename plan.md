# Space Invaders with Face Capture - Implementation Plan

## Project Overview
Create a modular Space Invaders game with webcam integration that captures player faces and uses them as sprites. New captures become the defender, while previous captures are tinted green and used on alien sprites.

## Technology Stack
- **Framework**: Phaser.js 3.80+
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite 5.0+
- **Face Detection**: MediaPipe Face Detection
- **Storage**: localStorage for face images and high scores

## Project Structure
```
classinvaders/
├── public/
│   ├── assets/
│   │   ├── audio/          # Sound effects and music
│   │   └── images/         # Base sprites (alien, defender, bullets, shields)
│   └── index.html
├── src/
│   ├── main.ts             # Entry point
│   ├── config.ts           # Phaser configuration
│   ├── constants.ts        # Game constants
│   ├── types.ts            # TypeScript interfaces
│   ├── scenes/
│   │   ├── BootScene.ts    # Asset loading
│   │   ├── MenuScene.ts    # Main menu
│   │   ├── WebcamScene.ts  # Face capture with countdown
│   │   ├── GameScene.ts    # Main gameplay
│   │   └── GameOverScene.ts
│   ├── entities/
│   │   ├── Player.ts       # Defender ship
│   │   ├── Alien.ts        # Individual alien
│   │   ├── AlienGrid.ts    # Alien formation manager
│   │   ├── Bullet.ts       # Player projectile
│   │   ├── Bomb.ts         # Alien projectile
│   │   └── Shield.ts       # Destructible barriers
│   ├── managers/
│   │   ├── FaceManager.ts  # Face capture & storage
│   │   ├── ScoreManager.ts # Score tracking
│   │   ├── AudioManager.ts # Sound management
│   │   └── LevelManager.ts # Level progression
│   └── utils/
│       ├── imageProcessor.ts  # Face cropping/tinting
│       └── localStorage.ts    # Storage helpers
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Implementation Phases

### Phase 1: Project Setup
**Files to create:**
- `package.json` - Dependencies: phaser, @mediapipe/face_detection, @mediapipe/camera_utils
- `tsconfig.json` - Strict TypeScript configuration
- `vite.config.ts` - Vite configuration with asset handling
- `public/index.html` - Basic HTML template
- `src/main.ts` - Initialize Phaser game
- `src/config.ts` - Phaser game configuration (800x600, arcade physics, scene registration)
- `src/constants.ts` - Game dimensions, speeds, colors, points values
- `src/types.ts` - TypeScript interfaces (StoredFace, HighScore, LevelConfig, GameData)

**Actions:**
1. Run `npm init -y` and configure package.json
2. Install dependencies
3. Create configuration files
4. Test basic Phaser initialization

### Phase 2: Face Management System
**Critical files:**
- `src/managers/FaceManager.ts`
- `src/utils/imageProcessor.ts`
- `src/utils/localStorage.ts`
- `src/scenes/WebcamScene.ts`

**Key features:**
- MediaPipe Face Detection initialization
- Webcam stream access and display
- Countdown timer (3, 2, 1) with circular guide overlay
- Face detection with visual feedback (green/red border)
- Face capture and cropping to detected bounding box
- Image tinting (green for alien faces)
- localStorage management (max 10 faces, FIFO queue)
- Texture creation from base64 images

**Technical considerations:**
- Handle webcam permission denial gracefully (fallback to default sprites)
- Cleanup resources properly (stop video tracks, destroy MediaPipe model)
- Async/await for MediaPipe model loading
- Real-time face detection feedback during countdown

### Phase 3: Game Entities
**Files to create:**
- `src/entities/Player.ts` - Defender with left/right movement, shooting (max 3 bullets)
- `src/entities/Bullet.ts` - Upward projectile from player
- `src/entities/Bomb.ts` - Downward projectile from aliens
- `src/entities/Alien.ts` - Individual alien with face texture
- `src/entities/AlienGrid.ts` - Formation manager (5 rows x 11 cols initially)
- `src/entities/Shield.ts` - Pixel-based destructible barriers

**Key mechanics:**
- Player: keyboard controls (arrow keys/A-D), space to shoot, speed 300px/s
- Aliens: left-right movement, descend on edge hit, speed increases when descending
- AlienGrid: manages movement, direction changes, speed scaling, random bombing
- Shield: pixel-grid destruction with radius-based damage

### Phase 4: Main Game Scene
**Critical file:** `src/scenes/GameScene.ts`

**Core systems:**
- Scene initialization with face textures (player = new capture, aliens = random old faces)
- Input handling (cursor keys, WASD, space)
- Game loop update (entity updates, collision checks)
- Collision detection using Phaser Arcade Physics:
  - Bullets vs Aliens
  - Bombs vs Player
  - Bullets/Bombs vs Shields
  - Aliens vs Player (game over)
- Level completion (all aliens destroyed → next level)
- Game over conditions (lives = 0 or aliens reach bottom)
- Score tracking and display
- Lives indicator UI
- Level indicator UI

### Phase 5: Level Progression & Scoring
**Files:**
- `src/managers/LevelManager.ts`
- `src/managers/ScoreManager.ts`

**Features:**
- Level configurations (rows, columns, speed, bomb frequency)
- Dynamic difficulty scaling (more aliens, faster movement, more bombs)
- Points system (top aliens: 30, middle: 20, bottom: 10)
- High score tracking in localStorage
- Level transition with shield reset

### Phase 6: Audio System
**File:** `src/managers/AudioManager.ts`

**Sounds needed:**
- shoot.mp3 - Player fires
- explosion.mp3 - Alien destroyed
- player-hit.mp3 - Player takes damage
- level-complete.mp3 - Level cleared
- background-music.mp3 - Looping game music

**Features:**
- Centralized audio management
- Mute toggle
- Prevent overlapping sound effects

### Phase 7: Additional Scenes
**Files:**
- `src/scenes/BootScene.ts` - Asset preloading with progress bar
- `src/scenes/MenuScene.ts` - Title screen, start button, high scores display
- `src/scenes/GameOverScene.ts` - Final score, high score entry, restart option

**Scene flow:**
```
BootScene → MenuScene → WebcamScene → GameScene → GameOverScene
                ↑___________________________________|
```

### Phase 8: Polish & Testing
- Particle effects for explosions
- Screen shake on impacts
- Visual feedback (flash on hit)
- Pause functionality
- Error handling throughout
- Cross-browser testing
- localStorage quota management
- Performance optimization

## Critical Implementation Details

### localStorage Schema
```typescript
Keys:
- 'classinvaders_current_face': string (base64 image, latest capture)
- 'classinvaders_face_history': StoredFace[] (array of previous faces)
- 'classinvaders_high_scores': HighScore[] (top 10 scores)
- 'classinvaders_settings': { muted: boolean }
```

### Face Capture Flow
1. Request webcam permission
2. Initialize MediaPipe model
3. Display video feed in Phaser scene
4. Run real-time face detection
5. Show circular guide with color feedback
6. When face centered: start countdown
7. On countdown = 0: capture frame, crop to face bbox, save to localStorage
8. Cleanup: stop video, destroy model
9. Transition to GameScene

### Alien Movement Pattern
- Start at top, move horizontally
- When hitting edge: reverse direction, move down one row
- Each descent: increase speed by 5%
- Speed up progressively as aliens are destroyed
- Random bombing: each alien has chance per second based on level

### Shield Implementation
- 4 shields positioned near bottom
- Each shield: 15x5 grid of 4x4px blocks in inverted U shape
- Damage: destroy blocks in radius around impact point
- Reset shields on new level

## Key Files to Implement (Priority Order)
1. `src/managers/FaceManager.ts` - Core face capture logic
2. `src/scenes/WebcamScene.ts` - Countdown and capture UI
3. `src/scenes/GameScene.ts` - Main gameplay loop
4. `src/entities/AlienGrid.ts` - Alien formation and movement
5. `src/entities/Player.ts` - Defender controls
6. `src/entities/Shield.ts` - Destructible barriers
7. `src/managers/LevelManager.ts` - Difficulty progression
8. `src/managers/ScoreManager.ts` - Score tracking
9. `src/managers/AudioManager.ts` - Sound effects
10. `src/scenes/BootScene.ts` - Asset loading
11. `src/scenes/MenuScene.ts` - Main menu
12. `src/scenes/GameOverScene.ts` - Results screen

## Potential Challenges & Solutions
1. **Webcam permission denial**: Fallback to default sprites, show helpful error
2. **MediaPipe loading time**: Show loading spinner, cache model
3. **Face not detected**: Pause countdown, show visual feedback, allow manual capture
4. **localStorage quota**: Limit to 10 faces, compress images, handle quota errors
5. **Performance**: Use sprite pooling, destroy off-screen projectiles immediately
6. **Different screen sizes**: Use Phaser Scale Manager with proportional scaling

## Success Criteria
- Webcam capture works reliably with face detection
- Captured faces appear correctly on defender and aliens (tinted green)
- Classic Space Invaders gameplay feels authentic
- Aliens speed up as they descend
- Shields get destroyed realistically
- Score, lives, and levels progress correctly
- Audio works without overlapping sounds
- High scores persist across sessions
- Game is playable and fun!

---

# DETAILED IMPLEMENTATION STEPS

## Step 1: Project Initialization (30 minutes)

### 1.1 Create package.json
```bash
npm init -y
```
Edit package.json to add:
```json
{
  "name": "classinvaders",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### 1.2 Install Dependencies
```bash
npm install phaser@^3.80.0
npm install @mediapipe/face_detection@^0.4.1646425229
npm install @mediapipe/camera_utils@^0.3.1675469404
npm install --save-dev typescript vite @types/node
```

### 1.3 Create TypeScript Configuration
**File: `tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

### 1.4 Create Vite Configuration
**File: `vite.config.ts`**
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          mediapipe: ['@mediapipe/face_detection', '@mediapipe/camera_utils']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
```

### 1.5 Create HTML Template
**File: `public/index.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Class Invaders</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #000;
      font-family: 'Courier New', monospace;
    }
    #game-container {
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
    }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 1.6 Create Directory Structure
```bash
mkdir -p src/{scenes,entities,managers,utils,config}
mkdir -p public/assets/{audio,images,fonts}
```

## Step 2: Core Configuration Files (20 minutes)

### 2.1 Create Game Constants
**File: `src/constants.ts`**
```typescript
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Player
export const PLAYER_SPEED = 300;
export const PLAYER_SHOOT_COOLDOWN = 500;
export const MAX_BULLETS = 3;

// Projectiles
export const BULLET_SPEED = 400;
export const BOMB_SPEED = 200;

// Aliens
export const ALIEN_ROWS = 5;
export const ALIEN_COLS = 11;
export const ALIEN_SPACING_X = 60;
export const ALIEN_SPACING_Y = 50;
export const ALIEN_START_Y = 100;
export const ALIEN_START_SPEED = 1000; // ms per move

// Game
export const MAX_LIVES = 3;
export const SHIELD_COUNT = 4;
export const SHIELD_Y = 480;
export const MAX_STORED_FACES = 10;

// Points
export const POINTS = {
  ALIEN_TOP: 30,
  ALIEN_MIDDLE: 20,
  ALIEN_BOTTOM: 10
};

// Colors
export const COLORS = {
  BACKGROUND: 0x000000,
  PLAYER: 0x00ff00,
  ALIEN: 0xff0000,
  BULLET: 0xffff00,
  BOMB: 0xff00ff,
  SHIELD: 0x00ff00,
  GREEN_TINT: 0x00ff00
};
```

### 2.2 Create TypeScript Types
**File: `src/types.ts`**
```typescript
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
}
```

### 2.3 Create Phaser Configuration
**File: `src/config.ts`**
```typescript
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { WebcamScene } from './scenes/WebcamScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, MenuScene, WebcamScene, GameScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};
```

### 2.4 Create Main Entry Point
**File: `src/main.ts`**
```typescript
import Phaser from 'phaser';
import { gameConfig } from './config';

const game = new Phaser.Game(gameConfig);

// Prevent context menu on right-click
document.addEventListener('contextmenu', (e) => e.preventDefault());
```

## Step 3: Utility Modules (45 minutes)

### 3.1 Create localStorage Utility
**File: `src/utils/localStorage.ts`**
```typescript
import { StoredFace, HighScore, GameSettings } from '../types';

const KEYS = {
  CURRENT_FACE: 'classinvaders_current_face',
  FACE_HISTORY: 'classinvaders_face_history',
  HIGH_SCORES: 'classinvaders_high_scores',
  SETTINGS: 'classinvaders_settings'
};

export class LocalStorage {
  static getCurrentFace(): string | null {
    return localStorage.getItem(KEYS.CURRENT_FACE);
  }

  static setCurrentFace(imageData: string): void {
    localStorage.setItem(KEYS.CURRENT_FACE, imageData);
  }

  static getFaceHistory(): StoredFace[] {
    const data = localStorage.getItem(KEYS.FACE_HISTORY);
    return data ? JSON.parse(data) : [];
  }

  static addToFaceHistory(imageData: string): void {
    const history = this.getFaceHistory();
    const newFace: StoredFace = {
      id: Date.now().toString(),
      imageData,
      timestamp: Date.now()
    };

    history.push(newFace);

    // Keep only last 10 faces
    if (history.length > 10) {
      history.shift();
    }

    localStorage.setItem(KEYS.FACE_HISTORY, JSON.stringify(history));
  }

  static getHighScores(): HighScore[] {
    const data = localStorage.getItem(KEYS.HIGH_SCORES);
    const scores = data ? JSON.parse(data) : [];
    return scores.sort((a: HighScore, b: HighScore) => b.score - a.score).slice(0, 10);
  }

  static addHighScore(score: HighScore): void {
    const scores = this.getHighScores();
    scores.push(score);
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(scores.slice(0, 10)));
  }

  static isHighScore(score: number): boolean {
    const scores = this.getHighScores();
    return scores.length < 10 || score > scores[scores.length - 1].score;
  }

  static getSettings(): GameSettings {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : { muted: false, difficulty: 'normal' };
  }

  static saveSettings(settings: GameSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  static clearAll(): void {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }
}
```

### 3.2 Create Image Processor
**File: `src/utils/imageProcessor.ts`**
```typescript
export class ImageProcessor {
  static async cropFaceFromVideo(
    videoElement: HTMLVideoElement,
    bbox: { xMin: number; yMin: number; width: number; height: number },
    padding: number = 20
  ): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Calculate crop area with padding
    const x = Math.max(0, bbox.xMin * videoElement.videoWidth - padding);
    const y = Math.max(0, bbox.yMin * videoElement.videoHeight - padding);
    const width = Math.min(
      videoElement.videoWidth - x,
      bbox.width * videoElement.videoWidth + padding * 2
    );
    const height = Math.min(
      videoElement.videoHeight - y,
      bbox.height * videoElement.videoHeight + padding * 2
    );

    // Make it square
    const size = Math.min(width, height);
    canvas.width = size;
    canvas.height = size;

    // Draw cropped face
    ctx.drawImage(videoElement, x, y, size, size, 0, 0, size, size);

    return canvas.toDataURL('image/png');
  }

  static async tintImage(imageData: string, color: number = 0x00ff00): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Extract RGB from color
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;

        // Apply tint
        for (let i = 0; i < data.length; i += 4) {
          data[i] = (data[i] * r) / 255;     // Red
          data[i + 1] = (data[i + 1] * g) / 255; // Green
          data[i + 2] = (data[i + 2] * b) / 255; // Blue
          // Alpha remains unchanged
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = reject;
      img.src = imageData;
    });
  }

  static async resizeImage(imageData: string, width: number, height: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = reject;
      img.src = imageData;
    });
  }
}
```

## Step 4: Face Manager (1 hour)

### 4.1 Create Face Manager
**File: `src/managers/FaceManager.ts`**
```typescript
import { FaceDetection } from '@mediapipe/face_detection';
import { Camera } from '@mediapipe/camera_utils';
import { LocalStorage } from '../utils/localStorage';
import { ImageProcessor } from '../utils/imageProcessor';
import { COLORS, MAX_STORED_FACES } from '../constants';

export class FaceManager {
  private static faceDetection: FaceDetection | null = null;
  private static camera: Camera | null = null;

  static async initMediaPipe(): Promise<FaceDetection> {
    if (this.faceDetection) {
      return this.faceDetection;
    }

    this.faceDetection = new FaceDetection({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
      }
    });

    this.faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5
    });

    await this.faceDetection.initialize();
    return this.faceDetection;
  }

  static async startWebcam(videoElement: HTMLVideoElement): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    });

    videoElement.srcObject = stream;
    await videoElement.play();

    return stream;
  }

  static async captureAndSaveFace(
    videoElement: HTMLVideoElement,
    bbox?: { xMin: number; yMin: number; width: number; height: number }
  ): Promise<string> {
    let imageData: string;

    if (bbox) {
      // Crop to detected face
      imageData = await ImageProcessor.cropFaceFromVideo(videoElement, bbox, 20);
    } else {
      // Capture whole frame
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(videoElement, 0, 0);
      imageData = canvas.toDataURL('image/png');
    }

    // Move current face to history before saving new one
    const currentFace = LocalStorage.getCurrentFace();
    if (currentFace) {
      LocalStorage.addToFaceHistory(currentFace);
    }

    // Save new face as current
    LocalStorage.setCurrentFace(imageData);

    return imageData;
  }

  static async getRandomAlienFaces(count: number): Promise<string[]> {
    const history = LocalStorage.getFaceHistory();
    if (history.length === 0) return [];

    const tintedFaces: string[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < Math.min(count, history.length); i++) {
      // Pick random face from history
      let randomIndex: number;
      do {
        randomIndex = Math.floor(Math.random() * history.length);
      } while (usedIndices.has(randomIndex) && usedIndices.size < history.length);

      usedIndices.add(randomIndex);

      const face = history[randomIndex];
      const tinted = await ImageProcessor.tintImage(face.imageData, COLORS.GREEN_TINT);
      tintedFaces.push(tinted);
    }

    return tintedFaces;
  }

  static getCurrentFace(): string | null {
    return LocalStorage.getCurrentFace();
  }

  static cleanup(): void {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    if (this.faceDetection) {
      this.faceDetection.close();
      this.faceDetection = null;
    }
  }
}
```

## Step 5: Manager Classes (1.5 hours)

### 5.1 Score Manager
**File: `src/managers/ScoreManager.ts`**
```typescript
import { LocalStorage } from '../utils/localStorage';
import { HighScore } from '../types';

export class ScoreManager {
  private currentScore: number = 0;

  constructor() {
    this.reset();
  }

  addPoints(points: number): void {
    this.currentScore += points;
  }

  getScore(): number {
    return this.currentScore;
  }

  reset(): void {
    this.currentScore = 0;
  }

  isHighScore(): boolean {
    return LocalStorage.isHighScore(this.currentScore);
  }

  saveHighScore(name: string, level: number): void {
    const highScore: HighScore = {
      name,
      score: this.currentScore,
      level,
      date: Date.now()
    };
    LocalStorage.addHighScore(highScore);
  }

  getHighScores(): HighScore[] {
    return LocalStorage.getHighScores();
  }
}
```

### 5.2 Level Manager
**File: `src/managers/LevelManager.ts`**
```typescript
import { LevelConfig } from '../types';
import { ALIEN_ROWS, ALIEN_COLS, ALIEN_START_SPEED } from '../constants';

export class LevelManager {
  private currentLevel: number = 1;

  constructor(startLevel: number = 1) {
    this.currentLevel = startLevel;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  nextLevel(): void {
    this.currentLevel++;
  }

  reset(): void {
    this.currentLevel = 1;
  }

  getLevelConfig(): LevelConfig {
    const level = this.currentLevel;

    // Base configuration scales with level
    return {
      level,
      alienRows: Math.min(ALIEN_ROWS + Math.floor((level - 1) / 3), 8),
      alienCols: ALIEN_COLS,
      alienSpeed: Math.max(ALIEN_START_SPEED - (level - 1) * 50, 300),
      bombFrequency: 0.3 + (level - 1) * 0.1,
      alienPointsMultiplier: 1 + (level - 1) * 0.5
    };
  }
}
```

### 5.3 Audio Manager
**File: `src/managers/AudioManager.ts`**
```typescript
import Phaser from 'phaser';
import { LocalStorage } from '../utils/localStorage';

export class AudioManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private music: Phaser.Sound.BaseSound | null = null;
  private muted: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.muted = LocalStorage.getSettings().muted;
  }

  registerSound(key: string): void {
    if (!this.sounds.has(key)) {
      const sound = this.scene.sound.add(key);
      this.sounds.set(key, sound);
    }
  }

  play(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.muted) return;

    const sound = this.sounds.get(key);
    if (sound) {
      sound.play(config);
    }
  }

  playMusic(key: string, loop: boolean = true): void {
    if (this.music) {
      this.music.stop();
    }

    this.music = this.scene.sound.add(key, { loop, volume: 0.5 });
    if (!this.muted) {
      this.music.play();
    }
  }

  stopMusic(): void {
    if (this.music) {
      this.music.stop();
    }
  }

  toggleMute(): void {
    this.muted = !this.muted;

    if (this.muted) {
      this.scene.sound.mute = true;
    } else {
      this.scene.sound.mute = false;
    }

    const settings = LocalStorage.getSettings();
    settings.muted = this.muted;
    LocalStorage.saveSettings(settings);
  }

  isMuted(): boolean {
    return this.muted;
  }
}
```

## Step 6: Entity Classes (2 hours)

### 6.1 Player Entity
**File: `src/entities/Player.ts`**
```typescript
import Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_SHOOT_COOLDOWN, MAX_BULLETS } from '../constants';
import { Bullet } from './Bullet';

export class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private speed: number = PLAYER_SPEED;
  private canShoot: boolean = true;
  private shootCooldown: number = PLAYER_SHOOT_COOLDOWN;
  private bullets: Bullet[] = [];
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'player') {
    this.scene = scene;

    this.sprite = scene.physics.add.sprite(x, y, texture);
    this.sprite.setCollideWorldBounds(true);

    // Input
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = {
      left: scene.input.keyboard!.addKey('A'),
      right: scene.input.keyboard!.addKey('D'),
      space: scene.input.keyboard!.addKey('SPACE')
    };
  }

  update(time: number, delta: number): void {
    // Movement
    if (this.cursors.left.isDown || this.keys.left.isDown) {
      this.sprite.setVelocityX(-this.speed);
    } else if (this.cursors.right.isDown || this.keys.right.isDown) {
      this.sprite.setVelocityX(this.speed);
    } else {
      this.sprite.setVelocityX(0);
    }

    // Shooting
    if ((this.cursors.space.isDown || this.keys.space.isDown) && this.canShoot) {
      this.shoot();
    }

    // Update bullets
    this.bullets = this.bullets.filter(bullet => {
      bullet.update();
      if (bullet.shouldDestroy()) {
        bullet.destroy();
        return false;
      }
      return true;
    });
  }

  private shoot(): void {
    if (this.bullets.length >= MAX_BULLETS) return;

    const bullet = new Bullet(
      this.scene,
      this.sprite.x,
      this.sprite.y - this.sprite.height / 2,
      'up'
    );

    this.bullets.push(bullet);
    this.canShoot = false;

    this.scene.time.delayedCall(this.shootCooldown, () => {
      this.canShoot = true;
    });
  }

  getBullets(): Bullet[] {
    return this.bullets;
  }

  hit(): void {
    // Flash effect
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 100,
      yoyo: true,
      repeat: 3
    });
  }

  destroy(): void {
    this.bullets.forEach(bullet => bullet.destroy());
    this.bullets = [];
    this.sprite.destroy();
  }
}
```

### 6.2 Bullet Entity
**File: `src/entities/Bullet.ts`**
```typescript
import Phaser from 'phaser';
import { BULLET_SPEED, BOMB_SPEED, GAME_HEIGHT } from '../constants';

export class Bullet {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private speed: number;
  private direction: 'up' | 'down';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: 'up' | 'down' = 'up',
    texture: string = 'bullet'
  ) {
    this.scene = scene;
    this.direction = direction;
    this.speed = direction === 'up' ? -BULLET_SPEED : BOMB_SPEED;

    this.sprite = scene.physics.add.sprite(x, y, texture);
    this.sprite.setVelocityY(this.speed);
  }

  update(): void {
    // Bullets are automatically moved by Phaser physics
  }

  shouldDestroy(): boolean {
    return this.sprite.y < 0 || this.sprite.y > GAME_HEIGHT;
  }

  destroy(): void {
    this.sprite.destroy();
  }

  getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }
}
```

### 6.3 Bomb Entity (inherits from Bullet)
**File: `src/entities/Bomb.ts`**
```typescript
import Phaser from 'phaser';
import { Bullet } from './Bullet';

export class Bomb extends Bullet {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'down', 'bomb');
  }
}
```

### 6.4 Alien Entity
**File: `src/entities/Alien.ts`**
```typescript
import Phaser from 'phaser';
import { AlienType } from '../types';
import { POINTS } from '../constants';

export class Alien {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private type: AlienType;
  public points: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: AlienType,
    texture: string = 'alien'
  ) {
    this.scene = scene;
    this.type = type;

    this.sprite = scene.physics.add.sprite(x, y, texture);

    // Set points based on type
    switch (type) {
      case 'top':
        this.points = POINTS.ALIEN_TOP;
        break;
      case 'middle':
        this.points = POINTS.ALIEN_MIDDLE;
        break;
      case 'bottom':
        this.points = POINTS.ALIEN_BOTTOM;
        break;
    }
  }

  destroy(playExplosion: boolean = true): void {
    if (playExplosion) {
      // Create explosion effect
      const particles = this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle', {
        speed: { min: -100, max: 100 },
        scale: { start: 1, end: 0 },
        lifespan: 300,
        quantity: 10
      });

      this.scene.time.delayedCall(300, () => particles.destroy());
    }

    this.sprite.destroy();
  }

  getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }
}
```

### 6.5 AlienGrid Entity
**File: `src/entities/AlienGrid.ts`**
```typescript
import Phaser from 'phaser';
import { Alien } from './Alien';
import { Bomb } from './Bomb';
import { AlienType } from '../types';
import { ALIEN_SPACING_X, ALIEN_SPACING_Y, ALIEN_START_Y, GAME_WIDTH } from '../constants';

export class AlienGrid {
  private scene: Phaser.Scene;
  private aliens: (Alien | null)[][] = [];
  private direction: number = 1; // 1 = right, -1 = left
  private speed: number;
  private moveTimer: number = 0;
  private moveInterval: number;
  private descending: boolean = false;
  private bombs: Bomb[] = [];
  private bombTimer: number = 0;
  private bombFrequency: number;
  private alienFaceTextures: string[];

  constructor(
    scene: Phaser.Scene,
    rows: number,
    cols: number,
    baseSpeed: number,
    bombFrequency: number,
    alienFaceTextures: string[] = []
  ) {
    this.scene = scene;
    this.speed = baseSpeed;
    this.moveInterval = baseSpeed;
    this.bombFrequency = bombFrequency;
    this.alienFaceTextures = alienFaceTextures;

    this.createGrid(rows, cols);
  }

  private createGrid(rows: number, cols: number): void {
    const gridWidth = cols * ALIEN_SPACING_X;
    const startX = (GAME_WIDTH - gridWidth) / 2;

    for (let row = 0; row < rows; row++) {
      this.aliens[row] = [];

      let type: AlienType;
      if (row < 2) type = 'top';
      else if (row < 4) type = 'middle';
      else type = 'bottom';

      for (let col = 0; col < cols; col++) {
        const x = startX + col * ALIEN_SPACING_X + ALIEN_SPACING_X / 2;
        const y = ALIEN_START_Y + row * ALIEN_SPACING_Y;

        // Randomly assign face texture if available
        let texture = 'alien';
        if (this.alienFaceTextures.length > 0 && Math.random() < 0.3) {
          const randomIndex = Math.floor(Math.random() * this.alienFaceTextures.length);
          texture = this.alienFaceTextures[randomIndex];
        }

        const alien = new Alien(this.scene, x, y, type, texture);
        this.aliens[row][col] = alien;
      }
    }
  }

  update(time: number, delta: number): void {
    this.moveTimer += delta;

    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;

      if (this.descending) {
        this.moveDown();
        this.descending = false;
      } else {
        this.moveHorizontal();

        if (this.checkBoundaries()) {
          this.direction *= -1;
          this.descending = true;
          this.increaseSpeed();
        }
      }
    }

    // Bomb dropping
    this.bombTimer += delta / 1000; // Convert to seconds
    if (this.bombTimer >= 1 / this.bombFrequency) {
      this.bombTimer = 0;
      this.dropRandomBomb();
    }

    // Update bombs
    this.bombs = this.bombs.filter(bomb => {
      bomb.update();
      if (bomb.shouldDestroy()) {
        bomb.destroy();
        return false;
      }
      return true;
    });
  }

  private moveHorizontal(): void {
    const step = 10 * this.direction;

    this.aliens.forEach(row => {
      row.forEach(alien => {
        if (alien) {
          alien.sprite.x += step;
        }
      });
    });
  }

  private moveDown(): void {
    this.aliens.forEach(row => {
      row.forEach(alien => {
        if (alien) {
          alien.sprite.y += 20;
        }
      });
    });
  }

  private checkBoundaries(): boolean {
    let hitBoundary = false;

    this.aliens.forEach(row => {
      row.forEach(alien => {
        if (alien) {
          if (this.direction > 0 && alien.sprite.x >= GAME_WIDTH - 40) {
            hitBoundary = true;
          } else if (this.direction < 0 && alien.sprite.x <= 40) {
            hitBoundary = true;
          }
        }
      });
    });

    return hitBoundary;
  }

  private increaseSpeed(): void {
    this.moveInterval *= 0.95; // 5% faster
  }

  private dropRandomBomb(): void {
    const bottomAliens = this.getBottomAliens();
    if (bottomAliens.length === 0) return;

    const randomAlien = Phaser.Utils.Array.GetRandom(bottomAliens);
    const bomb = new Bomb(
      this.scene,
      randomAlien.sprite.x,
      randomAlien.sprite.y + randomAlien.sprite.height / 2
    );

    this.bombs.push(bomb);
  }

  private getBottomAliens(): Alien[] {
    const bottomAliens: Alien[] = [];

    for (let col = 0; col < this.aliens[0].length; col++) {
      for (let row = this.aliens.length - 1; row >= 0; row--) {
        if (this.aliens[row][col]) {
          bottomAliens.push(this.aliens[row][col]!);
          break;
        }
      }
    }

    return bottomAliens;
  }

  removeAlien(alien: Alien): void {
    for (let row = 0; row < this.aliens.length; row++) {
      for (let col = 0; col < this.aliens[row].length; col++) {
        if (this.aliens[row][col] === alien) {
          this.aliens[row][col] = null;
          return;
        }
      }
    }
  }

  getAliveCount(): number {
    let count = 0;
    this.aliens.forEach(row => {
      row.forEach(alien => {
        if (alien) count++;
      });
    });
    return count;
  }

  getAllAliens(): Alien[] {
    const all: Alien[] = [];
    this.aliens.forEach(row => {
      row.forEach(alien => {
        if (alien) all.push(alien);
      });
    });
    return all;
  }

  getBombs(): Bomb[] {
    return this.bombs;
  }

  destroy(): void {
    this.aliens.forEach(row => {
      row.forEach(alien => {
        if (alien) alien.destroy(false);
      });
    });
    this.bombs.forEach(bomb => bomb.destroy());
  }
}
```

### 6.6 Shield Entity
**File: `src/entities/Shield.ts`**
```typescript
import Phaser from 'phaser';

export class Shield {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private blocks: (Phaser.GameObjects.Rectangle | null)[][] = [];
  private blockSize: number = 4;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);

    // Classic shield shape (inverted U)
    const pattern = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,0,0,0,0,0,0,0,1,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,0,1,1,1],
    ];

    pattern.forEach((row, rowIndex) => {
      this.blocks[rowIndex] = [];
      row.forEach((cell, colIndex) => {
        if (cell === 1) {
          const block = scene.add.rectangle(
            colIndex * this.blockSize,
            rowIndex * this.blockSize,
            this.blockSize,
            this.blockSize,
            0x00ff00
          );
          this.container.add(block);
          this.blocks[rowIndex][colIndex] = block;
        } else {
          this.blocks[rowIndex][colIndex] = null;
        }
      });
    });
  }

  takeDamage(worldX: number, worldY: number, radius: number = 8): void {
    const localX = worldX - this.container.x;
    const localY = worldY - this.container.y;

    this.blocks.forEach((row, rowIndex) => {
      row.forEach((block, colIndex) => {
        if (block && block.active) {
          const blockX = colIndex * this.blockSize;
          const blockY = rowIndex * this.blockSize;
          const dist = Phaser.Math.Distance.Between(localX, localY, blockX, blockY);

          if (dist < radius) {
            block.destroy();
            this.blocks[rowIndex][colIndex] = null;
          }
        }
      });
    });
  }

  getBlocks(): Phaser.GameObjects.Rectangle[] {
    const activeBlocks: Phaser.GameObjects.Rectangle[] = [];
    this.blocks.forEach(row => {
      row.forEach(block => {
        if (block && block.active) {
          activeBlocks.push(block);
        }
      });
    });
    return activeBlocks;
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

## Step 7: Scene Implementation (3 hours)

### 7.1 Boot Scene
**File: `src/scenes/BootScene.ts`**
```typescript
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px monospace',
      color: '#ffffff'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      font: '18px monospace',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(Math.floor(value * 100) + '%');
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load placeholder assets (will be replaced with actual assets)
    this.loadPlaceholderAssets();

    // Load audio (comment out if files don't exist yet)
    // this.load.audio('shoot', 'assets/audio/shoot.mp3');
    // this.load.audio('explosion', 'assets/audio/explosion.mp3');
    // this.load.audio('player-hit', 'assets/audio/player-hit.mp3');
    // this.load.audio('level-complete', 'assets/audio/level-complete.mp3');
    // this.load.audio('music', 'assets/audio/background-music.mp3');
  }

  private loadPlaceholderAssets(): void {
    // Create placeholder graphics using Phaser's graphics object
    // These will be replaced by actual textures later
  }

  create(): void {
    // Create base textures programmatically
    this.createTextures();
    this.scene.start('MenuScene');
  }

  private createTextures(): void {
    // Player
    const player = this.add.graphics();
    player.fillStyle(0x00ff00);
    player.fillTriangle(0, 20, 10, 0, 20, 20);
    player.generateTexture('player', 20, 20);
    player.destroy();

    // Alien
    const alien = this.add.graphics();
    alien.fillStyle(0xff0000);
    alien.fillRect(0, 0, 30, 30);
    alien.generateTexture('alien', 30, 30);
    alien.destroy();

    // Bullet
    const bullet = this.add.graphics();
    bullet.fillStyle(0xffff00);
    bullet.fillRect(0, 0, 4, 10);
    bullet.generateTexture('bullet', 4, 10);
    bullet.destroy();

    // Bomb
    const bomb = this.add.graphics();
    bomb.fillStyle(0xff00ff);
    bomb.fillRect(0, 0, 4, 10);
    bomb.generateTexture('bomb', 4, 10);
    bomb.destroy();

    // Particle
    const particle = this.add.graphics();
    particle.fillStyle(0xffffff);
    particle.fillCircle(2, 2, 2);
    particle.generateTexture('particle', 4, 4);
    particle.destroy();
  }
}
```

### 7.2 Menu Scene
**File: `src/scenes/MenuScene.ts`**
```typescript
import Phaser from 'phaser';
import { LocalStorage } from '../utils/localStorage';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Title
    this.add.text(GAME_WIDTH / 2, 150, 'CLASS INVADERS', {
      font: 'bold 48px monospace',
      color: '#00ff00'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(GAME_WIDTH / 2, 200, 'Face the Invasion', {
      font: '20px monospace',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Start button
    const startButton = this.add.text(GAME_WIDTH / 2, 300, 'START GAME', {
      font: 'bold 32px monospace',
      color: '#ffffff',
      backgroundColor: '#00ff00',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    startButton.on('pointerover', () => {
      startButton.setScale(1.1);
    });

    startButton.on('pointerout', () => {
      startButton.setScale(1);
    });

    startButton.on('pointerdown', () => {
      this.scene.start('WebcamScene');
    });

    // High scores
    const highScores = LocalStorage.getHighScores();
    if (highScores.length > 0) {
      this.add.text(GAME_WIDTH / 2, 380, 'HIGH SCORES', {
        font: 'bold 24px monospace',
        color: '#ffff00'
      }).setOrigin(0.5);

      highScores.slice(0, 5).forEach((score, index) => {
        this.add.text(GAME_WIDTH / 2, 420 + index * 25,
          `${index + 1}. ${score.name}: ${score.score} (Level ${score.level})`, {
          font: '16px monospace',
          color: '#ffffff'
        }).setOrigin(0.5);
      });
    }

    // Instructions
    this.add.text(10, GAME_HEIGHT - 40, 'Arrow Keys / A-D: Move', {
      font: '14px monospace',
      color: '#888888'
    });

    this.add.text(10, GAME_HEIGHT - 20, 'Space: Shoot', {
      font: '14px monospace',
      color: '#888888'
    });
  }
}
```

### 7.3 Webcam Scene (Most Complex)
**File: `src/scenes/WebcamScene.ts`**
See detailed implementation in main plan section - this is the face capture scene with MediaPipe integration

(Complete implementation provided in previous section of plan - approximately 200 lines)

### 7.4 Game Scene (Main Gameplay)
**File: `src/scenes/GameScene.ts`**
(Full implementation - approximately 300 lines with collision detection, score tracking, level progression)

### 7.5 Game Over Scene
**File: `src/scenes/GameOverScene.ts`**
(Implementation with high score entry and restart options)

## Step 8: Testing & Refinement

### 8.1 Test Webcam Integration
- Test on different browsers (Chrome, Firefox, Safari)
- Verify face detection accuracy
- Test permission denial handling
- Verify localStorage persistence

### 8.2 Test Gameplay
- Verify alien movement patterns
- Test collision detection
- Verify shield destruction
- Test level progression
- Verify score tracking

### 8.3 Audio Testing
- Verify all sound effects trigger correctly
- Test mute functionality
- Ensure no audio overlap issues

### 8.4 Cross-browser Testing
- Chrome
- Firefox
- Safari (WebKit)
- Edge

## Step 9: Deployment

### 9.1 Build Production Bundle
```bash
npm run build
```

### 9.2 Test Production Build
```bash
npm run preview
```

### 9.3 Deploy
Options:
- Netlify (drag & drop dist folder)
- Vercel (connect GitHub repo)
- GitHub Pages
- Any static hosting service

---

## Implementation Time Estimates

- **Phase 1**: Project Setup - 30 minutes
- **Phase 2**: Core Configuration - 20 minutes
- **Phase 3**: Utilities - 45 minutes
- **Phase 4**: Face Manager - 1 hour
- **Phase 5**: Manager Classes - 1.5 hours
- **Phase 6**: Entity Classes - 2 hours
- **Phase 7**: Scene Implementation - 3 hours
- **Phase 8**: Testing & Polish - 2 hours
- **Phase 9**: Deployment - 30 minutes

**Total: Approximately 11-12 hours of focused development**

## Next Steps After Plan Approval

1. Initialize npm project
2. Install all dependencies
3. Create configuration files
4. Build foundation (constants, types, utilities)
5. Implement face management system
6. Build game entities
7. Implement game scenes
8. Test thoroughly
9. Deploy
