import { Scene } from 'phaser';
import { FaceManager } from './FaceManager';
import { LocalStorage } from '../utils/localStorage';
import { COLORS } from '../constants';
import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_CORE_RADIUS, ALIEN_WIDTH, ALIEN_HEIGHT, ALIEN_CORE_RADIUS, ALIEN_TINT_ALPHA } from '../constants';

export interface SpriteConfig {
  width: number;
  height: number;
  coreRadius: number;
  faceCenterX?: number;
  faceCenterY?: number;
  faceScale?: number;
  backingAlpha?: number;
}

export interface AnimationFrame {
  textureKey: string;
  duration?: number; // milliseconds per frame
}

export interface SpriteAnimation {
  frames: AnimationFrame[];
  loop?: boolean;
}

export class SpriteManager {
  private static instance: SpriteManager;
  private scene: Scene;
  
  // Cache for built sprites
  private playerSpriteCache = new Map<string, string>();
  private alienSpriteCache = new Map<string, string>();
  private animationCache = new Map<string, SpriteAnimation>();
  
  private constructor(scene: Scene) {
    this.scene = scene;
  }
  
  static getInstance(scene: Scene): SpriteManager {
    if (!SpriteManager.instance || SpriteManager.instance.scene !== scene) {
      SpriteManager.instance = new SpriteManager(scene);
    }
    return SpriteManager.instance;
  }
  
  /**
   * Build or retrieve a player sprite with face
   * @param useDefault - Force use default face even if custom face available
   * @returns Texture key for the built sprite
   */
  async buildPlayerSprite(useDefault: boolean = false): Promise<string> {
    const cacheKey = `player_${useDefault ? 'default' : 'custom'}`;
    
    if (this.playerSpriteCache.has(cacheKey)) {
      return this.playerSpriteCache.get(cacheKey)!;
    }
    
    const currentFace = !useDefault ? FaceManager.getCurrentFace() : null;
    const config: SpriteConfig = {
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      coreRadius: PLAYER_CORE_RADIUS,
      faceScale: 1.0,
      backingAlpha: 1.0
    };
    
    let textureKey: string;
    
    if (currentFace) {
      // Use custom face
      textureKey = await this.buildSpriteWithFace(
        'player',
        currentFace,
        'player-face-composite',
        config,
        'player-face-meta'
      );
    } else if (this.scene.textures.exists('default-face')) {
      // Use default face
      textureKey = await this.buildSpriteWithDefaultFace(
        'player',
        'player-face-default',
        config,
        'player-face-meta'
      );
    } else {
      // No face available, use base sprite
      textureKey = 'player';
    }
    
    this.playerSpriteCache.set(cacheKey, textureKey);
    return textureKey;
  }
  
  /**
   * Build alien face textures for the current level
   * @param totalAliens - Number of alien textures needed
   * @returns Array of texture keys
   */
  async buildAlienSprites(totalAliens: number): Promise<string[]> {
    const cacheKey = `aliens_${totalAliens}`;
    
    if (this.alienSpriteCache.has(cacheKey)) {
      // Return cached textures if available
      const cachedKeys = this.alienSpriteCache.get(cacheKey)!.split(',');
      return cachedKeys.length === totalAliens ? cachedKeys : [];
    }
    
    const textures: string[] = [];
    const history = LocalStorage.getFaceHistory();
    const defaultKey = await this.buildDefaultAlienSprite();
    
    // Use faces from history (no duplicates per armada)
    const facesToUse = history.slice(0, totalAliens);
    const config: SpriteConfig = {
      width: ALIEN_WIDTH,
      height: ALIEN_HEIGHT,
      coreRadius: ALIEN_CORE_RADIUS,
      faceScale: 1.0,
      backingAlpha: ALIEN_TINT_ALPHA
    };
    
    // Build sprites with captured faces
    for (const face of facesToUse) {
      const textureKey = await this.buildAlienSpriteWithFace(face, config);
      if (textureKey) {
        textures.push(textureKey);
      }
    }
    
    // Fill remaining slots with default sprite
    while (textures.length < totalAliens && defaultKey) {
      textures.push(defaultKey);
    }
    
    // Cache the result
    this.alienSpriteCache.set(cacheKey, textures.join(','));
    return textures;
  }
  
  /**
   * Create a sprite animation from multiple frames
   * @param baseKey - Base name for the animation
   * @param frames - Array of texture keys with optional durations
   * @param loop - Whether to loop the animation
   * @returns Animation key
   */
  createAnimation(baseKey: string, frames: AnimationFrame[], loop: boolean = true): string {
    const animKey = `${baseKey}_anim`;
    
    // Store animation config for potential future use
    this.animationCache.set(animKey, { frames, loop });
    
    // For now, return the first frame as static sprite
    // TODO: Implement actual Phaser animation when needed
    return frames[0].textureKey;
  }
  
