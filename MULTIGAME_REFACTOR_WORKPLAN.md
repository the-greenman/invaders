# Multi-Game Architecture Refactor - Workplan

**Branch:** `feature/multigame-refactor`
**Base:** `galaga`
**Estimated Total Time:** 11-15 hours
**Goal:** Refactor single GameScene into multi-mode architecture with difficulty system

---

## Overview

This workplan breaks down the multi-game architecture refactor into discrete, agentic tasks that can be executed sequentially or in parallel where dependencies allow.

### Objectives
1. Extract shared logic into `BaseGameScene` abstract class
2. Create mode-specific scenes (`SpaceInvadersScene`, `GalagaScene`)
3. Implement standardized difficulty system (Easy/Medium/Hard/Extreme)
4. Enable easy addition of future game modes (side-scrollers, Pac-Man, etc.)
5. Maintain all existing functionality with zero behavioral changes

---

## Stage 1: Foundation (4-5 hours)

### Task 1.1: Create Difficulty Type System
**File:** `src/types/DifficultyPreset.ts` (NEW)
**Dependencies:** None
**Agent Type:** Implementation
**Estimated Time:** 15 minutes

**Requirements:**
- Create `DifficultyPreset` enum with EASY, MEDIUM, HARD, EXTREME values
- Create `getDifficultyName()` helper function
- Export both for use across codebase

**Acceptance Criteria:**
- [x] Enum defined with all 4 difficulty levels
- [x] Helper function returns correct display names
- [x] File compiles with no TypeScript errors
- [x] Build passes

**Code Reference:** See plan lines 1017-1033

---

### Task 1.2: Create Difficulty Configuration System
**File:** `src/types/DifficultyConfig.ts` (NEW)
**Dependencies:** Task 1.1
**Agent Type:** Implementation
**Estimated Time:** 30 minutes

**Requirements:**
- Create `DifficultyMultipliers` interface with all multiplier properties
- Define `DIFFICULTY_CONFIGS` constant with configs for all 4 presets
- All multipliers must affect: speed, bombs, waves, rows, progression, points

**Acceptance Criteria:**
- [x] Interface includes all required multiplier fields
- [x] All 4 difficulty presets defined with balanced values
- [x] EASY: slower/easier, MEDIUM: baseline, HARD: faster/harder, EXTREME: maximum challenge
- [x] File compiles with no TypeScript errors
- [x] Build passes

**Code Reference:** See plan lines 1042-1119

---

### Task 1.3: Update LevelConfig Interface
**File:** `src/types.ts` (MODIFIED - already contains required fields)
**Dependencies:** None (parallel with 1.1-1.2)
**Agent Type:** Implementation
**Estimated Time:** 10 minutes

**Requirements:**
- Add new Galaga wave parameters to interface:
  - `galagaWaveMinSize: number`
  - `galagaWaveMaxSize: number`
  - `galagaMaxSimultaneousWaves: number`

**Acceptance Criteria:**
- [x] Three new fields added to interface
- [x] All fields properly typed as `number`
- [x] File compiles with no TypeScript errors
- [x] Build passes

**Code Reference:** See plan lines 1206-1221

---

### Task 1.4: Update LevelManager for Difficulty [TRACK A - CRITICAL PATH] 
**Branch:** `feature/task-1-4-levelmanager` (merged)
**File:** `src/managers/LevelManager.ts` (MODIFIED)
**Dependencies:** Tasks 1.1, 1.2, 1.3 
**Agent Type:** Implementation
**Estimated Time:** 1 hour
**Unblocked:** Tasks 1.5, 3.1

**Requirements:**
- Import `DifficultyPreset` and `DIFFICULTY_CONFIGS`
- Add constructor parameter `difficulty: DifficultyPreset = DifficultyPreset.MEDIUM`
- Store difficulty and config as private properties
- Apply multipliers to all formulas in `getLevelConfig()`:
  - alienRows: Use `startingRows` and `rowScalingRate`
  - alienSpeed: Apply `speedMultiplier` and `levelScalingMultiplier`
  - bombFrequency: Apply `bombFrequencyMultiplier`
  - alienPointsMultiplier: Apply `pointsMultiplier`
  - galagaFormationSpeed: Apply `speedMultiplier`
  - galagaWaveFrequency: Apply `waveIntervalMultiplier` (inverted)
  - galagaWaveMinSize/MaxSize: Apply `waveSizeMultiplier`
  - galagaMaxSimultaneousWaves: Use `maxSimultaneousWaves`
- Add `getDifficulty()` and `setDifficulty()` methods

