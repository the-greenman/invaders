import Phaser from 'phaser';
import { LocalStorage } from '../utils/localStorage';

/**
 * Audio Manager
 *
 * Manages all game audio including sound effects and background music.
 * Create one instance per scene that needs audio.
 *
 * Features:
 * - Play sound effects (shoot, explosion, hit, etc.)
 * - Manage background music with looping
 * - Mute/unmute all audio
 * - Persist mute setting to localStorage
 * - Prevent overlapping/spamming of sounds
 *
 * Sound Keys (must be loaded in BootScene):
 * - 'shoot': Player fires bullet
 * - 'explosion': Alien destroyed
 * - 'player-hit': Player takes damage
 * - 'level-complete': Level cleared
 * - 'music': Background music (looping)
 */

export class AudioManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private music: Phaser.Sound.BaseSound | null = null;
  private muted: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.muted = LocalStorage.getSettings().muted;
  }

  /**
   * Register a sound effect for later use
   * Call this in scene's create() method for each sound
   * @param key - Sound key from asset loader
   *
   * TODO:
   * 1. Check if sound already registered (avoid duplicates)
   * 2. Create sound using this.scene.sound.add(key)
   * 3. Store in this.sounds Map
   */
  registerSound(key: string): void {
    if (!this.sounds.has(key)) {
      if (this.scene.cache.audio.exists(key)) {
        const sound = this.scene.sound.add(key);
        this.sounds.set(key, sound);
        // console.log(`AudioManager: Registered sound '${key}'`);
      } else {
        console.warn(`AudioManager: Sound '${key}' not found in cache`);
      }
    }
  }

  /**
   * Play a registered sound effect
   * @param key - Sound key to play
   * @param config - Optional Phaser sound config (volume, rate, etc.)
   */
  play(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.muted) return;
    const sound = this.sounds.get(key);
    if (sound) {
      sound.play(config);
    } else {
      console.warn(`AudioManager: Cannot play missing sound '${key}'`);
    }
  }

  /**
   * Start playing background music
   * @param key - Music key from asset loader
   * @param loop - Whether to loop the music (default true)
   *
   * TODO:
   * 1. Stop existing music if playing (this.stopMusic())
   * 2. Create music sound: this.scene.sound.add(key, { loop, volume: 0.5 })
   * 3. Store in this.music
   * 4. If not muted, call this.music.play()
   */
  playMusic(key: string, loop: boolean = true): void {
    if (this.music) this.music.stop();
    this.music = this.scene.sound.add(key, { loop, volume: 0.5 });
    if (!this.muted) this.music.play();
  }

  /**
   * Stop the background music
   *
   * TODO: If music exists, call this.music.stop()
   */
  stopMusic(): void {
    if (this.music) this.music.stop();
  }

  /**
   * Toggle mute state for all audio
   * Saves the preference to localStorage
   *
   * TODO:
   * 1. Toggle this.muted boolean
   * 2. Set this.scene.sound.mute = this.muted
   * 3. Get settings from LocalStorage
   * 4. Update muted property
   * 5. Save settings back to LocalStorage
   */
  toggleMute(): void {
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
    const settings = LocalStorage.getSettings();
    settings.muted = this.muted;
    LocalStorage.saveSettings(settings);
  }

  /**
   * Get current mute state
   * @returns true if audio is muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Set specific volume for a sound or all sounds
   * @param volume - Volume level (0.0 to 1.0)
   * @param key - Optional specific sound key, if not provided affects all
   *
   * TODO:
   * 1. If key provided: get sound and set its volume
   * 2. If no key: set this.scene.sound.volume for all sounds
   */
  setVolume(volume: number, key?: string): void {
    if (key) {
      const sound = this.sounds.get(key);
      if (sound) {
        // BaseSound doesn't have setVolume, use config during play instead
        // This is a limitation of the BaseSound type
        console.warn(`Cannot set volume for individual sound ${key}. Use volume in play config.`);
      }
    } else {
      this.scene.sound.volume = volume;
    }
  }

  /**
   * Cleanup method - stop all sounds when leaving scene
   * Call this in scene's shutdown() method
   *
   * TODO:
   * 1. Stop all sounds in the Map
   * 2. Stop music
   * 3. Clear the sounds Map
   */
  cleanup(): void {
    this.sounds.forEach(sound => sound.stop());
    this.stopMusic();
    this.sounds.clear();
  }
}
