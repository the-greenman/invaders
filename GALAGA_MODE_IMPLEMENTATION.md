# Galaga Mode Implementation Tasks

## Overview
This document outlines the tasks needed to complete the Galaga mode (Game 2) implementation. The foundation and skeleton files have been created. This guide is for coding agents to implement the remaining functionality.

## Current Status
- ✅ GameMode types and enums created (`src/types/GameMode.ts`)
- ✅ Galaga constants added to `src/constants.ts`
- ✅ AlienGrid renamed to SpaceInvadersGrid
- ✅ Skeleton files created with TODOs:
  - `src/entities/BaseAlienGrid.ts` (abstract base)
  - `src/entities/GalagaGrid.ts` (Galaga implementation)
  - `src/systems/AttackPath.ts` (5 attack patterns)
  - `src/systems/WaveManager.ts` (wave coordination)
- ✅ Alien.ts has state machine structure (AlienState enum, properties, getters/setters)

## Coordination Guidelines for Multiple Agents

### Git Branching Strategy

**Branch Naming Convention:**
```
galaga/<phase-number>-<task-name>
```

**Examples:**
- `galaga/phase1-alien-followpath`
- `galaga/phase2-divebomb-path`
- `galaga/phase2-all-attack-paths`
- `galaga/phase3-wave-manager`
- `galaga/phase4-galaga-grid`
- `galaga/phase5-base-grid-extraction`
- `galaga/phase6-mode-switching`

**Creating a branch:**
```bash
git checkout galaga  # Start from main galaga branch
git pull             # Get latest changes
git checkout -b galaga/phase2-attack-paths
```

### Task Claiming System

Before starting work on a phase, claim it by updating `GALAGA_TASKS.md`:

**1. Create the task tracking file (first agent only):**
```bash
# Create GALAGA_TASKS.md in project root if it doesn't exist
```

**2. Claim a task by updating GALAGA_TASKS.md:**

Format:
```markdown
## Phase X: Task Name
- **Status:** 🚧 IN PROGRESS
- **Agent:** <your-identifier>
- **Branch:** galaga/phaseX-task-name
- **Started:** 2025-12-26 14:30
- **Dependencies:** Phase Y complete
- **Notes:** Any relevant info
```

**3. Task Status Indicators:**
- ⏳ **BLOCKED** - Waiting on dependencies
- 🆓 **AVAILABLE** - Ready to claim
- 🚧 **IN PROGRESS** - Currently being worked on
- ✅ **COMPLETE** - Merged to galaga branch
- ⚠️ **NEEDS REVIEW** - PR open, awaiting review

### Claiming Workflow

**Before starting work:**

1. **Check GALAGA_TASKS.md** to see if task is available
2. **Verify dependencies are complete** (check Dependencies Graph)
3. **Update GALAGA_TASKS.md** to mark task as 🚧 IN PROGRESS with your info
4. **Commit the task file update:**
   ```bash
   git checkout galaga
   git pull
   # Edit GALAGA_TASKS.md to claim your task
   git add GALAGA_TASKS.md
   git commit -m "Claiming Phase X: Task Name"
   git push
   ```
5. **Create your feature branch** from galaga branch
6. **Begin implementation**

**While working:**

1. **Commit frequently** with clear messages
2. **Push your branch** regularly to backup work
3. **Update GALAGA_TASKS.md notes** if you discover issues

**When complete:**

1. **Test your implementation** according to phase criteria
2. **Update task status** to ⚠️ NEEDS REVIEW in GALAGA_TASKS.md
3. **Create Pull Request** to merge into `galaga` branch
4. **PR Title format:** `[Galaga Phase X] Task Name`
5. **PR Description should include:**
   - What was implemented
   - Testing performed
   - Any issues encountered
   - Dependencies satisfied
6. **After merge:** Update status to ✅ COMPLETE

### Parallel Work Guidelines

**Safe to work in parallel (no conflicts):**
- Phase 1 + Phase 2 + Phase 5 (different files)
- Phase 2 sub-tasks (different classes in same file, but each agent takes whole classes)

**Must be sequential (dependencies):**
- Phase 3 requires Phase 1 & 2 complete
- Phase 4 requires Phase 3 & 5 complete
- Phase 6 requires Phase 4 complete

