import Phaser from 'phaser';
import { gameConfig } from './config';

const game = new Phaser.Game(gameConfig);

// Handle AudioContext suspension - resume on first user interaction
function resumeAudioContext() {
  try {
    // Check if sound manager has context property (WebAudioSoundManager)
    if ('context' in game.sound && game.sound.context) {
      const audioContext = (game.sound as any).context;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
        console.log('AudioContext resumed');
      }
    }
  } catch (error) {
    console.warn('AudioContext resume failed:', error);
  }
  
  // Remove event listeners after first interaction
  document.removeEventListener('click', resumeAudioContext);
  document.removeEventListener('keydown', resumeAudioContext);
  document.removeEventListener('touchstart', resumeAudioContext);
}

// Add event listeners to resume AudioContext on first user interaction
document.addEventListener('click', resumeAudioContext);
document.addEventListener('keydown', resumeAudioContext);
document.addEventListener('touchstart', resumeAudioContext);

// Prevent context menu on right-click
document.addEventListener('contextmenu', (e) => e.preventDefault());

export default game;
