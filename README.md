# Class Invaders 👾

A modern take on the classic Space Invaders game with webcam face capture integration. Your face becomes the defender, and your classmates' faces become the alien invaders!

## Features

### 🎮 Core Gameplay
- Classic Space Invaders mechanics with modern enhancements
- Wave-based alien progression
- Destructible shields
- High score tracking with localStorage persistence
- **Multi-Platform Controls**:
  - Keyboard support (Arrow keys + Spacebar)
  - Gamepad/controller support (configurable buttons)
  - Touch controls for iPad/mobile (auto-detected)

### 📸 Face Capture System
- **Webcam Integration**: Capture faces using your device's camera
- **MediaPipe Face Detection**: Automatic face detection and cropping
- **Face History**: Store up to 10 captured faces in localStorage
- **Dynamic Face Composition**:
  - Player ship displays your face
  - Alien invaders display captured classmates' faces
  - Faces are automatically tinted and composited onto sprites

### 🎨 Visual Design
- **SVG-Based Sprites**: All game sprites (aliens, defender) loaded from editable SVG files
- **Custom Alien Designs**: 3 unique alien ship types from SVG artwork
- **Face Circle Integration**: SVG sprites contain metadata for precise face placement
- **Retro Aesthetic**: Green monochrome terminal-style UI

### 🐛 Debug Tools
Comprehensive debug menu accessible via `D` key or Fire+Back buttons:
1. **Player Test Scene**: Test player movement and shooting
2. **Armada Test Scene**: View alien formation and movement patterns
3. **Collision Test Scene**: Debug bullet and collision systems
4. **Camera Test Scene**: Test webcam capture and face detection
5. **Sprite Debug Scene**: View all sprites with face composition controls

## Tech Stack

- **Phaser 3.90**: HTML5 game framework
- **TypeScript**: Type-safe game development
- **Vite**: Fast development server and build tool
- **MediaPipe**: Face detection library
- **localStorage**: Persistent game state and face history

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A webcam (for face capture features)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd classinvaders

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:3000` (or the next available port).

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## Game Controls

### Keyboard
- **Arrow Keys / WASD**: Move player ship
- **Spacebar**: Fire weapon
- **D**: Open debug menu (from main menu)
- **ESC**: Return to previous menu / Close overlays
- **Numbers 1-5**: Select debug scenes (in debug menu)

### Gamepad/Controller
- **Left Stick / D-Pad**: Move player ship
- **Fire Button**: Shoot / Select menu items
- **Start Button**: Pause / Select menu items
- **Fire + Back Buttons**: Open debug menu (from main menu)

Controller button mappings can be customized in the game settings.

### Touch Controls (iPad/Mobile)
Touch controls automatically appear on devices with touchscreen support:
- **Left/Right Buttons**: Tap and hold to move left or right
- **Fire Button**: Tap to shoot

The touch control interface includes:
- Semi-transparent virtual buttons at the bottom of the screen
- Visual feedback when buttons are pressed
- Optimized for tablet and mobile gameplay

## Project Structure

```
classinvaders/
├── public/
│   └── assets/
│       ├── images/          # SVG sprite files
│       │   ├── alien1.svg   # Alien type 1 (supports faces)
│       │   ├── alien2.svg   # Alien type 2
│       │   ├── alien3.svg   # Alien type 3
│       │   └── defender.svg # Player ship (supports faces)
│       ├── sounds/          # Audio files
│       └── text/            # Text content (crawl text, etc.)
├── src/
│   ├── constants.ts         # Game constants and configuration
│   ├── config.ts            # Phaser game configuration
│   ├── main.ts              # Entry point
│   ├── entities/            # Game entities
│   │   ├── Alien.ts         # Alien ship entity
│   │   ├── AlienGrid.ts     # Alien formation manager
│   │   ├── Player.ts        # Player ship entity
│   │   ├── Bullet.ts        # Player bullet
│   │   ├── Bomb.ts          # Alien bomb
│   │   └── Shield.ts        # Destructible shield
│   ├── managers/            # Game systems
│   │   └── FaceManager.ts   # Face capture and composition
│   ├── scenes/              # Phaser scenes
│   │   ├── PreloaderScene.ts  # Asset loading
│   │   ├── MenuScene.ts       # Main menu
│   │   ├── WebcamScene.ts     # Face capture interface
│   │   ├── GameScene.ts       # Main gameplay
│   │   ├── GameOverScene.ts   # Game over screen
│   │   └── debug/             # Debug scenes
│   └── utils/               # Utilities
│       └── localStorage.ts  # localStorage wrapper
└── index.html
```

## SVG Sprite System

The game uses SVG files for all sprites, allowing easy customization:

### Creating Custom Sprites

1. **Design in Inkscape** (or any SVG editor)
2. **Set canvas to 100x100px**
3. **Add face circle** (optional):
   - Create a circle/ellipse element
   - Set `id="face"` or `inkscape:label="face"`
   - This circle will be replaced with captured faces in-game
4. **Export as Plain SVG**
5. **Place in `public/assets/images/`**

### Face Integration

- Only `alien1.svg` and `defender.svg` support face composition
- Face circles are automatically detected and stored as metadata
- Face radius is scaled by 0.75x for better fit
- Faces are tinted green and composited onto the sprite base

## Features In Development

- Star Wars-style opening crawl with perspective scroll
- Additional alien types
- Power-ups and special weapons
- Multiplayer support

## Console Commands

When on the main menu, the following debug commands are available in the browser console:

```javascript
// Crawl controls (when enabled)
crawl.show()      // Show the text crawl
crawl.hide()      // Hide the text crawl
crawl.toggle()    // Toggle visibility
crawl.reset()     // Reset to start position
crawl.getInfo()   // Show debug information
```

## Credits

- **Game Engine**: [Phaser 3](https://phaser.io/)
- **Face Detection**: [MediaPipe](https://developers.google.com/mediapipe)
- **Development**: Built with TypeScript and Vite
- **Inspiration**: Classic Space Invaders (1978)

## License

This project is for educational purposes.

---

**Note**: This game requires webcam access for the face capture feature. Your face data is stored locally in your browser's localStorage and is never transmitted to any server.