**Acceptance Criteria:**
- [x] Constructor accepts difficulty parameter
- [x] All formulas apply appropriate multipliers
- [x] New wave parameters calculated and returned
- [x] Getter and setter methods implemented
- [x] File compiles with no TypeScript errors
- [x] Build passes

**Code Reference:** See plan lines 1133-1197

---

### Task 1.5: Extract BaseGameScene Abstract Class [TRACK A]
**File:** `src/scenes/base/BaseGameScene.ts` (NEW)
**Dependencies:** Task 1.4
**Agent Type:** Implementation
**Estimated Time:** 2-3 hours
**Enables:** Tasks 2.1, 2.2, 4.2

**Requirements:**
- Create abstract base class extending `Phaser.Scene`
- Extract ALL shared state from GameScene:
  - score, level, lives, gameActive
  - All manager references (score, audio, level, touch, face)
  - Physics groups (bullets, bombs, enemies)
  - Core UI text elements
  - Input handling state
- Define abstract template methods:
  - `createPlayer(): void`
  - `createEnemies(): void`
  - `setupCollisions(): void`
  - `createModeUI(): void`
  - `createBackground(): void`
  - `checkGameConditions(): void`
  - `onLevelComplete(): void`
  - `onGameOver(): void`
  - `updateMode(delta: number): void`
- Implement shared methods:
  - `create(): Promise<void>` (template method pattern)
  - `update(time, delta): void` (calls updateMode)
  - `loadSceneData(): void`
  - `initializeManagers(): void` (pass difficulty to LevelManager)
  - `setupInput(): void`
  - `createCoreUI(): void`
  - `addScore(points): void`
  - `updateScoreDisplay(): void`
  - `loseLife(): void`
  - `advanceLevel(): void`
  - `pauseGame(): void`
  - `resumeGame(): void`
- Add difficulty property and preserve it in mode switching

**Acceptance Criteria:**
- [ ] All shared logic extracted from GameScene
- [ ] All abstract methods defined with clear documentation
- [ ] Template method pattern correctly implemented
- [ ] Difficulty integrated into manager initialization
- [ ] File compiles with no TypeScript errors
- [ ] Build may fail (no concrete scenes yet - expected)

**Code Reference:** See plan lines 71-233

---

## Stage 2: Scene Migration (3-4 hours)

### Task 2.1: Create SpaceInvadersScene [TRACK C]
**File:** `src/scenes/modes/SpaceInvadersScene.ts` (NEW)
**Dependencies:** Task 1.5
**Agent Type:** Implementation
**Estimated Time:** 1.5-2 hours
**Parallel with:** Task 2.2

**Requirements:**
- Extend `BaseGameScene`
- Implement all abstract methods:
  - `createPlayer()`: Create Player at bottom center
  - `createEnemies()`: Create SpaceInvadersGrid with level config
  - `setupCollisions()`:
    - Bullet vs Alien (shared logic)
    - Bomb vs Player (shared logic)
    - **Alien vs Player = instant game over** (Space Invaders specific)
  - `createBackground()`: Draw abduction threshold line
  - `createModeUI()`: No additional UI needed
  - `checkGameConditions()`: Check aliens destroyed or reached player
  - `onLevelComplete()`: Show completion text, check mode switch
  - `onGameOver()`: Transition to GameOverScene
  - `updateMode(delta)`: Update player and alienGrid
- Handle collision callbacks (bullet-alien, bomb-player)
- Support manual mode switching (preserve from GameScene)

**Acceptance Criteria:**
- [ ] Scene extends BaseGameScene correctly
- [ ] All abstract methods implemented
- [ ] Space Invaders-specific collision (alien-player = game over) working
- [ ] Abduction threshold line visible
- [ ] Level progression works
- [ ] Mode switching preserved
- [ ] File compiles with no TypeScript errors
- [ ] Build passes

**Code Reference:** See plan lines 245-327

---

### Task 2.2: Create GalagaScene [TRACK C]
**File:** `src/scenes/modes/GalagaScene.ts` (NEW)
**Dependencies:** Task 1.5
**Agent Type:** Implementation (parallel with 2.1)
**Estimated Time:** 1.5-2 hours
**Parallel with:** Task 2.1