**Handling same-file work:**
If multiple agents need to work on the same file (e.g., AttackPath.ts):
- **Option A:** One agent implements all 5 path classes
- **Option B:** Agents coordinate to implement different classes, then merge carefully
- Always communicate in task file notes if working on same file

### Merge Conflict Resolution

If you encounter merge conflicts:

1. **Communicate in GALAGA_TASKS.md:**
   ```markdown
   - **Notes:** Merge conflict with Phase X - coordinating with Agent Y
   ```

2. **Resolve conflicts:**
   ```bash
   git checkout galaga
   git pull
   git checkout galaga/your-branch
   git merge galaga
   # Resolve conflicts
   git add .
   git commit -m "Merge galaga branch, resolve conflicts"
   git push
   ```

3. **If unsure:** Ask for review before merging

### Communication Protocol

**Use GALAGA_TASKS.md Notes section for:**
- Blocking issues discovered
- Changes to dependencies
- Requests for help
- Completion announcements

**Example task entry:**
```markdown
## Phase 2.1: DiveBombPath Implementation
- **Status:** ✅ COMPLETE
- **Agent:** agent-alpha
- **Branch:** galaga/phase2-divebomb
- **Started:** 2025-12-26 10:00
- **Completed:** 2025-12-26 11:30
- **PR:** #42
- **Dependencies:** Phase 1 complete ✅
- **Notes:** Tested with PathTestScene. Math formulas working correctly.
```

### Dependency Checklist

Before claiming a task, verify dependencies:

**Phase 1:** No dependencies ✅
**Phase 2:** No dependencies ✅
**Phase 3:** Needs Phase 1 ✅ + Phase 2 ✅
**Phase 4:** Needs Phase 3 ✅ + Phase 5 ✅
**Phase 5:** No dependencies ✅
**Phase 6:** Needs Phase 4 ✅
**Phase 7:** Needs Phase 6 ✅

### Quick Start for Agents

1. Read this entire document
2. Check Dependencies Graph to see what's available
3. Check GALAGA_TASKS.md to see what's unclaimed
4. Claim an available task with dependencies satisfied
5. Create branch and implement following the phase instructions
6. Test thoroughly
7. Create PR and update task status
8. Move to next available task

---

## Implementation Phases

---

## Phase 1: Complete Alien State Machine ✅ (Structure exists, needs `followPath()` implementation)

**File:** `src/entities/Alien.ts`

**Status:** State machine structure exists (lines 29-288), only `followPath()` needs implementation

**Task:** Implement the `followPath()` method (line 276)

**Implementation:**
```typescript
followPath(delta: number): void {
  if (!this.attackPath || this.state !== AlienState.ATTACKING) {
    return;
  }

  const pos = this.attackPath.getCurrentPosition(delta);
  this.setPosition(pos.x, pos.y);
  const body = this.body as Phaser.Physics.Arcade.Body;
  body.reset(pos.x, pos.y);
}
```

**Remove:** The `throw new Error('TODO: Implement Alien.followPath()');` line

**Testing:**
- Verify alien follows path curves when state is ATTACKING
- Verify physics body updates correctly
- Verify alien stops following path when state changes

---

## Phase 2: Implement Attack Path Classes

**File:** `src/systems/AttackPath.ts`

**Status:** Base class complete, 5 concrete classes need implementation

**Dependencies:** None (standalone math implementations)

### Task 2.1: Implement DiveBombPath.start() and getPointAtTime()

**Lines:** 100-124

**Implementation:**
```typescript
// In start() method (line 100):
start(startX: number, startY: number): void {
  super.start(startX, startY);

  // Calculate control point and target
  this.controlX = startX + Phaser.Math.Between(-100, 100);
  this.controlY = startY + 400;

  // Target: near bottom of screen
  this.targetX = startX + Phaser.Math.Between(-100, 100);
  this.targetY = GAME_HEIGHT + 50; // Just off screen
}

// In getPointAtTime() method (line 113):
getPointAtTime(t: number): { x: number; y: number; t: number } {
  // Quadratic Bezier: P = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
  const x = Math.pow(1-t, 2) * this.startX +
            2 * (1-t) * t * this.controlX +
            Math.pow(t, 2) * this.targetX;
  const y = Math.pow(1-t, 2) * this.startY +
            2 * (1-t) * t * this.controlY +
            Math.pow(t, 2) * this.targetY;
  return { x, y, t };
}
```

