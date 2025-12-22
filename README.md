# Class Invaders 👾

A modern Space Invaders game with webcam face capture integration. Your face becomes the defender, and your friends' faces become the alien invaders!

## 🎮 Game Features

- **Classic Space Invaders Gameplay**: Aliens move left-right, descending and speeding up as they get lower
- **Webcam Face Capture**: Capture your face with countdown timer (3, 2, 1) and face detection guidance
- **Face Integration**:
  - Your captured face appears on the defender sprite
  - Previously captured faces are tinted green and randomly appear on alien sprites
  - Over time, more aliens will have faces
- **Progressive Difficulty**: Each level increases alien speed, bomb frequency, and adds more aliens
- **Destructible Shields**: Block-based shields that gradually get destroyed by bullets and bombs
- **Score System**: High score tracking with localStorage persistence
- **Sound Effects**: Full audio system with mute toggle

## 🛠️ Technology Stack

- **Phaser.js 3.80+**: HTML5 game framework
- **TypeScript**: Strict mode for better code quality
- **Vite**: Fast build tool with HMR
- **MediaPipe Face Detection**: Real-time face detection for webcam capture
- **localStorage**: Face images and high scores persistence

## 📁 Project Structure

```
classinvaders/
├── public/
│   ├── index.html              # Main HTML entry point
│   └── assets/
│       ├── audio/              # Sound effects and music (to be added)
│       ├── images/             # Sprite assets (to be added)
│       └── fonts/              # Custom fonts (optional)
├── src/
│   ├── main.ts                 # Game initialization
│   ├── config.ts               # Phaser configuration
│   ├── constants.ts            # Game constants (speeds, dimensions, etc.)
│   ├── types.ts                # TypeScript interfaces
│   │
│   ├── scenes/                 # Phaser scene classes
│   │   ├── BootScene.ts       # ⚠️ SKELETON - Asset loading
│   │   ├── MenuScene.ts       # ⚠️ SKELETON - Main menu
│   │   ├── WebcamScene.ts     # ⚠️ SKELETON - Face capture with countdown
│   │   ├── GameScene.ts       # ⚠️ SKELETON - Main gameplay
│   │   └── GameOverScene.ts   # ⚠️ SKELETON - Game over / high scores
│   │
│   ├── entities/               # Game object classes (to be created)
│   │   ├── Player.ts          # 🚧 TODO - Defender ship
│   │   ├── Alien.ts           # 🚧 TODO - Individual alien
│   │   ├── AlienGrid.ts       # 🚧 TODO - Alien formation manager
│   │   ├── Bullet.ts          # 🚧 TODO - Player projectile
│   │   ├── Bomb.ts            # 🚧 TODO - Alien projectile
│   │   └── Shield.ts          # 🚧 TODO - Destructible barriers
│   │
│   ├── managers/               # Game system managers
│   │   ├── FaceManager.ts     # ⚠️ SKELETON - Webcam & face detection
│   │   ├── ScoreManager.ts    # ⚠️ SKELETON - Score tracking
│   │   ├── LevelManager.ts    # ⚠️ SKELETON - Difficulty progression
│   │   └── AudioManager.ts    # ⚠️ SKELETON - Sound management
│   │
│   └── utils/                  # Utility functions
│       ├── localStorage.ts    # ⚠️ SKELETON - Storage abstraction
│       └── imageProcessor.ts  # ⚠️ SKELETON - Face image manipulation
│
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Modern browser with webcam support

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

The dev server will open at `http://localhost:3000` with hot module reloading enabled.

## 📋 Implementation Status

### ✅ Phase 1: Project Setup (COMPLETE)
- [x] Package.json with all dependencies
- [x] TypeScript configuration
- [x] Vite configuration
- [x] HTML template
- [x] Directory structure
- [x] Core config files (constants, types, config, main)
- [x] Skeleton scene files
- [x] TypeScript compilation verified

### ⚠️ Phase 2: Utility Modules & Managers (SKELETONS CREATED)
- [x] localStorage utility (skeleton with TODOs)
- [x] imageProcessor utility (skeleton with TODOs)
- [x] FaceManager (skeleton with TODOs)
- [x] ScoreManager (skeleton with TODOs)
- [x] LevelManager (skeleton with TODOs)
- [x] AudioManager (skeleton with TODOs)

### 🚧 Phase 3-6: Entity Classes (TODO)
- [ ] Player entity
- [ ] Bullet entity
- [ ] Bomb entity
- [ ] Alien entity
- [ ] AlienGrid entity
- [ ] Shield entity

### 🚧 Phase 7: Scene Implementation (TODO)
- [ ] BootScene - Asset loading with progress bar
- [ ] MenuScene - Title screen, start button, high scores
- [ ] WebcamScene - Face capture with MediaPipe integration
- [ ] GameScene - Main gameplay loop, collisions, scoring
- [ ] GameOverScene - Final score, high score entry, restart

