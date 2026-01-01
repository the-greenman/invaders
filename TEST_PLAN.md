
# Test Plan - Class Invaders

## 1. Executive Summary

This document outlines the testing strategy for **Class Invaders**, a Phaser.js-based Space Invaders/Galaga hybrid game with webcam face capture integration. The game features two distinct game modes (Space Invaders and Galaga), multi-platform input support (keyboard, gamepad, touch), and a face management system using MediaPipe.

### Tech Stack
- **Framework**: Phaser 3.80 (TypeScript)
- **Build Tool**: Vite 5.0
- **Face Detection**: MediaPipe Face Detection
- **Storage**: localStorage (faces, high scores, settings)

### Testing Objectives
1. Ensure core game mechanics work correctly across both game modes
2. Validate entity behavior (Player, Aliens, Bullets, Bombs, Shields)
3. Verify game systems (WaveManager, AttackPath, ScoreManager, FaceManager)
4. Test input handling across keyboard, gamepad, and touch
5. Validate localStorage persistence and retrieval
6. Prevent regressions through automated tests

---

## 2. Test Architecture

### 2.1 Recommended Testing Stack

**Primary Framework: Vitest**
- Already using Vite for build tooling
- Fast, Jest-compatible API
- Native ESM support
- Better TypeScript integration with Vite projects

**Environment: jsdom**
- Provides browser-like environment for Phaser
- Supports DOM manipulation for UI tests
- Canvas mocking for headless testing

**Additional Tools:**
- `@vitest/ui` - Visual test runner
- `@vitest/coverage-v8` - Code coverage reports
- `happy-dom` (alternative to jsdom, faster but optional)

**E2E Testing (Optional):**
- Playwright for full browser integration tests
- Test actual gameplay flows with real canvas rendering

### 2.2 Installation Commands

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8 jsdom
npm install -D @types/jest  # For better IDE support
```

### 2.3 Directory Structure

```
invaders/
├── src/
│   ├── entities/
│   ├── managers/
│   ├── scenes/
│   ├── systems/
│   └── utils/
├── tests/
│   ├── unit/
│   │   ├── entities/
│   │   │   ├── Player.test.ts
│   │   │   ├── Alien.test.ts
│   │   │   ├── Bullet.test.ts
│   │   │   ├── Bomb.test.ts
│   │   │   ├── Shield.test.ts
│   │   │   ├── BaseAlienGrid.test.ts
│   │   │   ├── SpaceInvadersGrid.test.ts
│   │   │   └── GalagaGrid.test.ts
│   │   ├── managers/
│   │   │   ├── ScoreManager.test.ts
│   │   │   ├── LevelManager.test.ts
│   │   │   ├── AudioManager.test.ts
│   │   │   ├── TouchControlManager.test.ts
│   │   │   └── SpriteManager.test.ts
│   │   ├── systems/
│   │   │   ├── AttackPath.test.ts
│   │   │   └── WaveManager.test.ts
│   │   └── utils/
│   │       └── localStorage.test.ts
│   ├── integration/
│   │   ├── player-shooting.test.ts
│   │   ├── alien-collision.test.ts
│   │   ├── wave-attacks.test.ts
│   │   ├── shield-damage.test.ts
│   │   └── game-over-flow.test.ts
│   ├── systems/
│   │   ├── space-invaders-mode.test.ts
│   │   └── galaga-mode.test.ts
│   ├── helpers/
│   │   ├── PhaserTestHarness.ts
│   │   ├── MockScene.ts
│   │   ├── EntityFactory.ts
│   │   └── FakeInput.ts
│   └── setup.ts
├── vitest.config.ts
└── TEST_PLAN.md (this file)
```

---

## 3. Required Refactoring for Testability

### 3.1 Determinism & Time Abstraction

**Current Issues:**
- `Date.now()` used directly in Player, Alien, WaveManager, AttackPath
- Makes tests non-deterministic and time-dependent

**Solution: Use Vitest's Built-in Fake Timers (No Production Code Changes)**

Vitest provides native timer mocking that intercepts `Date.now()` without requiring refactoring:

```typescript
// In test files - no production code changes needed
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

