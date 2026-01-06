# Pac-Ship Rescue Scene (Pac-Man Style) — Plan

**Game Mode 3** — Triggered after surviving the Galaga levels.

## 1. High-level concept

After defeating the Galaga waves, the player boards the alien mothership to rescue their abducted friends. Gameplay shifts to a Pac-Man-like maze where you navigate corridors, free abducted friends, and clear aliens from the ship.

**Narrative flow:**
1. **Space Invaders** (Mode 1) — Defend Earth
2. **Galaga** (Mode 2) — Counterattack in the sky
3. **Pac-Ship Rescue** (Mode 3) — Board the mothership, rescue friends
   - This mode is a **campaign of multiple levels**.
   - **Goal**: Rescue *all* faces stored in the face history (up to 10).
   - **Progression**: Faces are split into batches (e.g. 4 per level). You must complete enough maze levels to rescue everyone.
   - **Finale**: Once all faces are rescued, the game loops back to Mode 1 (Loop 2) with higher difficulty, or shows a Victory Screen.

- **Player**: Pac-Man-like movement (grid/corridor based). The player sprite uses the same face system, but gains a **Pac-Man mouth** (animated open/close).
- **Aliens**: Use the existing captured-face alien sprites, but behave like **Pac-Man ghosts**.
- **Rescue loop**: When you "eat" an alien (while invulnerable), it shouts **"yipee"** and switches to a **flee-to-exit** behavior. Once it reaches an exit, it's removed and counts as a rescue.
- **Sidebar**: A UI panel shows the freed abductees (faces/icons) as you rescue them.

---

## 2. Integration with the existing codebase

### 2.1 New scene entry

- Create a new Phaser scene: `PacShipRescueScene`.
- Register it in `src/config.ts` scene array.
- **Trigger**: After completing the final Galaga wave (or a set number of Galaga levels), transition to `PacShipRescueScene` via an intro/transition scene.
- Scene flow: `GalagaScene` → `PacShipIntroScene` (optional boarding cutscene) → `PacShipRescueScene`.

### 2.2 Shared systems to reuse

| System | Existing Location | Usage in Pac-Ship |
|--------|-------------------|-------------------|
| **ScoreManager** | `src/managers/ScoreManager.ts` | Track score across all modes; pellets, ghost-eat combos |
| **AudioManager** | `src/managers/AudioManager.ts` | Register/play all SFX |
| **SpriteManager** | `src/managers/SpriteManager.ts` | Build alien face textures, player face composite |
| **FaceManager** | `src/managers/FaceManager.ts` | Load/compose face textures for sidebar thumbnails |
| **LevelManager** | `src/managers/LevelManager.ts` | Difficulty-based config (ghost speed, power duration, etc.) |
| **LocalStorage** | `src/utils/localStorage.ts` | `getFaceHistory()` for abductee roster; persist high scores |
| **TouchControlManager** | `src/managers/TouchControlManager.ts` | Reuse for mobile d-pad input |

### 2.3 Scene architecture choice

This scene **should not** extend `BaseGameScene` (which assumes bullets, bombs, shields).

Instead:
- Create a standalone `Phaser.Scene` with its own loop.
- Instantiate shared managers directly (ScoreManager, AudioManager, etc.).
- Implement new shared utilities (LifeManager, InvulnerabilityController) that can later be adopted by shooter modes.

---

## 3. Gameplay design

### 3.1 Core rules

- **Move**: Player moves along corridors (tile/grid-based). Turning is only allowed at intersections.
- **Pellets**: Eating a pellet adds score (standard Pac-Man).
- **Normal collision** (not invulnerable): Player **loses a life** and respawns.
- **Invulnerable collision** ("power" state): Collision is treated as **eating** the alien.
  - The alien shouts **"yipee"** and transitions to `FRIGHTENED` → `FLEE_TO_EXIT`.
  - This invulnerable collision rule is **shared** and reusable across other game modes.