**Requirements:**
- Extend `BaseGameScene`
- Implement all abstract methods:
  - `createPlayer()`: Create Player at bottom center
  - `createEnemies()`: Create GalagaGrid with level config (3 rows fixed)
  - `setupCollisions()`:
    - Bullet vs Alien (shared logic)
    - Bomb vs Player (shared logic)
    - **Alien vs Player = crash, lose life** (Galaga specific)
  - `createBackground()`: Create animated clouds
  - `createModeUI()`: Create wave count display
  - `checkGameConditions()`: Check aliens destroyed only (no abduction)
  - `onLevelComplete()`: Show completion text, check mode switch
  - `onGameOver()`: Transition to GameOverScene
  - `updateMode(delta)`: Update player, alienGrid, wave count UI
- Handle collision callbacks
- Animate cloud background
- Support manual mode switching

**Acceptance Criteria:**
- [ ] Scene extends BaseGameScene correctly
- [ ] All abstract methods implemented
- [ ] Galaga-specific collision (alien-player = crash, lose life) working
- [ ] Animated clouds visible and moving
- [ ] Wave count displays correctly
- [ ] Level progression works
- [ ] Mode switching preserved
- [ ] File compiles with no TypeScript errors
- [ ] Build passes

**Code Reference:** See plan lines 337-441

---

### Task 2.3: Update Scene Registry
**File:** `src/main.ts` or game config
**Dependencies:** Tasks 2.1, 2.2
**Agent Type:** Implementation
**Estimated Time:** 15 minutes

**Requirements:**
- Add `SpaceInvadersScene` to scene array
- Add `GalagaScene` to scene array
- Keep old `GameScene` temporarily for testing
- Ensure scene keys match expected values

**Acceptance Criteria:**
- [ ] Both new scenes registered
- [ ] Scene keys correct ('SpaceInvadersScene', 'GalagaScene')
- [ ] Build passes
- [ ] Game can start (even if not fully functional yet)

---

## Stage 3: Difficulty Scaling (2-3 hours)

### Task 3.1: Update WaveManager for Configurable Waves [TRACK B]
**File:** `src/systems/WaveManager.ts` (MODIFY)
**Dependencies:** Task 1.4
**Agent Type:** Implementation
**Estimated Time:** 45 minutes
**Parallel with:** Can start after 1.4, parallel to 1.5

**Requirements:**
- Update constructor to accept optional config object:
  ```typescript
  config: {
    minInterval?: number;
    maxInterval?: number;
    minSize?: number;
    maxSize?: number;
    maxWaves?: number;
  } = {}
  ```
- Store as private properties with fallback to constants
- Use stored values in `shouldLaunchWave()` and `launchWave()`

**Acceptance Criteria:**
- [ ] Constructor accepts config parameter
- [ ] All wave parameters configurable
- [ ] Falls back to constants if not provided
- [ ] Wave launching uses configured values
- [ ] File compiles with no TypeScript errors
- [ ] Build passes

**Code Reference:** See plan lines 1234-1289

---

### Task 3.2: Update GalagaGrid to Pass Wave Config [TRACK B]
**File:** `src/entities/GalagaGrid.ts` (MODIFY)
**Dependencies:** Task 3.1
**Agent Type:** Implementation
**Estimated Time:** 30 minutes

**Requirements:**
- Update constructor to accept optional `waveConfig` parameter
- Pass waveConfig to WaveManager constructor
- Config should come from LevelConfig in GalagaScene

**Acceptance Criteria:**
- [ ] Constructor accepts waveConfig parameter
- [ ] WaveManager receives config
- [ ] File compiles with no TypeScript errors
- [ ] Build passes

**Code Reference:** See plan lines 1303-1333

---

### Task 3.3: Update GalagaScene to Use Wave Config [TRACK B]
**File:** `src/scenes/modes/GalagaScene.ts` (MODIFY)
**Dependencies:** Tasks 2.2, 3.2
**Agent Type:** Implementation
**Estimated Time:** 20 minutes

**Requirements:**
- In `createEnemies()`, pass wave config from levelConfig to GalagaGrid:
  ```typescript
  waveConfig: {
    minSize: levelConfig.galagaWaveMinSize,
    maxSize: levelConfig.galagaWaveMaxSize,
    maxWaves: levelConfig.galagaMaxSimultaneousWaves
  }
  ```

**Acceptance Criteria:**
- [ ] Wave config passed from level config
- [ ] Difficulty-scaled waves working
- [ ] File compiles with no TypeScript errors
- [ ] Build passes

---

### Task 3.4: Create DifficultySelectScene [TRACK B]
**File:** `src/scenes/DifficultySelectScene.ts` (NEW)
**Dependencies:** Task 1.1 ✅
**Agent Type:** Implementation
**Estimated Time:** 1 hour
**Parallel with:** Can start immediately, parallel to 3.1-3.3