### Task 2.2: Implement LoopPath.start() and getPointAtTime()

**Lines:** 144-159

**Implementation:**
```typescript
// In start() method (line 144):
start(startX: number, startY: number): void {
  super.start(startX, startY);

  // Calculate loop center
  this.centerX = GAME_WIDTH / 2;
  this.centerY = GAME_HEIGHT / 2;
}

// In getPointAtTime() method (line 151):
getPointAtTime(t: number): { x: number; y: number; t: number } {
  // Parametric circle: x = cx + r*cos(θ), y = cy + r*sin(θ)
  const angle = t * Math.PI * 2;
  const x = this.centerX + this.radius * Math.cos(angle);
  const y = this.centerY + this.radius * Math.sin(angle);
  return { x, y, t };
}
```

### Task 2.3: Implement WeavePath.getPointAtTime()

**Lines:** 175-182

**Implementation:**
```typescript
getPointAtTime(t: number): { x: number; y: number; t: number } {
  // Sine wave (horizontal) + linear descent (vertical)
  const x = this.startX + this.amplitude * Math.sin(t * this.frequency * Math.PI * 2);
  const y = this.startY + (GAME_HEIGHT - this.startY) * t;
  return { x, y, t };
}
```

### Task 2.4: Implement SwoopPath.start() and getPointAtTime()

**Lines:** 203-214

**Implementation:**
```typescript
// In start() method (line 203):
start(startX: number, startY: number): void {
  super.start(startX, startY);

  // Calculate cubic bezier control points for S-curve
  const side = startX < GAME_WIDTH / 2 ? 1 : -1;
  this.control1X = startX + (side * 200);
  this.control1Y = startY + 200;
  this.control2X = startX - (side * 200);
  this.control2Y = startY + 400;
  this.targetX = startX;
  this.targetY = GAME_HEIGHT + 50;
}

// In getPointAtTime() method (line 209):
getPointAtTime(t: number): { x: number; y: number; t: number } {
  // Cubic Bezier: P = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
  const t1 = 1 - t;
  const x = Math.pow(t1, 3) * this.startX +
            3 * Math.pow(t1, 2) * t * this.control1X +
            3 * t1 * Math.pow(t, 2) * this.control2X +
            Math.pow(t, 3) * this.targetX;
  const y = Math.pow(t1, 3) * this.startY +
            3 * Math.pow(t1, 2) * t * this.control1Y +
            3 * t1 * Math.pow(t, 2) * this.control2Y +
            Math.pow(t, 3) * this.targetY;
  return { x, y, t };
}
```

### Task 2.5: Implement StrafePath.start() and getPointAtTime()

**Lines:** 231-255

**Implementation:**
```typescript
// In start() method (line 231):
start(startX: number, startY: number): void {
  super.start(startX, startY);

  // Calculate midpoint for phase transition
  this.midX = startX > GAME_WIDTH/2 ? 100 : GAME_WIDTH - 100;
  this.midY = startY;
}

// In getPointAtTime() method (line 238):
getPointAtTime(t: number): { x: number; y: number; t: number } {
  if (t < 0.5) {
    // Phase 1: Horizontal strafe
    const phaseT = t * 2; // 0-1 for first half
    const x = this.startX + (this.midX - this.startX) * phaseT;
    const y = this.startY;
    return { x, y, t };
  } else {
    // Phase 2: Vertical dive
    const phaseT = (t - 0.5) * 2; // 0-1 for second half
    const x = this.midX;
    const y = this.midY + (GAME_HEIGHT - this.midY) * phaseT;
    return { x, y, t };
  }
}
```

### Task 2.6: Implement createRandomAttackPath()

**Lines:** 261-276

**Implementation:**
```typescript
export function createRandomAttackPath(): AttackPath {
  const patterns = [DiveBombPath, LoopPath, WeavePath, SwoopPath, StrafePath];
  const weights = [0.3, 0.15, 0.25, 0.2, 0.1]; // Probability distribution

  // Weighted random selection
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return new patterns[i]();
    }
  }

  return new DiveBombPath(); // Fallback
}
```

**Remove:** All `throw new Error(...)` statements from all path classes