- **Win**: All abductees are freed (all target ghosts have reached an exit). Pellet-clear is **not** required but awards bonus.
- **Lose**: Standard Pac-Man — when `lives` reaches 0.

### 3.2 Scoring (shared via ScoreManager)

Score is **persistent across all game modes** (shooter → pac-ship → shooter). Use the existing `ScoreManager`.

| Event | Points | Notes |
|-------|--------|-------|
| Pellet | 10 | Standard dot |
| Power pellet | 50 | Enables invulnerability |
| Ghost eat (1st) | 200 | Combo resets when power ends |
| Ghost eat (2nd) | 400 | |
| Ghost eat (3rd) | 800 | |
| Ghost eat (4th+) | 1600 | Cap at 1600 |
| All pellets cleared | 1000 | Bonus |
| Level complete | 500 × level | Bonus |

### 3.3 Maze and movement

- Use a tile/grid representation for deterministic Pac-Man-style movement.
- **Wrap tunnels**: Yes — left/right edges wrap around (classic Pac-Man side tunnels).
- Recommended approach:
  - Define maze layout as an ASCII map constant:
    - `#` wall
    - `.` pellet
    - `o` power pellet
    - `E` exit
    - `S` player spawn
    - `G` ghost spawn
    - ` ` empty corridor (no pellet)
    - `T` tunnel entry (wrap point)
  - Convert to:
    - Static physics bodies for walls.
    - A navigation grid for turning rules and ghost AI pathfinding.

### 3.4 Ghost (alien) behaviors

We will use a simplified **Target Tile** system similar to the classic game.

**Movement Rules**:
1.  **Continuous Movement**: Ghosts never stop unless frozen (respawn/level start).
2.  **No Reversals**: Ghosts cannot reverse direction 180° unless entering `FRIGHTENED` mode.
3.  **Intersection Decision**: At every intersection (or corner), the ghost chooses the direction that minimizes the straight-line distance to its current **Target Tile**.

**States & Targets**:

| State | Behavior | Target Tile |
|-------|----------|-------------|
| `SCATTER` | Patrol toward home corner | Fixed corner (unique per ghost ID) |
| `CHASE` | Bias movement toward player | Player's current tile |
| `FRIGHTENED` | Player is invulnerable; moves slower | **Pseudo-random** turn at every intersection |
| `FLEE_TO_EXIT` | After being eaten (eyes only) | **Nearest Exit Tile** (Euclidean distance) |
| `EXITED` | Removed from play | N/A |

**Implementation details**:
- **Tile Center Locking**: Turns only happen when the ghost is close to the center of a tile to ensure grid alignment.
- **Speed**:
    - Normal: Defined by difficulty (e.g., 60-80% player speed).
    - Frightened: Slower (e.g., 50%).
    - Flee to Exit: Very fast (e.g., 150%).

### 3.5 Abductees mapping & Campaign Progression

**The Rescue Campaign**:
- **Source**: `LocalStorage.getFaceHistory()` (e.g., 10 faces).
- **Batching**: Ghosts per level is defined by `DifficultyConfig.pacGhostCount` (e.g., 4).
- **Level Logic**:
  - **Level 1**: Faces 0-3 assigned to ghosts.
  - **Level 2**: Faces 4-7 assigned to ghosts.
  - **Level 3**: Remaining faces (filled with generic aliens if needed to meet count).
- **Campaign Complete**: Triggered when the index of rescued faces equals total faces in history.

**Ghost Assignment**:
- Each ghost alien represents a specific face.
- When that ghost exits, that specific face is "Saved".
- Sidebar shows the faces pending rescue *for the current level*.

### 3.6 Pac-Man power mode (invulnerability) — SHARED

Follow standard Pac-Man mechanics:

- **Trigger**: Player consumes a power pellet tile.
- **Duration**: Configurable via `LevelManager` (default ~6 seconds; scales with difficulty).
- **Near-expiry warning**: Ghosts flash between frightened/normal tint in last 2 seconds.
- **Visual feedback**:
  - Player shows glow or `POWER` label.
  - Ghosts switch to frightened tint (e.g. blue) and flash near expiry.