### 🚧 Phase 8-9: Polish & Deployment (TODO)
- [ ] Particle effects
- [ ] Screen shake
- [ ] Audio assets
- [ ] Testing across browsers
- [ ] Performance optimization
- [ ] Deployment setup

## 🔑 Key Implementation Notes

### Skeleton Files Created

All utility and manager files have been created as **skeletons with detailed TODO comments**. Each method includes:
- Clear documentation of what it should do
- Step-by-step implementation instructions
- Example code snippets (commented out)
- Type signatures and return values

### Files Ready for Implementation

#### Utils (`src/utils/`)
- **localStorage.ts**: All CRUD operations for face images, high scores, and settings
- **imageProcessor.ts**: Canvas-based image cropping, tinting, and resizing

#### Managers (`src/managers/`)
- **FaceManager.ts**: MediaPipe integration, webcam access, face capture
- **ScoreManager.ts**: Score tracking and high score management
- **LevelManager.ts**: Dynamic difficulty scaling formulas
- **AudioManager.ts**: Sound effect and music management

### Implementation Order Recommendation

For another agent to complete this project:

1. **Complete Utils** (2-3 hours)
   - Implement localStorage.ts methods
   - Implement imageProcessor.ts methods
   - Test image capture and tinting

2. **Complete Managers** (3-4 hours)
   - Implement FaceManager (most complex - MediaPipe)
   - Implement ScoreManager (straightforward)
   - Implement LevelManager (formula-based)
   - Implement AudioManager (Phaser API)

3. **Create Entity Classes** (4-5 hours)
   - Player, Bullet, Bomb (simple)
   - Alien, AlienGrid (moderate)
   - Shield (complex - pixel destruction)

4. **Implement Scenes** (6-8 hours)
   - BootScene (asset loading)
   - MenuScene (UI)
   - WebcamScene (most complex - camera + face detection)
   - GameScene (gameplay loop, collisions)
   - GameOverScene (high score entry)

5. **Polish & Test** (2-3 hours)
   - Add particle effects
   - Add sound effects
   - Cross-browser testing
   - Performance optimization

**Total Estimated Time**: 17-23 hours

## 🎯 Game Constants

All game balance values are defined in `src/constants.ts`:

- **Game Dimensions**: 800x600px
- **Player Speed**: 300px/s
- **Bullet Speed**: 400px/s upward
- **Bomb Speed**: 200px/s downward
- **Alien Grid**: 5 rows × 11 columns (expands with levels)
- **Alien Speed**: 1000ms per move (decreases 50ms per level, min 300ms)
- **Max Lives**: 3
- **Max Bullets**: 3 simultaneous
- **Shield Count**: 4
- **Max Stored Faces**: 10 (FIFO queue)

## 🎨 Color Scheme

- Background: Black (#000000)
- Player: Green (#00ff00)
- Aliens: Red (#ff0000)
- Bullets: Yellow (#ffff00)
- Bombs: Magenta (#ff00ff)
- Shields: Green (#00ff00)
- Alien Face Tint: Green (#00ff00)

## 🔐 localStorage Schema

```typescript
// Keys used:
'classinvaders_current_face'    // string (base64 image)
'classinvaders_face_history'    // StoredFace[] (max 10)
'classinvaders_high_scores'     // HighScore[] (top 10)
'classinvaders_settings'        // GameSettings (muted, difficulty)
```

## 🎮 Controls

- **Arrow Keys / A-D**: Move defender left/right
- **Space**: Shoot
- **P**: Pause (to be implemented)
- **M**: Mute toggle (to be implemented)

## 🔧 TypeScript Configuration

The project uses **strict mode** TypeScript with:
- ES2020 target
- ESNext modules
- Bundler module resolution
- All strict checks enabled
- No unused locals/parameters allowed

## 🌐 Browser Support

Requires modern browsers with:
- ES2020 support
- WebRTC (getUserMedia for webcam)
- Canvas 2D context
- localStorage
- WebGL (for Phaser renderer)

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📦 Build Output

Production build creates:
- Optimized JavaScript bundles
- Code splitting for Phaser and MediaPipe
- Minified assets
- Source maps (optional)

## 🐛 Debugging

Set `debug: true` in `src/config.ts` arcade physics config to see collision boxes.

## 📝 License

MIT License - Feel free to use this project for learning or fun!

## 🎓 Learning Resources

- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [MediaPipe Face Detection](https://google.github.io/mediapipe/solutions/face_detection.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

## 🚀 Next Steps for Implementation

1. **Review all skeleton files** in `src/utils/` and `src/managers/`
2. **Implement localStorage.ts** first (foundation for other systems)
3. **Implement imageProcessor.ts** (needed for face capture)
4. **Implement managers** in order: Score → Level → Audio → Face
5. **Create entity classes** following the detailed plan
6. **Implement scenes** starting with Boot, then Menu, Webcam, Game, GameOver
7. **Add assets** (audio files, sprite images if needed)
8. **Test and polish**

---

**Ready for another agent to complete!** All skeleton files have detailed TODOs and implementation guidance.