  /**
   * Build a player animation from webcam frames
   * @param frames - Array of base64 image data
   * @returns Animation key
   */
  async buildPlayerAnimation(frames: string[]): Promise<string> {
    const animFrames: AnimationFrame[] = [];
    
    for (let i = 0; i < frames.length; i++) {
      const frameKey = `player_anim_frame_${i}`;
      await FaceManager.addBase64Texture(this.scene, frameKey, frames[i]);
      
      // Build sprite with this frame
      const textureKey = await this.buildSpriteWithFace(
        'player',
        frames[i],
        `player_frame_${i}`,
        {
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
          coreRadius: PLAYER_CORE_RADIUS,
          faceScale: 1.0,
          backingAlpha: 1.0
        },
        'player-face-meta'
      );
      
      animFrames.push({
        textureKey,
        duration: 100 // 100ms per frame = 10fps
      });
    }
    
    return this.createAnimation('player', animFrames, true);
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.playerSpriteCache.clear();
    this.alienSpriteCache.clear();
    this.animationCache.clear();
  }
  
  // Private helper methods
  
  private async buildSpriteWithFace(
    baseKey: string,
    faceData: string,
    targetKey: string,
    config: SpriteConfig,
    metaKey: string
  ): Promise<string> {
    const srcKey = `${targetKey}_src`;
    await FaceManager.addBase64Texture(this.scene, srcKey, faceData);
    
    const meta = this.scene.cache.json.get(metaKey);
    const finalConfig = {
      ...config,
      faceCenterX: meta ? meta.relativeX * config.width : config.width / 2,
      faceCenterY: meta ? meta.relativeY * config.height : config.height / 2
    };
    
    return FaceManager.composeFaceTexture(this.scene, {
      baseKey,
      faceKey: srcKey,
      targetKey,
      ...finalConfig
    });
  }
  
  private async buildSpriteWithDefaultFace(
    baseKey: string,
    targetKey: string,
    config: SpriteConfig,
    metaKey: string
  ): Promise<string> {
    if (!this.scene.textures.exists('default-face')) {
      return baseKey;
    }
    
    const meta = this.scene.cache.json.get(metaKey);
    const finalConfig = {
      ...config,
      faceCenterX: meta ? meta.relativeX * config.width : config.width / 2,
      faceCenterY: meta ? meta.relativeY * config.height : config.height / 2
    };
    
    return FaceManager.composeFaceTexture(this.scene, {
      baseKey,
      faceKey: 'default-face',
      targetKey,
      ...finalConfig
    });
  }
  
  private async buildDefaultAlienSprite(): Promise<string | null> {
    if (!this.scene.textures.exists('default-face')) {
      return null;
    }
    
    const cacheKey = 'alien_default';
    if (this.alienSpriteCache.has(cacheKey)) {
      return this.alienSpriteCache.get(cacheKey)!;
    }
    
    const textureKey = await this.buildSpriteWithDefaultFace(
      'alien-0',
      'alien-face-default',
      {
        width: ALIEN_WIDTH,
        height: ALIEN_HEIGHT,
        coreRadius: ALIEN_CORE_RADIUS,
        faceScale: 1.0,
        backingAlpha: ALIEN_TINT_ALPHA
      },
      'alien1-face-meta'
    );
    
    // Apply green tint to default face
    try {
      const base64 = this.scene.textures.getBase64('default-face');
      if (base64) {
        const tinted = await FaceManager.tintImage(base64, COLORS.GREEN_TINT);
        await FaceManager.addBase64Texture(this.scene, 'alien-face-default-tinted', tinted);
        
        // Rebuild with tinted face
        const tintedKey = await this.buildSpriteWithFace(
          'alien-0',
          tinted,
          'alien-face-default-tinted',
          {
            width: ALIEN_WIDTH,
            height: ALIEN_HEIGHT,
            coreRadius: ALIEN_CORE_RADIUS,
            faceScale: 1.0,
            backingAlpha: ALIEN_TINT_ALPHA
          },
          'alien1-face-meta'
        );
        this.alienSpriteCache.set(cacheKey, tintedKey);
        return tintedKey;
      }
    } catch (e) {
      console.warn('Failed to tint default alien face', e);
    }
    
    this.alienSpriteCache.set(cacheKey, textureKey);
    return textureKey;
  }
  
  private async buildAlienSpriteWithFace(
    face: { id: string; imageData: string },
    config: SpriteConfig
  ): Promise<string | null> {
    const srcKey = `alien-face-src-${face.id}`;
    const targetKey = `alien-face-${face.id}`;
    
    try {
      await FaceManager.addBase64Texture(this.scene, srcKey, face.imageData);
      
      // Try to tint the face green
      let faceKey = srcKey;
      try {
        const tinted = await FaceManager.tintImage(face.imageData, COLORS.GREEN_TINT);
        const tintedKey = `${srcKey}-green`;
        await FaceManager.addBase64Texture(this.scene, tintedKey, tinted);
        faceKey = tintedKey;
      } catch {
        // Use original if tinting fails
      }
      
      const meta = this.scene.cache.json.get('alien1-face-meta');
      const finalConfig = {
        ...config,
        faceCenterX: meta ? meta.relativeX * config.width : config.width / 2,
        faceCenterY: meta ? meta.relativeY * config.height : config.height / 2
      };
      
      return FaceManager.composeFaceTexture(this.scene, {
        baseKey: 'alien-0',
        faceKey,
        targetKey,
        ...finalConfig
      });
    } catch (e) {
      console.warn('Failed to build alien sprite', e);
      return null;
    }
  }
}