// In tests, advance time as needed:
vi.advanceTimersByTime(1000);  // Advance 1 second
vi.setSystemTime(Date.now() + 500);  // Jump to specific time
```

**Benefits:**
- Zero production code changes
- Works with all existing `Date.now()` calls
- Can test time-dependent logic deterministically
- Built into Vitest, no extra dependencies

**Files Affected (no changes needed, just aware):**
- `src/entities/Player.ts` - Uses `Date.now()` for shoot cooldown
- `src/systems/WaveManager.ts` - Uses `Date.now()` for wave timing
- `src/systems/AttackPath.ts` - Uses `Date.now()` for path progress

### 3.2 Random Number Generation Abstraction

**Current Issues:**
- `Phaser.Math.Between()` and `Math.random()` used throughout
- Cannot reproduce specific scenarios in tests

**Refactor Required:**
```typescript
// Create src/utils/RandomProvider.ts
export interface IRandomProvider {
  between(min: number, max: number): number;
  random(): number;
  pick<T>(array: T[]): T;
}

export class PhaserRandomProvider implements IRandomProvider {
  between(min: number, max: number): number {
    return Phaser.Math.Between(min, max);
  }
  
  random(): number {
    return Math.random();
  }
  
  pick<T>(array: T[]): T {
    return Phaser.Math.RND.pick(array);
  }
}

export class SeededRandomProvider implements IRandomProvider {
  constructor(private seed: number) {}
  
  // Implement seeded RNG for tests
  // Use simple LCG or Phaser's seeded RNG
}
```

**Files to Update:**
- `src/systems/WaveManager.ts` - Use injected random provider
- `src/systems/AttackPath.ts` - Use injected random provider for path selection
- `src/entities/BaseAlienGrid.ts` - Inject random for bomb dropping

### 3.3 Input Abstraction (Already Partially Done)

**Current State:**
- Player already uses cursors, gamepad, and TouchControlManager
- Good separation of concerns

**Enhancement Needed:**
```typescript
// Create src/utils/FakeInput.ts for tests
export class FakeInput {
  private leftPressed = false;
  private rightPressed = false;
  private shootPressed = false;
  
  pressLeft(): void { this.leftPressed = true; }
  releaseLeft(): void { this.leftPressed = false; }
  pressRight(): void { this.rightPressed = true; }
  releaseRight(): void { this.rightPressed = false; }
  pressShoot(): void { this.shootPressed = true; }
  releaseShoot(): void { this.shootPressed = false; }
  
  getCursorKeys(): any {
    return {
      left: { isDown: this.leftPressed },
      right: { isDown: this.rightPressed }
    };
  }
  
