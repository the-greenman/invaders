import Phaser from 'phaser';
import { Player } from '../../src/entities/Player';
import { Alien } from '../../src/entities/Alien';
import { Shield } from '../../src/entities/Shield';
import { BaseAlienGrid } from '../../src/entities/BaseAlienGrid';
import { SpaceInvadersGrid } from '../../src/entities/SpaceInvadersGrid';
import { GalagaGrid } from '../../src/entities/GalagaGrid';

export class EntityFactory {
  static createPlayer(scene: Phaser.Scene, x = 400, y = 550, texture = 'player'): Player {
    return new Player(scene, x, y, texture);
  }
  
  static createAlien(scene: Phaser.Scene, type = 0, row = 0, col = 0, texture = 'alien-0'): Alien {
    return new Alien(scene, 0, 0, type, { row, col }, texture);
  }
  
  static createSpaceInvadersGrid(scene: Phaser.Scene, rows = 3, cols = 7): SpaceInvadersGrid {
    return new SpaceInvadersGrid(scene, 0, 0, rows, cols, 2000, ['alien-0', 'alien-1', 'alien-2'], 1);
  }

  static createGalagaGrid(scene: Phaser.Scene, rows = 3, cols = 7): GalagaGrid {
    return new GalagaGrid(scene, 0, 0, rows, cols, 50, 0.05, ['alien-0', 'alien-1', 'alien-2'], 1);
  }
  
  static createShield(scene: Phaser.Scene, x: number): Shield {
    return new Shield(scene, x, 500);
  }
}
