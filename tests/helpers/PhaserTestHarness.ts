import Phaser from 'phaser';

export class PhaserTestHarness {
  private game: Phaser.Game | null = null;
  
  createGame(config?: Partial<Phaser.Types.Core.GameConfig>): Phaser.Game {
    if (this.game) {
      this.destroyGame();
    }

    const defaultConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS,
      width: 800,
      height: 600,
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
    return this.game;
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
      this.game.step(Date.now(), dt);
    }
  }
}
