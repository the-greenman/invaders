# Agent Instructions

## Current Project Context
- **Active Workplan**: @[/home/greenman/dev/classinvaders/MULTIGAME_REFACTOR_WORKPLAN.md]
- **Goal**: Multi-game architecture refactor with difficulty system
- **Stage 1 Status**: Tasks 1.1-1.3 complete, Task 1.4 ready to begin
- **Branch Strategy**: Feature branches merged into `galaga`, will eventually merge to `dev`

## Git Workflow
- **Always create a new branch** for each distinct task or feature.
- Do not commit directly to the base branch.
- **Current Project (Space Invaders):**
  - Base branch: `dev`
  - Merge target: `dev`
  - When finishing a task, merge the feature branch back into `dev` and delete the feature branch.

### Using Git Worktrees for Parallel Development
- **Create a worktree** for each task to allow parallel development:
  ```bash
  git worktree add ../worktree-task-1-4 feature/task-1-4-levelmanager
  cd ../worktree-task-1-4
  ```
- Worktrees enable multiple agents to work simultaneously without conflicts
- Clean up worktrees after task completion:
  ```bash
  git worktree remove ../worktree-task-1-4
  ```

## Progress Tracking
- **Always update the workplan** when working on tasks:
  - Mark task as **in progress** when starting: Add `[IN PROGRESS]` to task title
  - Mark acceptance criteria with `[x]` when complete
  - Add completion notes if needed
  - Update task status in @[/home/greenman/dev/classinvaders/MULTIGAME_REFACTOR_WORKPLAN.md]
- This provides visibility to other agents and the master agent
- Example task title format: `### Task 1.4: Update LevelManager for Difficulty [IN PROGRESS]`

## Quality Control
- **Run `npm run build`** before merging any branch to ensure type safety and build stability.

## Master Agent Role
- Reviews and merges completed feature branches
- Coordinates between parallel agents
- Updates overall project status
- Resolves conflicts and ensures quality standards