  getSpaceKey(): any {
    return { isDown: this.shootPressed };
  }
}
```

### 3.4 Scene Decoupling

**Current Issues:**
- Entities tightly coupled to Phaser.Scene
- Hard to test entities in isolation

**Refactor Strategy:**
- Create minimal mock scenes for unit tests
- Extract game logic from scene lifecycle methods into testable services
- Use dependency injection for scene references

---

## 4. Test Suites & Coverage

### 4.1 Unit Tests (High Priority)

#### 4.1.1 Entities

**`tests/unit/entities/Player.test.ts`**
- ✅ Player creation and initialization
- ✅ Movement (left/right with velocity)
- ✅ Shooting cooldown enforcement
- ✅ Bullet firing event emission
- ✅ Damage handling (flash effect)
- ✅ Reset to initial state
- ✅ World bounds collision

**`tests/unit/entities/Alien.test.ts`**
- ✅ Alien creation with correct type and points
- ✅ Movement (move method updates position)
- ✅ State transitions (IN_FORMATION → ATTACKING → RETURNING)
- ✅ Formation position tracking
- ✅ Attack path assignment and following
- ✅ Bomb firing
- ✅ Destruction and point return

**`tests/unit/entities/Bullet.test.ts`**
- ✅ Bullet creation and velocity
- ✅ Upward movement
- ✅ Auto-destroy when off-screen
- ✅ Collision body size

**`tests/unit/entities/Bomb.test.ts`**
- ✅ Bomb creation and velocity
- ✅ Downward movement
- ✅ Auto-destroy when off-screen

**`tests/unit/entities/Shield.test.ts`**
- ✅ Shield creation with hit points
- ✅ Damage application reduces HP
- ✅ Destruction at 0 HP
- ✅ Visual degradation (alpha/tint changes)

**`tests/unit/entities/BaseAlienGrid.test.ts`**
- ✅ Grid initialization with correct rows/cols
- ✅ Alien positioning in formation
- ✅ Movement direction changes at edges
- ✅ Downward step on direction change
- ✅ Alive alien count tracking
- ✅ Bomb dropping logic

**`tests/unit/entities/SpaceInvadersGrid.test.ts`**
- ✅ Classic step-based movement
- ✅ Speed increase as aliens destroyed
- ✅ Edge detection and direction reversal
- ✅ Bomb drop probability scaling with level

**`tests/unit/entities/GalagaGrid.test.ts`**
- ✅ Smooth formation movement
- ✅ Formation boundaries (left/right oscillation)
- ✅ Integration with WaveManager
- ✅ Alien state queries (IN_FORMATION count)

#### 4.1.2 Managers

**`tests/unit/managers/ScoreManager.test.ts`**
- ✅ Score initialization at 0
- ✅ Adding points increments score
- ✅ Score retrieval
- ✅ Reset to 0
- ✅ High score qualification check
- ✅ High score saving with name/level/face
- ✅ Score formatting with leading zeros

**`tests/unit/managers/LevelManager.test.ts`**
- ✅ Level initialization
- ✅ Level increment
- ✅ Difficulty scaling (speed, bomb chance)
- ✅ Mode switching after N levels

**`tests/unit/managers/AudioManager.test.ts`**
- ✅ Sound playing (mocked)
- ✅ Mute/unmute state
- ✅ Volume control
- ✅ Music looping

**`tests/unit/managers/FaceManager.test.ts`** (Partial - MediaPipe mocking complex)
- ✅ Face storage to localStorage
- ✅ Face retrieval from history
- ✅ Current face setting
- ✅ Face composition metadata extraction
- ⚠️ Skip actual MediaPipe face detection (requires browser/camera)

**`tests/unit/managers/TouchControlManager.test.ts`**
- ✅ Touch control initialization
- ✅ Button press/release detection
- ✅ Drag gesture handling (getDragX)
- ✅ Move direction calculation
- ✅ Shoot request consumption
- ✅ Enable/disable state

**`tests/unit/managers/SpriteManager.test.ts`**
- ✅ SVG loading and parsing
- ✅ Face circle metadata extraction
- ✅ Texture creation from SVG
- ✅ Face composition onto sprites
- ✅ Tint application

#### 4.1.3 Systems

**`tests/unit/systems/AttackPath.test.ts`**
- ✅ DiveBombPath - quadratic bezier math
- ✅ LoopPath - circular parametric curve
- ✅ WeavePath - sine wave + linear descent
- ✅ SwoopPath - cubic bezier S-curve
- ✅ StrafePath - two-phase horizontal/vertical
- ✅ Path completion detection
- ✅ getCurrentPosition returns correct t progress
- ✅ Random path factory distribution

**`tests/unit/systems/WaveManager.test.ts`**
- ✅ Wave launch timing (interval checks)
- ✅ Wave size selection (min/max)
- ✅ Bottom row alien selection
- ✅ Max simultaneous waves limit
- ✅ Alien state transitions during wave
- ✅ Return-to-formation navigation
- ✅ Wave cleanup when complete

#### 4.1.4 Utils

**`tests/unit/utils/localStorage.test.ts`**
- ✅ Current face get/set/remove
- ✅ Face history add/retrieve
- ✅ Face history FIFO (max 20 faces)
- ✅ High scores get/add/sort
- ✅ High score top 10 limit
- ✅ isHighScore qualification check
- ✅ Settings get/save with defaults
- ✅ clearAll removes all data
- ✅ JSON parse error handling

### 4.2 Integration Tests (Medium Priority)

**`tests/integration/player-shooting.test.ts`**
- Scenario: Player shoots bullet, bullet travels, hits alien
- Assertions:
  - Bullet created at player position
  - Bullet moves upward over frames
  - Collision with alien destroys both
  - Score increases by alien point value

**`tests/integration/alien-collision.test.ts`**
- Scenario: Alien formation moves, reaches player
- Assertions:
  - Aliens move in formation
  - Direction changes at screen edges
  - Downward step occurs
  - Game over triggered if aliens reach threshold Y

**`tests/integration/wave-attacks.test.ts`** (Galaga Mode)
- Scenario: Wave launches, aliens attack, return to formation
- Assertions:
  - Aliens transition to ATTACKING state
  - Follow attack paths correctly
  - Transition to RETURNING when path complete
  - Snap to formation position on arrival
  - State returns to IN_FORMATION

**`tests/integration/shield-damage.test.ts`**
- Scenario: Bullet/bomb hits shield multiple times
- Assertions:
  - Shield HP decreases on each hit
  - Visual degradation occurs
  - Shield destroyed at 0 HP
  - Projectile destroyed on shield hit

**`tests/integration/game-over-flow.test.ts`**
- Scenario: Player loses all lives
- Assertions:
  - Lives decrement on bomb hit
  - Player respawns after death (if lives remain)
  - Game over scene triggered at 0 lives
  - High score check performed
  - Score saved if qualifies

### 4.3 System/Mode Tests (Medium Priority)

**`tests/systems/space-invaders-mode.test.ts`**
- Full Space Invaders game loop over N frames
- Assertions:
  - Alien grid moves correctly
  - Bombs drop with increasing frequency
  - Level completion when all aliens destroyed
  - Difficulty increases per level

**`tests/systems/galaga-mode.test.ts`**
- Full Galaga game loop over N frames
- Assertions:
  - Formation movement (smooth scrolling)
  - Wave attacks launch periodically
  - Homing behavior (if enabled)
  - Level completion
  - Mode switching after N levels

### 4.4 Regression Tests (Ongoing)

- Add focused test for each discovered bug
- Tag with bug ID or GitHub issue number
- Keep minimal and fast

### 4.5 Scene Tests (Lower Priority)

**`tests/unit/scenes/MenuScene.test.ts`**
- ✅ Menu item navigation
- ✅ Button selection/activation
- ✅ Scene transition triggers
- ✅ Debug menu access (D key / Fire+Back)

**`tests/unit/scenes/GameOverScene.test.ts`**
- ✅ Score display
- ✅ High score entry (if qualifies)
- ✅ Name input handling
- ✅ Restart/menu navigation

**`tests/unit/scenes/DifficultySelectScene.test.ts`**
- ✅ Difficulty options display
- ✅ Selection persistence to settings
- ✅ Scene transition to game

### 4.6 Snapshot Tests (Selective)

**`tests/snapshots/`**
- ✅ AttackPath point sequences (verify curve math hasn't changed)
- ✅ Score formatting output
- ✅ Default settings structure
- ✅ High score sorting order

---

## 5. Test Utilities & Helpers

### 5.1 Phaser Test Harness

**`tests/helpers/PhaserTestHarness.ts`**
```typescript
export class PhaserTestHarness {
  private game: Phaser.Game | null = null;
  