**Requirements:**
- Create scene extending `Phaser.Scene`
- Display title "SELECT DIFFICULTY"
- Show 4 difficulty options with hover effects
- Show description for each difficulty
- Handle click to store difficulty and start game
- Integrate with LocalStorage for persistence

**Acceptance Criteria:**
- [ ] Scene displays all 4 difficulties
- [ ] Hover effects work
- [ ] Click starts SpaceInvadersScene with difficulty
- [ ] Difficulty stored in LocalStorage
- [ ] Medium highlighted as default
- [ ] File compiles with no TypeScript errors
- [ ] Build passes

**Code Reference:** See plan lines 1342-1414

---

### Task 3.5: Update Menu Flow [TRACK B]
**File:** `src/scenes/MenuScene.ts` (or equivalent) (MODIFY)
**Dependencies:** Task 3.4
**Agent Type:** Implementation
**Estimated Time:** 20 minutes

**Requirements:**
- Update menu to link to DifficultySelectScene
- Or start game with default difficulty if menu doesn't exist

**Acceptance Criteria:**
- [ ] Menu links to difficulty selection
- [ ] Difficulty flows through to game start
- [ ] Build passes

---

## Stage 4: Integration & Polish (2-3 hours)

### Task 4.1: Update ModeTransitionScene [TRACK C]
**File:** `src/scenes/ModeTransitionScene.ts` (MODIFY)
**Dependencies:** Tasks 2.1, 2.2
**Agent Type:** Implementation
**Estimated Time:** 30 minutes

**Requirements:**
- Update `getSceneKey()` to return correct scene keys:
  - `GameMode.SPACE_INVADERS` → 'SpaceInvadersScene'
  - `GameMode.GALAGA` → 'GalagaScene'
- Preserve difficulty in scene data passed to next scene

**Acceptance Criteria:**
- [ ] Mode transitions work correctly
- [ ] Correct scene keys returned
- [ ] Difficulty preserved across transitions
- [ ] File compiles with no TypeScript errors
- [ ] Build passes

---

### Task 4.2: Update BaseGameScene Mode Switching [TRACK A]
**File:** `src/scenes/base/BaseGameScene.ts` (MODIFY)
**Dependencies:** Task 1.5
**Agent Type:** Implementation
**Estimated Time:** 30 minutes

**Requirements:**
- Implement `shouldAutoSwitch()` logic (track levels since last switch)
- Implement `switchToMode()` to handle transitions
- Implement `forceMode()` for manual keyboard switching (keys 1/2)
- Ensure difficulty preserved in all switches

**Acceptance Criteria:**
- [ ] Auto-switch after N levels works
- [ ] Manual mode switch (keyboard 1/2) works
- [ ] Difficulty preserved across all switches
- [ ] File compiles with no TypeScript errors
- [ ] Build passes

**Code Reference:** See plan lines 449-482

---

### Task 4.3: Remove Old GameScene
**File:** `src/scenes/GameScene.ts` (DELETE)
**Dependencies:** Tasks 2.1, 2.2, 4.1, 4.2
**Agent Type:** Implementation
**Estimated Time:** 20 minutes

**Requirements:**
- Verify both new scenes work correctly
- Remove GameScene.ts file
- Update any imports referencing GameScene
- Remove from scene registry

**Acceptance Criteria:**
- [ ] GameScene.ts deleted
- [ ] No imports reference GameScene
- [ ] Scene registry updated
- [ ] Build passes with no errors
- [ ] All tests pass

---

### Task 4.4: Comprehensive Testing
**Dependencies:** All previous tasks
**Agent Type:** Testing
**Estimated Time:** 1-2 hours

**Requirements:**
- Test Space Invaders mode (all difficulties)
- Test Galaga mode (all difficulties)
- Test mode switching (auto and manual)
- Test difficulty persistence across scenes
- Test wave scaling works
- Test all collisions work correctly
- Test level progression
- Test game over/restart flows
- Verify no regressions

**Acceptance Criteria:**
- [ ] All modes work on all difficulties
- [ ] Mode switching works in both directions
- [ ] Difficulty persists correctly
- [ ] Waves scale with difficulty (visible difference)
- [ ] No gameplay regressions
- [ ] Build passes
- [ ] No console errors

---

### Task 4.5: Update Documentation
**Files:** README.md, GALAGA_TASKS.md, etc.
**Dependencies:** Task 4.4
**Agent Type:** Documentation
**Estimated Time:** 30 minutes

**Requirements:**
- Update README with new architecture overview
- Mark refactor tasks as complete
- Document difficulty system
- Document how to add new game modes

