import { describe, it, expect, vi } from 'vitest';
import { BaseGameScene } from '../../../src/scenes/base/BaseGameScene';
import { GameMode } from '../../../src/types/GameMode';

class TransitionTestScene extends BaseGameScene {
  constructor() {
    super('TransitionTestScene');
  }

  protected createPlayer(): void {}
  protected createEnemies(): void {}
  protected setupCollisions(): void {}
  protected createModeUI(): void {}
  protected createBackground(): void {}
  protected checkGameConditions(): void {}
  protected onLevelComplete(): void {}
  protected updateMode(): void {}
}

describe('BaseGameScene transitions', () => {
  it('uses the mapped transition scene when switching modes', () => {
    const scene = new TransitionTestScene();
    const startSpy = vi.fn();
    (scene as any).scene = { start: startSpy };
    (scene as any).currentGameMode = GameMode.SPACE_INVADERS;

    (scene as any).switchToMode(GameMode.GALAGA);

    expect(startSpy).toHaveBeenCalledWith(
      'GalagaSkyTransitionScene',
      expect.objectContaining({
        fromMode: GameMode.SPACE_INVADERS,
        toMode: GameMode.GALAGA
      })
    );
  });

  it('falls back to the default transition scene when no mapping exists', () => {
    const scene = new TransitionTestScene();
    const startSpy = vi.fn();
    (scene as any).scene = { start: startSpy };
    (scene as any).currentGameMode = GameMode.GALAGA;

    (scene as any).switchToMode(GameMode.SPACE_INVADERS);

    expect(startSpy).toHaveBeenCalledWith(
      'ModeTransitionScene',
      expect.objectContaining({
        fromMode: GameMode.GALAGA,
        toMode: GameMode.SPACE_INVADERS
      })
    );
  });
});