**Testing:**
- Create test scene to visualize each path type
- Verify paths complete correctly (isComplete() returns true)
- Verify math produces smooth curves
- Test weighted random selection produces variety

---

## Phase 3: Implement WaveManager

**File:** `src/systems/WaveManager.ts`

**Status:** Skeleton exists with comprehensive TODOs

**Dependencies:**
- Phase 1 complete (Alien.followPath())
- Phase 2 complete (AttackPath classes)

### Task 3.1: Implement update() method

**Lines:** 64-88

**Implementation:**
```typescript
update(delta: number): void {
  // Update all active waves
  for (const wave of this.activeWaves) {
    for (const alien of wave.aliens) {
      if (alien.getState() === AlienState.ATTACKING) {
        alien.followPath(delta);
        if (alien.getAttackPath()?.isComplete()) {
          this.startReturnToFormation(alien);
        }
      } else if (alien.getState() === AlienState.RETURNING) {
        this.updateReturnToFormation(alien, delta);
      }
    }
  }

  // Launch new wave if ready
  if (this.shouldLaunchWave()) {
    this.launchWave();
  }

  // Clean up completed waves
  this.cleanupCompletedWaves();
}
```

### Task 3.2: Implement shouldLaunchWave()

**Lines:** 93-111

**Implementation:**
```typescript
private shouldLaunchWave(): boolean {
  const now = Date.now();
  const timeSinceLastWave = now - this.lastWaveTime;
  const interval = Phaser.Math.Between(
    GALAGA_WAVE_MIN_INTERVAL,
    GALAGA_WAVE_MAX_INTERVAL
  );

  return this.activeWaves.length < GALAGA_MAX_SIMULTANEOUS_WAVES &&
         timeSinceLastWave > interval &&
         this.getBottomRowAliens().length > 0;
}
```

### Task 3.3: Implement launchWave()

**Lines:** 116-143

**Implementation:**
```typescript
private launchWave(): void {
  // 1. Determine wave size (random between MIN/MAX)
  const waveSize = Phaser.Math.Between(
    GALAGA_WAVE_MIN_SIZE,
    GALAGA_WAVE_MAX_SIZE
  );

  // 2. Select aliens from bottom row
  const selectedAliens = this.selectBottomRowAliens(waveSize);

  if (selectedAliens.length === 0) return;

  // 3. For each alien:
  for (const alien of selectedAliens) {
    // Record formation position
    alien.setFormationPosition(alien.x, alien.y);

    // Create attack path
    const path = createRandomAttackPath();

    // Start path
    path.start(alien.x, alien.y);

    // Assign to alien
    alien.setAttackPath(path);

    // Set state
    alien.setState(AlienState.ATTACKING);
  }

  // 4. Track wave
  this.activeWaves.push({
    aliens: selectedAliens,
    launchTime: Date.now(),
    active: true
  });
  this.lastWaveTime = Date.now();
}
```

### Task 3.4: Implement getBottomRowAliens()

**Lines:** 148-157

**Implementation:**
```typescript
private getBottomRowAliens(): Alien[] {
  const bottomRow = this.grid.getAliveAliens().filter(alien =>
    alien.getGridPosition().row === this.grid.rows - 1 &&
    alien.getState() === AlienState.IN_FORMATION
  );
  return bottomRow;
}
```

### Task 3.5: Implement selectBottomRowAliens()

**Lines:** 162-173

**Implementation:**
```typescript
private selectBottomRowAliens(count: number): Alien[] {
  const available = this.getBottomRowAliens();
  const selected: Alien[] = [];

  // Random selection without duplicates
  for (let i = 0; i < Math.min(count, available.length); i++) {
    const randomIndex = Phaser.Math.Between(0, available.length - 1);
    selected.push(available.splice(randomIndex, 1)[0]);
  }

  return selected;
}
```

### Task 3.6: Implement startReturnToFormation()

**Lines:** 178-182

**Implementation:**
```typescript
private startReturnToFormation(alien: Alien): void {
  alien.setState(AlienState.RETURNING);
  console.log('[WaveManager] Alien starting return to formation');
}
```

### Task 3.7: Implement updateReturnToFormation()

**Lines:** 187-207

