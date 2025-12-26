# Agent Instructions

## Git Workflow
- **Always create a new branch** for each distinct task or feature.
- Do not commit directly to the base branch.
- **Current Project (Space Invaders):**
  - Base branch: `galaga`
  - Merge target: `galaga`
  - When finishing a task, merge the feature branch back into `galaga` and delete the feature branch.

## Quality Control
- **Run `npm run build`** before merging any branch to ensure type safety and build stability.
