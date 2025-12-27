import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import { PreloaderScene } from './scenes/PreloaderScene';
import { MenuScene } from './scenes/MenuScene';
import { DifficultySelectScene } from './scenes/DifficultySelectScene';
import { WebcamScene } from './scenes/WebcamScene';
import { GameScene } from './scenes/GameScene';
import { ModeTransitionScene } from './scenes/ModeTransitionScene';
import { SpaceInvadersIntroScene } from './scenes/SpaceInvadersIntroScene';
import { GalagaIntroScene } from './scenes/GalagaIntroScene';
import { GameOverScene } from './scenes/GameOverScene';
import { AbductionScene } from './scenes/AbductionScene';
import { HighScoreScene } from './scenes/HighScoreScene';
import { DebugMenuScene } from './scenes/debug/DebugMenuScene';
import { PlayerTestScene } from './scenes/debug/PlayerTestScene';
import { ArmadaTestScene } from './scenes/debug/ArmadaTestScene';
import { CollisionTestScene } from './scenes/debug/CollisionTestScene';
import { CameraTestScene } from './scenes/debug/CameraTestScene';
import { SpriteDebugScene } from './scenes/debug/SpriteDebugScene';
import { CompareScene } from './scenes/debug/CompareScene';
import { ControllerDebugScene } from './scenes/debug/ControllerDebugScene';
import { StoredFacesScene } from './scenes/debug/StoredFacesScene';
import { AbductionLineScene } from './scenes/debug/AbductionLineScene';
import { BombTestScene } from './scenes/debug/BombTestScene';
import { MobileDebugScene } from './scenes/debug/MobileDebugScene';
import { PathTestScene } from './scenes/debug/PathTestScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000000',
  input: {
    gamepad: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [
    PreloaderScene,
    MenuScene,
    DifficultySelectScene,
    ModeTransitionScene,
    SpaceInvadersIntroScene,
    GalagaIntroScene,
    DebugMenuScene,
    PathTestScene,
    PlayerTestScene,
    ArmadaTestScene,
    CollisionTestScene,
    CameraTestScene,
    SpriteDebugScene,
    CompareScene,
    ControllerDebugScene,
    StoredFacesScene,
    AbductionLineScene,
    BombTestScene,
    MobileDebugScene,
    WebcamScene,
    HighScoreScene,
    GameScene,
    AbductionScene,
    GameOverScene
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};