**Implementation:**
```typescript
private updateReturnToFormation(alien: Alien, delta: number): void {
  const target = alien.getFormationPosition();
  const speed = GALAGA_RETURN_SPEED * (delta / 1000);

  const dx = target.x - alien.x;
  const dy = target.y - alien.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 5) {
    // Arrived - snap to exact position
    alien.setPosition(target.x, target.y);
    alien.setState(AlienState.IN_FORMATION);
    console.log('[WaveManager] Alien returned to formation');
  } else {
    // Move toward formation
    const nx = dx / distance; // Normalize
    const ny = dy / distance;
    alien.move(nx * speed, ny * speed);
  }
}
```

### Task 3.8: Implement cleanupCompletedWaves()

**Lines:** 212-222

**Implementation:**
```typescript
private cleanupCompletedWaves(): void {
  this.activeWaves = this.activeWaves.filter(wave => {
    const hasActive = wave.aliens.some(alien =>
      alien.isAlive() &&
      (alien.getState() === AlienState.ATTACKING ||
       alien.getState() === AlienState.RETURNING)
    );
    return hasActive;
  });
}
```

**Remove:** All `throw new Error(...)` statements

**Testing:**
- Verify waves launch at correct intervals
- Verify aliens follow paths and return to formation
- Verify multiple simultaneous waves work correctly
- Verify cleanup removes completed waves

---

## Phase 4: Implement GalagaGrid

**File:** `src/entities/GalagaGrid.ts`

**Status:** Skeleton exists

**Dependencies:**
- Phase 3 complete (WaveManager)
- BaseAlienGrid must be completed (Phase 5)

### Task 4.1: Fix constructor

**Lines:** 34-55

**Implementation:**
```typescript
constructor(
  scene: Phaser.Scene,
  x: number,
  y: number,
  rows: number,
  cols: number,
  formationSpeed: number,
  faceTextures: string[] = [],
  level: number = 1
) {
  super(scene, x, y, rows, cols, faceTextures, level);

  this.formationSpeed = formationSpeed;

  // Create WaveManager instance
  this.waveManager = new WaveManager(this, scene);

  // Create alien grid using base class method
  this.createAlienGrid(rows, cols);
}
```

**Remove:** The `throw new Error(...)` line

### Task 4.2: Implement update() method

**Lines:** 70-86

**Implementation:**
```typescript
update(delta: number): void {
  // Calculate smooth movement
  const movement = this.formationSpeed * this.direction * (delta / 1000);

  // Check edge collision and reverse if needed
  if (this.checkEdgeCollision()) {
    this.direction *= -1;
  }

  // Move only aliens in formation
  for (const alien of this.getAliensInFormation()) {
    alien.move(movement, 0);
  }

  // Update wave manager
  this.waveManager.update(delta);

  // Drop bombs
  this.dropBombs();
}
```

**Remove:** The `throw new Error(...)` line

### Task 4.3: Implement getAliensInFormation()

**Lines:** 91-95

**Implementation:**
```typescript
private getAliensInFormation(): Alien[] {
  return this.getAliveAliens().filter(alien =>
    alien.getState() === AlienState.IN_FORMATION
  );
}
```

**Testing:**
- Verify smooth side-to-side movement
- Verify edge detection and reversal
- Verify only IN_FORMATION aliens move with grid
- Verify wave manager integration works
- Verify bombs still drop correctly

---

## Phase 5: Extract BaseAlienGrid

**File:** `src/entities/BaseAlienGrid.ts`

**Status:** Abstract skeleton exists

**Dependencies:** Must understand SpaceInvadersGrid implementation

### Task 5.1: Extract shared logic from SpaceInvadersGrid

**Current file:** `src/entities/SpaceInvadersGrid.ts`

**Goal:** Move common functionality to BaseAlienGrid, keep Space Invaders-specific logic in SpaceInvadersGrid

**Shared methods to extract (implement in BaseAlienGrid):**
1. `createAlienGrid(rows: number, cols: number)` - Grid initialization
2. `getAliveAliens()` - Filter alive aliens
3. `checkEdgeCollision()` - Detect grid hitting edges
4. `dropBombs()` - Random bomb dropping logic
5. `removeAlien(alien: Alien)` - Remove destroyed alien
6. `getAlienCount()` - Count alive aliens
7. Grid traversal and positioning math