  createGame(config?: Partial<Phaser.Types.Core.GameConfig>): Phaser.Game {
    // Create minimal headless Phaser game for tests
    // Use HEADLESS renderer, no audio
  }
  
  destroyGame(): void {
    // Clean up game instance
  }
  
  runFrames(count: number, dt: number = 16.67): void {
    // Manually step game loop
  }
}
```

### 5.2 Mock Scene

**`tests/helpers/MockScene.ts`**
```typescript
export class MockScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MockScene' });
  }
  
  // Minimal scene for entity testing
  // Provides physics, add, time, events
}
```

### 5.3 Entity Factory

**`tests/helpers/EntityFactory.ts`**
```typescript
export class EntityFactory {
  static createPlayer(scene: Phaser.Scene, x = 400, y = 550): Player {
    // Create player with test defaults
  }
  
  static createAlien(scene: Phaser.Scene, type = 0, row = 0, col = 0): Alien {
    // Create alien with test defaults
  }
  
  static createAlienGrid(scene: Phaser.Scene, rows = 3, cols = 7): BaseAlienGrid {
    // Create grid with test defaults
  }
  
  static createShield(scene: Phaser.Scene, x: number): Shield {
    // Create shield with test defaults
  }
}
```

### 5.4 Fake Input

**`tests/helpers/FakeInput.ts`**
```typescript
export class FakeInput {
  // Script input sequences for tests
  // Example: fakeInput.pressLeft().wait(100).pressShoot()
}
```

---

## 6. Vitest Configuration

**`vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Required for Phaser to work in jsdom environment
    deps: {
      inline: ['phaser']
    },
    // Use forks for better isolation with Phaser's global state
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/config.ts',
        'src/scenes/debug/**',
        'src/**/*.d.ts'
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**`tests/setup.ts`**
```typescript
import { beforeAll, afterEach, vi } from 'vitest';

// Mock localStorage with working implementation
const localStorageData: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageData[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }),
  get length() { return Object.keys(localStorageData).length; },
  key: vi.fn((i: number) => Object.keys(localStorageData)[i] ?? null)
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock requestAnimationFrame (required by Phaser)
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16) as unknown as number;
});
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock canvas with comprehensive 2D context
const createCanvasContextMock = () => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createPattern: vi.fn(),
  canvas: { width: 800, height: 600 }
});

HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
  if (contextType === '2d') return createCanvasContextMock();
  if (contextType === 'webgl' || contextType === 'webgl2') {
    // Return minimal WebGL mock - Phaser will fall back to Canvas
    return null;
  }
  return null;
}) as any;

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,');
HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob()));

// Mock Image loading
Object.defineProperty(global.Image.prototype, 'src', {
  set(src: string) {
    setTimeout(() => this.onload?.(), 0);
  }
});

// Mock MediaPipe (for FaceManager tests)
vi.mock('@mediapipe/face_detection', () => ({
  FaceDetection: vi.fn(() => ({
    setOptions: vi.fn(),
    onResults: vi.fn(),
    send: vi.fn()
  }))
}));

vi.mock('@mediapipe/camera_utils', () => ({
  Camera: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

// Mock AudioContext
global.AudioContext = vi.fn(() => ({
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { value: 1 } })),
  createBufferSource: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
  decodeAudioData: vi.fn(),
  destination: {},
  state: 'running',
  resume: vi.fn()
})) as any;

beforeAll(() => {
  // Global test setup
});

afterEach(() => {
  // Reset mocks between tests
  vi.clearAllMocks();
  // Clear localStorage data
  Object.keys(localStorageData).forEach(k => delete localStorageData[k]);
});
```