- **Behavioral change**:
  - Ghosts enter `FRIGHTENED` state.
  - Collision semantics flip to "eat" (see Core rules).

**Shared abstraction** (`InvulnerabilityController`):
```
startInvulnerability(durationMs, reason)
isInvulnerable(): boolean
onExpiringSoon: Event  // for flash warning
onExpired: Event
```
This controller can be reused in shooter modes (e.g. respawn grace, power-up pickups).

### 3.7 Life and respawn — SHARED

Use a **shared LifeManager** (new utility) so all modes have consistent life semantics.

| Aspect | Behavior |
|--------|----------|
| Initial lives | 3 (or passed from previous mode) |
| Lose life trigger | Collision with ghost while not invulnerable |
| Respawn sequence | Freeze all ghosts, respawn player at spawn tile, 2s invulnerability grace |
| Grace invulnerability | Player blinks; collisions during grace = no damage, but also no "eat" |
| Game over | `lives === 0` → transition to GameOverScene (or summary) |

**Shared abstraction** (`LifeManager`):
```
lives: number
loseLife(): void          // triggers respawn sequence
addLife(): void           // for bonuses (e.g. 10k points)
onLifeLost: Event
onGameOver: Event
```

### 3.8 Difficulty scaling

Integrate with existing `LevelManager` / `DifficultyPreset`. **Add new fields to `DifficultyConfig`**:

| Parameter | Config Key | Easy | Medium | Hard | Extreme |
|-----------|------------|------|--------|------|---------|
| Ghost speed | `pacGhostSpeed` | 0.7× | 1.0× | 1.2× | 1.5× |
| Power duration | `pacPowerDuration` | 8s | 6s | 4s | 3s |
| Ghost count (aliens to rescue) | `pacGhostCount` | 3 | 4 | 5 | 6 |
| Scatter duration | `pacScatterDuration` | Long | Medium | Short | Very short |

**Implementation**: Add these to `src/types/DifficultyConfig.ts` so they're configurable per difficulty preset.

---

## 4. Visual and UI plan

### 4.1 Player "mouth"

Two implementation options:

- **Option A (procedural mask)**: Render player composite to `RenderTexture`, apply animated wedge-shaped cutout mask. Mouth direction follows movement.
- **Option B (new SVG)**: Add `pac-player.svg` with face-metadata circle; use existing compositing pipeline.

Recommend **Option A** for faster iteration.

### 4.2 Aliens as ghosts

- **Base sprite**: Use `public/assets/images/Pacman-ghost.svg` (already added).
- Compose faces onto ghost using existing `SpriteManager` pipeline.
- Add a **frightened tint** (blue overlay) when in `FRIGHTENED` state.

### 4.3 Sidebar rescued list

- Reserve right-side panel (~100px wide).
- Display:
  - Header: `RESCUED`
  - Vertical list of circular face thumbnails (small, ~32px).
  - Counter: `X / N`.
- Use `Phaser.GameObjects.Container` + `FaceManager.addBase64Texture()`.

### 4.4 HUD elements (reuse from BaseGameScene)

Reuse as much of the existing HUD as possible from shooter modes:

- **Score**: Top-left — reuse `createCoreUI()` pattern from `BaseGameScene`.
- **Lives**: Top-left below score — reuse existing style.
- **Level**: Top-right — reuse existing style.
- **Game Mode label**: Top-right — show "PAC-SHIP" using same text style.

**New HUD element:**
- **Power countdown**: Visual timer bar when power mode is active.
  - Position: Below lives or center-top.
  - Style: Horizontal bar that shrinks, changes color near expiry (green → yellow → red).
  - Flashes in last 2 seconds to match ghost flash warning.

---

## 5. Audio

### 5.1 Background music