**Steps:**
1. Read `SpaceInvadersGrid.ts` completely
2. Identify methods that both grid types need
3. Move those methods to BaseAlienGrid (change to `protected` where needed)
4. Keep Space Invaders-specific step-based movement in SpaceInvadersGrid
5. Test that SpaceInvadersGrid still works correctly

**Testing:**
- Space Invaders mode must work exactly as before
- No regressions in existing functionality

---

## Phase 6: Complete GameScene Mode Switching

**File:** `src/scenes/GameScene.ts`

**Status:** Skeleton methods exist (from user/linter modifications), need implementation

**Dependencies:** All previous phases complete

### Task 6.1: Implement switchGameMode()

**Find method around line ~800-900** (added by user/linter)

**Implementation structure:**
```typescript
private switchGameMode(newMode: GameMode): void {
  console.log(`[GameScene] Switching to ${getGameModeName(newMode)}`);

  // Clean up current grid
  this.alienGrid?.destroy();

  // Reset level counter
  this.levelsSinceLastSwitch = 0;

  // Create new grid based on mode
  if (newMode === GameMode.SPACE_INVADERS) {
    this.alienGrid = new SpaceInvadersGrid(
      this,
      GAME_WIDTH / 2,
      150,
      5,
      11,
      ['face1', 'face2', 'face3'],
      this.level
    );
  } else if (newMode === GameMode.GALAGA) {
    this.alienGrid = new GalagaGrid(
      this,
      GAME_WIDTH / 2,
      150,
      3,
      11,
      GALAGA_FORMATION_SPEED,
      ['face1', 'face2', 'face3'],
      this.level
    );
  }

  this.currentGameMode = newMode;

  // Show mode change notification
  this.showModeChangeNotification(newMode);
}
```

### Task 6.2: Implement checkAutoSwitch()

**Called from:** `onWaveCleared()`

**Implementation:**
```typescript
private checkAutoSwitch(): void {
  this.levelsSinceLastSwitch++;

  if (this.levelsSinceLastSwitch >= AUTO_SWITCH_INTERVAL) {
    const nextMode = this.currentGameMode === GameMode.SPACE_INVADERS
      ? GameMode.GALAGA
      : GameMode.SPACE_INVADERS;
    this.switchGameMode(nextMode);
  }
}
```

### Task 6.3: Implement forceGameMode()

**Keyboard handler for manual mode switching**

**Implementation:**
```typescript
private forceGameMode(mode: GameMode): void {
  if (!ENABLE_MANUAL_MODE_SWITCH) {
    console.log('[GameScene] Manual mode switching is disabled');
    return;
  }

  if (mode === this.currentGameMode) {
    console.log(`[GameScene] Already in ${getGameModeName(mode)} mode`);
    return;
  }

  this.switchGameMode(mode);
}
```

### Task 6.4: Add keyboard handlers in create()

**Add to existing keyboard setup:**
```typescript
// Manual mode switching (for testing)
if (ENABLE_MANUAL_MODE_SWITCH) {
  this.input.keyboard?.on('keydown-ONE', () => {
    this.forceGameMode(GameMode.SPACE_INVADERS);
  });

  this.input.keyboard?.on('keydown-TWO', () => {
    this.forceGameMode(GameMode.GALAGA);
  });
}
```

### Task 6.5: Create showModeChangeNotification()

**Helper method for visual feedback:**
```typescript
private showModeChangeNotification(mode: GameMode): void {
  const text = this.add.text(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    getGameModeName(mode),
    {
      fontSize: '48px',
      color: '#00ff00',
      fontFamily: 'monospace'
    }
  ).setOrigin(0.5);

  this.tweens.add({
    targets: text,
    alpha: 0,
    scale: 1.5,
    duration: 2000,
    onComplete: () => text.destroy()
  });
}
```

### Task 6.6: Update onWaveCleared()

**Add auto-switch check:**
```typescript
private onWaveCleared(): void {
  // Existing level up logic...

  // Check if should auto-switch modes
  this.checkAutoSwitch();

  // Continue with next wave...
}
```

**Testing:**
- Verify auto-switch works after 5 levels (or configured interval)
- Verify manual switching with 1/2 keys works
- Verify mode transition is smooth
- Verify grid properly recreated with correct parameters

---