---

## 7. Package.json Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

---

## 8. Testing Workflow

### 8.1 Development Workflow
1. **Write test first** (TDD when adding new features)
2. **Run tests in watch mode**: `npm run test:watch`
3. **Fix failing tests**
4. **Check coverage**: `npm run test:coverage`
5. **Commit when tests pass**

### 8.2 CI/CD Integration (Future)
- Run `npm run test:run` on every commit
- Fail build if tests fail
- Generate coverage reports
- Run E2E tests (Playwright) on PR

### 8.3 Pre-commit Hook (Optional)
```bash
# .husky/pre-commit
npm run test:run
```

---

## 9. Test Priority & Phasing

### Phase 1: Foundation (Week 1-3)
- [ ] Set up Vitest configuration and verify it runs
- [ ] Create test helpers (PhaserTestHarness, MockScene, EntityFactory)
- [ ] Write unit tests for:
  - localStorage utils (easiest starting point)
  - ScoreManager
  - AttackPath (all 5 path types - pure math, easy to test)

### Phase 2: Core Entities (Week 4-6)
- [ ] Unit tests for Player (requires mock scene setup)
- [ ] Unit tests for Alien
- [ ] Unit tests for Bullet/Bomb
- [ ] Unit tests for Shield
- [ ] Unit tests for BaseAlienGrid
- [ ] Unit tests for SpaceInvadersGrid
- [ ] Unit tests for GalagaGrid