- **File**: `public/assets/sounds/background-pacman.mp3` ✅ (already added)
- **Key**: `background-pacman`

### 5.2 Required SFX (new)

| Key | Description | Notes |
|-----|-------------|-------|
| `pac-pellet` | Pellet eat | **NEW** — short blip sound, create or source |
| `pac-power` | Power pellet consumed | Distinct "power-up" sound |
| `pac-eat-ghost` | Ghost eaten (the "yipee" shout) | Voice clip |
| `pac-death` | Player loses life | Short death jingle |
| `pac-respawn` | Player respawns | Optional |
| `pac-level-complete` | All ghosts rescued | Victory jingle |

### 5.3 Reused SFX

- Potentially reuse `explosion` for dramatic effect
- Reuse UI sounds from menu if needed

---

## 6. Implementation tasks

### Phase 0: Shared utilities (cross-mode)

| Task | Description | New/Modify | Priority |
|------|-------------|------------|----------|
| **T0.1** | Create `src/managers/LifeManager.ts` — shared life tracking, respawn sequence, events | NEW | High |
| **T0.2** | Create `src/managers/InvulnerabilityController.ts` — timer-driven invulnerability state, events | NEW | High |
| **T0.3** | Extend `ScoreManager` if needed for combo tracking (ghost eat multiplier) | MODIFY | Medium |
| **T0.4** | Add pac-mode fields to `src/types/DifficultyConfig.ts` (`pacGhostSpeed`, `pacPowerDuration`, `pacGhostCount`, `pacScatterDuration`) | MODIFY | High |
| **T0.5** | Update `LevelManager.getLevelConfig()` to return pac-mode config values | MODIFY | Medium |

### Phase 1: Scene scaffold

| Task | Description | New/Modify | Priority |
|------|-------------|------------|----------|
| **T1.1** | Create `src/scenes/PacShipRescueScene.ts` — empty scene, register in `config.ts` | NEW | High |
| **T1.2** | Define maze ASCII map constant (walls, pellets, power pellets, exits, spawns, tunnels) | NEW | High |
| **T1.3** | Build maze renderer: convert ASCII → tile sprites + static wall bodies | NEW | High |
| **T1.4** | Implement wrap tunnels (teleport at tunnel tiles) | NEW | Medium |
| **T1.5** | Create navigation grid for pathfinding / turning rules | NEW | High |

### Phase 2: Player entity

| Task | Description | New/Modify | Priority |
|------|-------------|------------|----------|
| **T2.1** | Create `src/entities/PacPlayer.ts` — tile-based movement, turn buffering | NEW | High |
| **T2.2** | Integrate input: keyboard, controller, touch (reuse `TouchControlManager`) | NEW | High |
| **T2.3** | Implement Pac-Man mouth animation (procedural mask or sprite swap) | NEW | Medium |
| **T2.4** | Wire up `LifeManager` + `InvulnerabilityController` to player | NEW | High |

### Phase 3: Ghost entities

| Task | Description | New/Modify | Priority |
|------|-------------|------------|----------|
| **T3.1** | Create `src/entities/GhostAlien.ts` — state machine (SCATTER, CHASE, FRIGHTENED, FLEE_TO_EXIT, EXITED) | NEW | High |
| **T3.2** | Implement ghost movement: tile-based, direction choice at intersections | NEW | High |
| **T3.3** | Implement `FRIGHTENED` behavior: reverse, slow, random turns | NEW | Medium |
| **T3.4** | Implement `FLEE_TO_EXIT` pathfinding to nearest exit | NEW | Medium |
| **T3.5** | Assign face textures from `SpriteManager.buildAlienSprites()` | NEW | Medium |
| **T3.6** | Add frightened visual tint / flash near power expiry | NEW | Low |

### Phase 4: Collision and rescue logic