## Phase 7: Testing & Polish

### Task 7.1: Create Path Visualization Debug Scene

**Create:** `src/scenes/debug/PathTestScene.ts`

**Purpose:** Visualize all 5 attack paths

**Features:**
- Draw each path type with graphics
- Show path start/control/end points
- Animate alien following each path
- Cycle through all path types

### Task 7.2: Balance Testing

**Test scenarios:**
- Play through 10 levels each mode
- Verify difficulty scales appropriately
- Verify wave frequency feels good
- Adjust constants as needed:
  - `GALAGA_WAVE_MIN/MAX_INTERVAL`
  - `GALAGA_WAVE_MIN/MAX_SIZE`
  - `GALAGA_ATTACK_SPEED`
  - `GALAGA_RETURN_SPEED`
  - `GALAGA_FORMATION_SPEED`

### Task 7.3: Edge Case Testing

**Test:**
- Alien destroyed while ATTACKING
- Alien destroyed while RETURNING
- All bottom row aliens already attacking (no aliens for new wave)
- Wave cleared while aliens still attacking
- Mode switch during active waves
- Rapid mode switching (press 1, 2, 1, 2 quickly)

---

## Dependencies Graph

```
Phase 1 (Alien.followPath)
  ↓
Phase 2 (AttackPath classes) ← Independent, can be done in parallel
  ↓
Phase 3 (WaveManager)
  ↓
Phase 5 (BaseAlienGrid) ← Can be done in parallel with Phase 3
  ↓
Phase 4 (GalagaGrid) ← Depends on Phases 3 & 5
  ↓
Phase 6 (GameScene integration)
  ↓
Phase 7 (Testing & Polish)
```

## Optimal Task Order for Parallel Work

**Sprint 1 (Can be done in parallel):**
- Phase 1: Alien.followPath()
- Phase 2: All 5 AttackPath classes
- Phase 5: BaseAlienGrid extraction

**Sprint 2 (Sequential):**
- Phase 3: WaveManager (depends on Phase 1 & 2)
- Phase 4: GalagaGrid (depends on Phase 3 & 5)

**Sprint 3 (Final integration):**
- Phase 6: GameScene mode switching
- Phase 7: Testing & polish

---

## Key Files Reference

### Constants
- `src/constants.ts` - All Galaga-related constants defined

### Type Definitions
- `src/types/GameMode.ts` - GameMode enum and helpers
- `src/entities/Alien.ts` - AlienState enum (lines 29-34)

### Core Entities
- `src/entities/Alien.ts` - Lines 276-288 need implementation
- `src/entities/BaseAlienGrid.ts` - Abstract base, needs extraction work
- `src/entities/SpaceInvadersGrid.ts` - Source for shared logic extraction
- `src/entities/GalagaGrid.ts` - Lines 34-95 need implementation

### Systems
- `src/systems/AttackPath.ts` - Lines 100-276 need implementation
- `src/systems/WaveManager.ts` - Lines 64-222 need implementation

### Scenes
- `src/scenes/GameScene.ts` - Mode switching methods need implementation

---

## Success Criteria

The implementation is complete when:

1. ✅ All `throw new Error('TODO: ...')` statements removed
2. ✅ Space Invaders mode works exactly as before (no regressions)
3. ✅ Galaga mode shows smooth side-to-side formation movement
4. ✅ Aliens attack in waves following curved paths
5. ✅ Aliens return to formation after completing attack
6. ✅ Multiple simultaneous waves work correctly
7. ✅ Auto-switch between modes works after configured interval
8. ✅ Manual mode switching with 1/2 keys works
9. ✅ No console errors during gameplay
10. ✅ All TypeScript compilation errors resolved

---

## Notes for Coding Agents

- **Don't over-engineer:** Implement exactly what's specified, no extra features
- **Test incrementally:** Test each phase before moving to the next
- **Preserve existing behavior:** Space Invaders mode must work identically to before
- **Follow the math:** The skeleton files contain correct formulas - use them
- **Check dependencies:** Don't implement Phase 4 before Phase 3 is complete
- **Use the constants:** All configurable values are in constants.ts
- **Console logging:** Keep the debug console.log statements for debugging

---

**Document Version:** 1.0
**Created:** 2025-12-26
**Last Updated:** 2025-12-26