**Acceptance Criteria:**
- [ ] README reflects new architecture
- [ ] Difficulty system documented
- [ ] Instructions for adding new modes included
- [ ] Task tracking updated

---

## Success Criteria (Final Checklist)

After all tasks complete, verify:

- [ ] ✅ Build passes without errors
- [ ] ✅ Space Invaders mode works identically to before
- [ ] ✅ Galaga mode works identically to before
- [ ] ✅ Mode switching works (manual keys 1/2 and auto after N levels)
- [ ] ✅ All 4 difficulty levels work and feel different
- [ ] ✅ Difficulty persists across mode switches
- [ ] ✅ Wave system scales with difficulty
- [ ] ✅ No code duplication between modes
- [ ] ✅ BaseGameScene has no mode-specific logic
- [ ] ✅ Adding new mode requires only creating new scene file
- [ ] ✅ All existing features preserved (webcam faces, touch controls, etc.)

---

## Rollback Plan

If issues arise:
1. Current state preserved in `galaga` branch
2. Can cherry-pick individual tasks if needed
3. Incremental commits allow reverting specific changes
4. Keep old GameScene until both new scenes verified

---

## Parallelization Strategy

### Track-Based Execution
**Track A: Core Architecture (Agent 1)**
- 1.4: LevelManager → 1.5: BaseGameScene → 4.2: Mode Switching

**Track B: Difficulty Scaling (Agent 2)**
- 3.1: WaveManager → 3.2: GalagaGrid → 3.3: GalagaScene → 3.4: DifficultySelectScene → 3.5: Menu Flow

**Track C: Scene Migration (Agent 3)**
- 2.1: SpaceInvadersScene → 2.2: GalagaScene → 2.3: Scene Registry → 4.1: ModeTransitionScene

### Parallel Execution Windows
1. **After Task 1.4 completes**: Tracks A, B, and C can run in parallel
2. **Tasks 2.1 & 2.2**: Can run simultaneously (both depend only on 1.5)
3. **Tasks 3.1 & 3.4**: Can run simultaneously (different systems)
4. **Critical Path**: 1.4 → 1.5 → 2.1/2.2 → 2.3 → 4.3 → 4.4

### Agent Allocation Strategy
- **3 Agents Optimal**: Reduces total time to 5-7 hours
- **2 Agents**: Combine Tracks B & C after 1.4 (7-9 hours)
- **1 Agent**: Sequential execution (11-15 hours)

---

## Task Dependencies Diagram

```
Stage 1 (Foundation):
1.1 (DifficultyPreset) → 1.2 (DifficultyConfig) → 1.4 (LevelManager)
                                                      ↓
1.3 (LevelConfig) ────────────────────────────────→ 1.4
                                                      ↓
                                                    1.5 (BaseGameScene)

Stage 2 (Scenes):
1.5 → 2.1 (SpaceInvadersScene) → 2.3 (Registry)
   ↘
     2.2 (GalagaScene) ────────→ 2.3

Stage 3 (Difficulty):
1.4 → 3.1 (WaveManager) → 3.2 (GalagaGrid) → 3.3 (GalagaScene update)
1.1 → 3.4 (DifficultySelectScene) → 3.5 (Menu)

Stage 4 (Integration):
2.1, 2.2 → 4.1 (ModeTransitionScene)
1.5 → 4.2 (BaseGameScene mode switching)
All → 4.3 (Remove GameScene) → 4.4 (Testing) → 4.5 (Docs)
```

---

## Parallelization Opportunities

Tasks that can run in parallel:
- **1.1, 1.2, 1.3** ✅ COMPLETED (different files, no dependencies)
- **2.1, 2.2** (both extend BaseGameScene, independent implementations)
- **3.1, 3.4** (different systems, no shared dependencies)
- **After 1.4**: Tracks A, B, and C can execute simultaneously

---

## Estimated Timeline

**Sequential (single agent):** 11-15 hours
**Parallel (3 agents):** 5-7 hours
**Parallel (2 agents):** 7-9 hours

**Breakdown by Stage:**
- Stage 1: 4-5 hours (1.4 remaining)
- Stage 2: 3-4 hours (can parallelize)
- Stage 3: 2-3 hours (can parallelize)
- Stage 4: 2-3 hours

---

## Notes

- Commit frequently (after each task or sub-task)
- Run build after each task to catch errors early
- Test incrementally (don't wait until end)
- Keep old GameScene until Stage 4.3 for reference
- Preserve all existing functionality - zero behavioral changes allowed
- Focus on extracting/moving code, not rewriting logic
