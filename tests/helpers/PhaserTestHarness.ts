import Phaser from 'phaser';

export class PhaserTestHarness {
  private game: Phaser.Game | null = null;
  private lastTime: number = 0;
  private readyPromise: Promise<void> | null = null;
  
  createGame(config?: Partial<Phaser.Types.Core.GameConfig>): Phaser.Game {
    if (this.game) {
      this.destroyGame();
    }
    
    this.lastTime = Date.now();

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const defaultConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS,
      width: 800,
      height: 600,
      canvas: canvas,
      banner: false,
      audio: {
        noAudio: true
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 }
        }
      }
    };

    this.game = new Phaser.Game({ ...defaultConfig, ...config });

    // Let Phaser boot (needed so scenes/plugins/timers are initialized)
    this.readyPromise = new Promise<void>((resolve) => {
      this.game?.events.once('ready', () => {
        resolve();
      });
    });
    
    return this.game;
  }

  async waitForReady(): Promise<void> {
    await (this.readyPromise ?? Promise.resolve());
  }
  
  destroyGame(): void {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }
  
  runFrames(count: number, dt: number = 16.67): void {
    if (!this.game) return;
    
    for (let i = 0; i < count; i++) {
      this.lastTime += dt;
      this.game.step(this.lastTime, dt);
      
      // Force physics step if needed (workaround for headless/test env)
      this.game.scene.scenes.forEach((scene: any) => {
        if (scene.physics && scene.physics.world) {
          // Arcade Physics uses update(time, delta)
          scene.physics.world.update(this.lastTime, dt);
        }
      });
    }
  }
}