| Task | Description | New/Modify | Priority |
|------|-------------|------------|----------|
| **T4.1** | Player vs pellet: destroy pellet, add score, play chomp | NEW | High |
| **T4.2** | Player vs power pellet: trigger invulnerability, ghosts → FRIGHTENED | NEW | High |
| **T4.3** | Player vs ghost (not invulnerable): lose life, respawn sequence | NEW | High |
| **T4.4** | Player vs ghost (invulnerable): eat ghost, combo score, ghost → FLEE_TO_EXIT, play "yipee" | NEW | High |
| **T4.5** | Ghost vs exit: mark rescued, update sidebar, remove ghost | NEW | High |

### Phase 5: UI and HUD

| Task | Description | New/Modify | Priority |
|------|-------------|------------|----------|
| **T5.1** | Create sidebar container for rescued faces | NEW | Medium |
| **T5.2** | Create HUD: score, lives, level, mode label (reuse `createCoreUI()` pattern from BaseGameScene) | NEW | Medium |
| **T5.3** | Add visual power countdown bar (green→yellow→red, flashes near expiry) | NEW | Medium |

### Phase 6: Progression and transitions

| Task | Description | New/Modify | Priority |
|------|-------------|------------|----------|
| **T6.1** | Win condition check: all ghosts exited → level complete overlay | NEW | High |
| **T6.2** | Campaign logic: Check if more faces remain. If yes, load next maze level. If no, trigger Campaign Complete. | NEW | High |
| **T6.3** | Lose condition check: lives === 0 → GameOverScene | NEW | High |
| **T6.4** | Scene transition: wire up from GalagaScene after final wave | MODIFY | Medium |
| **T6.5** | Optional: Create `PacShipIntroScene` (boarding cutscene) | NEW | Low |
| **T6.6** | Pass score/lives to next scene (Victory or loop back to Mode 1) | NEW | Medium |

### Phase 7: Audio

| Task | Description | New/Modify | Priority |
|------|-------------|------------|----------|
| **T7.1** | Register `background-pacman.mp3` in PreloaderScene | MODIFY | Medium |
| **T7.2** | Create/source `pac-pellet.mp3` SFX (short blip sound) | NEW | Medium |
| **T7.3** | Add remaining SFX assets (`pac-power`, `pac-eat-ghost`, `pac-death`, `pac-level-complete`) | NEW | Medium |
| **T7.4** | Register and trigger all SFX via `AudioManager` | NEW | Medium |

### Phase 8: Debug and testing

| Task | Description | New/Modify | Priority |
|------|-------------|------------|----------|
| **T8.1** | Add `PacShipRescueScene` entry to `DebugMenuScene` | MODIFY | Low |
| **T8.2** | Optional: `PacShipTestScene` for isolated movement/collision tests | NEW | Low |

---

## 7. Open questions

- **Q1: Power pellet tuning** — Default 6s; scale with difficulty. Confirm or adjust.
- **Q2: Ghost behavior in power mode** — Classic frightened (reverse + flee) as described. Confirm.
- **Q3: Abductee roster size** — 4 base, scale with difficulty (3–6). Confirm.
- **Q4: Art direction** — Keep alien silhouettes for now; ghost SVG is optional future work. Confirm.
- **Q5: Bonus life threshold** — Award extra life at 10,000 points (classic Pac-Man)? Confirm.

---

## 8. Summary: shared code inventory

| Utility | Status | Used by |
|---------|--------|---------|
| `ScoreManager` | Existing | All modes |
| `AudioManager` | Existing | All modes |
| `SpriteManager` | Existing | All modes |
| `FaceManager` | Existing | All modes |
| `LevelManager` | Existing (extend) | All modes |
| `LocalStorage` | Existing | All modes |
| `TouchControlManager` | Existing | All modes |
| `LifeManager` | **NEW** | Pac-Ship, later adopt in shooters |
| `InvulnerabilityController` | **NEW** | Pac-Ship, later adopt in shooters |

---

## 9. Git workflow

Work on a feature branch (no worktree needed for now):

```bash
git checkout -b feature/pacship-rescue-scene
```

Merge to `dev` when MVP is complete.
