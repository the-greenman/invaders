import { describe, it, expect, vi } from 'vitest';
import { BaseGameScene } from '../../../src/scenes/base/BaseGameScene';
import { TouchControlManager } from '../../../src/managers/TouchControlManager';
import { Player } from '../../../src/entities/Player';

class TestScene extends BaseGameScene {
  public readonly setTouchControlsSpy = vi.fn();
  public readonly touchManagerStub = { isEnabled: vi.fn().mockReturnValue(true) } as unknown as TouchControlManager;

  constructor() {
    super('TestScene');
    (this as any).events = { once: vi.fn(), on: vi.fn(), off: vi.fn(), emit: vi.fn() };
  }

  protected setupPhysicsGroups(): void {}

  protected initializeManagers(): void {
    this.touchControlManager = this.touchManagerStub;
  }

  protected async preparePlayerTexture(): Promise<void> {}

  protected async prepareAlienFaceTextures(): Promise<void> {}

  protected createPlayer(): void {
    this.player = { setTouchControls: this.setTouchControlsSpy } as unknown as Player;
  }

  protected createEnemies(): void {}
  protected setupCollisions(): void {}
  protected createCoreUI(): void {}
  protected createModeUI(): void {}
  protected createBackground(): void {}
  protected checkGameConditions(): void {}
  protected onLevelComplete(): void {}
  protected updateMode(): void {}
}

describe('BaseGameScene touch controls', () => {
  it('attaches touch controls after creating the player', async () => {
    const scene = new TestScene();

    await (scene as any).initializeGameEntities();

    expect(scene.setTouchControlsSpy).toHaveBeenCalledWith(scene.touchManagerStub);
  });
});
