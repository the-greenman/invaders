import Phaser from 'phaser';

/**
 * Best-effort resume of the Phaser audio context (required by some browsers
 * before any sound can play).
 */
export function resumeGameAudio(scene: Phaser.Scene): void {
  try {
    const soundManager = scene.sound as any;
    if (soundManager?.context && soundManager.context.state === 'suspended') {
      soundManager.context.resume().catch(() => {
        /* ignored */
      });
    }
  } catch (error) {
    console.warn('[audio] Failed to resume audio context', error);
  }
}