### Phase 3: Managers & Systems (Week 7-9)
- [ ] Unit tests for WaveManager
- [ ] Unit tests for LevelManager
- [ ] Unit tests for TouchControlManager
- [ ] Unit tests for SpriteManager (partial - skip SVG loading)
- [ ] Integration tests for player shooting
- [ ] Integration tests for alien collisions

### Phase 4: Game Modes & Integration (Week 10-12)
- [ ] System tests for Space Invaders mode
- [ ] System tests for Galaga mode
- [ ] Integration tests for wave attacks
- [ ] Integration tests for game over flow
- [ ] Scene navigation tests (MenuScene, GameOverScene)

### Phase 5: Polish & Coverage (Week 13+)
- [ ] Achieve 60%+ code coverage
- [ ] Add regression tests for known bugs
- [ ] Snapshot tests for math-heavy code
- [ ] E2E tests with Playwright (optional)
- [ ] Performance/stress tests (1000+ entities)

---

## 10. Known Testing Challenges

### 10.1 Phaser-Specific Issues
- **Canvas Rendering**: Tests run headless, can't verify visual output
  - Solution: Test game state, not rendering
- **Physics**: Arcade physics requires scene setup
  - Solution: Use MockScene with minimal physics config
- **Tweens/Timers**: Time-based animations hard to test
  - Solution: Mock scene.time or advance time manually

### 10.2 MediaPipe Face Detection
- Requires browser + camera access
- Solution: Mock MediaPipe entirely, test FaceManager logic only
- E2E tests can verify face capture in real browser

### 10.3 Gamepad Input
- No real gamepad in CI environment
- Solution: Mock gamepad API, test input mapping logic

### 10.4 localStorage
- Already mocked in setup.ts
- Tests verify logic, not actual browser storage

### 10.5 Phaser Version Upgrades
- **Risk**: Phaser internal API changes may break mocks
- **Mitigation**: Pin Phaser version, test after upgrades
- Document which Phaser internals are mocked

### 10.6 WebGL Behavior
- jsdom doesn't support WebGL
- Phaser falls back to Canvas renderer in tests
- Some WebGL-specific code paths untestable without real browser
- Solution: Use Playwright E2E tests for WebGL-dependent features

---

## 11. Success Metrics

- **Code Coverage**: ≥60% overall, ≥80% for critical paths (entities, managers, systems)
- **Test Count**: ≥80 unit tests, ≥15 integration tests (realistic initial target)
- **CI Pass Rate**: 100% (all tests must pass before merge)
- **Test Speed**: Full suite runs in <30 seconds
- **Regression Prevention**: 0 regressions in tested areas

---

## 12. Maintenance & Evolution

### Adding New Features
1. Write tests first (TDD)
2. Ensure new code has ≥70% coverage
3. Update this test plan if architecture changes

### Bug Fixes
1. Reproduce bug in a test
2. Fix the bug
3. Verify test passes
4. Keep regression test in suite

### Refactoring
1. Ensure tests pass before refactor
2. Refactor code
3. Ensure tests still pass (no behavior change)
4. Update tests if API changes

---

## 13. Next Steps

1. **Install Vitest**: `npm install -D vitest @vitest/ui @vitest/coverage-v8 jsdom`
2. **Create vitest.config.ts** (see Section 6)
3. **Create tests/setup.ts** (see Section 6)
4. **Refactor time/random providers** (see Section 3.1, 3.2)
5. **Create test helpers** (see Section 5)
6. **Start with Phase 1 tests** (localStorage, ScoreManager, AttackPath)
7. **Run tests**: `npm run test:watch`
8. **Iterate and expand coverage**

---

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Phaser mocking complexity | High | Medium | Start with pure logic tests, incrementally add scene tests |
| Test suite becomes slow | Medium | High | Use `pool: 'forks'`, skip slow tests in watch mode |
| Flaky time-dependent tests | Medium | Medium | Use `vi.useFakeTimers()` consistently |
| Mock drift from real behavior | Low | High | Periodic E2E tests validate mocks |
| Coverage gaps in scene logic | High | Low | Accept lower coverage for UI-heavy scenes |

---

**Document Version**: 1.1  
**Last Updated**: 2026-01-01  
**Owner**: Development Team
