import Phaser from 'phaser';
import { gameConfig } from './config';

const game = new Phaser.Game(gameConfig);

// Prevent context menu on right-click
document.addEventListener('contextmenu', (e) => e.preventDefault());

export default game;
