import Phaser from 'phaser';
import { LocalStorage } from '../utils/localStorage';
import { ImageProcessor } from '../utils/imageProcessor';
import { COLORS } from '../constants';
import { SpriteManager } from './SpriteManager';

// TypeScript declarations for MediaPipe global objects (loaded via CDN)
declare global {
  interface Window {
    FaceDetection: any;
    Camera: any;
  }
}

// Use global MediaPipe objects
type FaceDetection = any;
type Camera = any;

/**
 * Face Manager
 *
 * Manages webcam access, face detection using MediaPipe, and face image processing.
 * This is a static class that maintains singleton instances of FaceDetection and Camera.
 *
 * Key responsibilities:
 * - Initialize MediaPipe face detection model
 * - Start/stop webcam access
 * - Capture and process face images
 * - Create tinted face textures for aliens
 * - Clean up resources properly
 */

export class FaceManager {
  private static faceDetection: FaceDetection | null = null;
  private static camera: Camera | null = null;
  private static mediaStream: MediaStream | null = null;

  /**
   * Initialize the MediaPipe face detection model
   * @returns Promise resolving to FaceDetection instance
   *
   * TODO:
   * 1. Check if faceDetection already exists (singleton pattern)
   * 2. Create new FaceDetection with locateFile config pointing to CDN:
   *    https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}
   * 3. Set options: model: 'short', minDetectionConfidence: 0.5
   * 4. Call initialize() and await
   * 5. Store in this.faceDetection
   * 6. Return the instance
   */
  static async initMediaPipe(): Promise<FaceDetection> {
    if (this.faceDetection) return this.faceDetection;

    // Use MediaPipe loaded from CDN (global window.FaceDetection)
    if (!window.FaceDetection) {
      throw new Error('MediaPipe FaceDetection not loaded. Ensure script tags are in index.html');
    }

    this.faceDetection = new window.FaceDetection({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
      }
    });

    this.faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5
    });

    await this.faceDetection.initialize();
    return this.faceDetection;
  }

  /**
   * Request webcam access and start video stream
   * @param videoElement - Video element to attach stream to
   * @returns Promise resolving to MediaStream
   *
   * TODO:
   * 1. Request getUserMedia with constraints:
   *    { video: { width: 640, height: 480, facingMode: 'user' } }
   * 2. Set videoElement.srcObject = stream
   * 3. Call videoElement.play() and await
   * 4. Return stream for cleanup later
   */
  static async startWebcam(videoElement: HTMLVideoElement): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      
      this.mediaStream = stream;
      videoElement.srcObject = stream;
      await videoElement.play();
      
      return stream;
    } catch (error) {
      console.error('Failed to access webcam:', error);
      throw new Error('Unable to access camera. Please ensure camera permissions are granted.');
    }
  }

  /**
   * Capture current video frame and save as face image
   * @param videoElement - Video element with active stream
   * @param bbox - Optional face bounding box from detection
   * @returns Promise resolving to captured image data
   *
   * TODO:
   * 1. If bbox provided, use ImageProcessor.cropFaceFromVideo()
   * 2. If no bbox, capture whole frame using canvas
   * 3. Move current face to history using LocalStorage.addToFaceHistory()
   * 4. Save new image as current using LocalStorage.setCurrentFace()
   * 5. Return the captured image data
   */
  static async captureAndSaveFace(
    videoElement: HTMLVideoElement,
    bbox?: { xMin: number; yMin: number; width: number; height: number },
    padding: number = 20
  ): Promise<string> {
    let imageData: string;
    
    if (bbox) {
      imageData = await ImageProcessor.cropFaceFromVideo(videoElement, bbox, padding);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(videoElement, 0, 0);
      imageData = canvas.toDataURL('image/png');
    }
    
    const currentFace = LocalStorage.getCurrentFace();
    if (currentFace) {
      LocalStorage.addToFaceHistory(currentFace);
    }
    
    LocalStorage.setCurrentFace(imageData);
    
    // Invalidate sprite cache so next game uses the new face
    SpriteManager.invalidatePlayerCache();
    
    return imageData;
  }

  /**
   * Get random alien face textures from history
   * Returns tinted (green) versions of stored faces
   * @param count - Number of random faces to retrieve
   * @returns Promise resolving to array of tinted face image data
   *
   * TODO:
   * 1. Get face history using LocalStorage.getFaceHistory()
   * 2. If empty, return empty array
   * 3. Randomly select 'count' faces (avoid duplicates using Set)
   * 4. For each selected face:
   *    - Use ImageProcessor.tintImage() with COLORS.GREEN_TINT
   *    - Add to result array
   * 5. Return array of tinted face images
   */
  static async getRandomAlienFaces(count: number): Promise<string[]> {
    const history = LocalStorage.getFaceHistory();
    if (history.length === 0) return [];
    
    const tintedFaces: string[] = [];
    const usedIndices = new Set<number>();
    
    const maxFaces = Math.min(count, history.length);
    
    for (let i = 0; i < maxFaces; i++) {
      let randomIndex: number;
      do {
        randomIndex = Math.floor(Math.random() * history.length);
      } while (usedIndices.has(randomIndex));
      
      usedIndices.add(randomIndex);
      const faceData = history[randomIndex].imageData;
      const tintedFace = await ImageProcessor.tintImage(faceData, COLORS.GREEN_TINT);
      tintedFaces.push(tintedFace);
    }
    
    return tintedFaces;
  }

  /**
   * Get current player face image
   * @returns Base64 image data or null
   */
  static getCurrentFace(): string | null {
    return LocalStorage.getCurrentFace();
  }

  /**
   * Clean up MediaPipe and camera resources
   * IMPORTANT: Always call this when leaving WebcamScene to prevent memory leaks
   *
   * TODO:
   * 1. If camera exists: call camera.stop() and set to null
   * 2. If faceDetection exists: call faceDetection.close() and set to null
   */
  static cleanup(): void {
    if (this.camera) {
      try {
        // MediaPipe Camera from CDN may have different API
        if (typeof this.camera.stop === 'function') {
          this.camera.stop();
        }
      } catch (e) {
        console.warn('Camera cleanup error:', e);
      }
      this.camera = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.faceDetection) {
      try {
        this.faceDetection.close();
      } catch (e) {
        console.warn('FaceDetection cleanup error:', e);
      }
      this.faceDetection = null;
    }
  }

  /**
   * Start face detection loop on video element
   * This sets up the Camera utility to continuously process frames
   * @param videoElement - Video element to process
   * @param onResults - Callback for detection results
   *
   * TODO:
   * 1. Ensure faceDetection is initialized
   * 2. Create new Camera instance with:
   *    - videoElement
   *    - onFrame callback that sends frames to faceDetection
   *    - width: 640, height: 480
   * 3. Set faceDetection.onResults(onResults)
   * 4. Start camera
   * 5. Store camera instance for cleanup
   */
  static async startDetectionLoop(
    videoElement: HTMLVideoElement,
    onResults: (results: any) => void
  ): Promise<void> {
    if (!this.faceDetection) {
      throw new Error('MediaPipe not initialized. Call initMediaPipe() first.');
    }

    // Use MediaPipe Camera loaded from CDN (global window.Camera)
    if (!window.Camera) {
      throw new Error('MediaPipe Camera not loaded. Ensure script tags are in index.html');
    }

    this.faceDetection.onResults(onResults);

    this.camera = new window.Camera(videoElement, {
      onFrame: async () => {
        if (!this.faceDetection) return;
        try {
          await this.faceDetection.send({ image: videoElement });
        } catch (e) {
          console.warn('Face detection send skipped:', e);
        }
      },
      width: 640,
      height: 480
    });

    this.camera.start();
  }

  /**
   * Ensure a base64 image is loaded into the TextureManager under a key.
   */
  static async addBase64Texture(
    scene: Phaser.Scene,
    key: string,
    dataUrl: string
  ): Promise<void> {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        scene.textures.addImage(key, img);
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load base64 texture'));
      img.src = dataUrl;
    });
  }

  /**
   * Compose a face texture into a base sprite and save as a new texture key.
   * Returns the targetKey used.
   */
  static composeFaceTexture(
    scene: Phaser.Scene,
    config: {
      baseKey: string;
      faceKey: string;
      targetKey: string;
      width: number;
      height: number;
      coreRadius: number;
      faceCenterX?: number;
      faceCenterY?: number;
      faceScale?: number;
      backingAlpha?: number;
    }
  ): string {
    const {
      baseKey,
      faceKey,
      targetKey,
      width,
      height,
      coreRadius,
      faceCenterX,
      faceCenterY,
      faceScale = 1,
      backingAlpha = 1.0
    } = config;
    if (!scene.textures.exists(baseKey) || !scene.textures.exists(faceKey)) {
      return baseKey;
    }

    if (scene.textures.exists(targetKey)) {
      scene.textures.remove(targetKey);
    }

    const centerX = faceCenterX ?? width / 2;
    const centerY = faceCenterY ?? height / 2;

    const rt = scene.add.renderTexture(0, 0, width, height);
    const ship = scene.add.image(centerX, centerY, baseKey)
      .setDisplaySize(width, height)
      .setVisible(false);
    const face = scene.add.image(centerX, centerY, faceKey)
      .setDisplaySize(coreRadius * 2.1 * faceScale, coreRadius * 2.1 * faceScale)
      .setVisible(false)
      .setTint(0xffffff);

    const maskShape = scene.make.graphics({ x: centerX, y: centerY });
    maskShape.setVisible(false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillCircle(0, 0, coreRadius);
    const mask = maskShape.createGeometryMask();
    face.setMask(mask);

    // Backing to control brightness
    const backing = scene.make.graphics({ x: centerX, y: centerY });
    backing.setVisible(false);
    backing.fillStyle(0xffffff, backingAlpha);
    backing.fillCircle(0, 0, coreRadius * 1.05);

    rt.draw(ship, ship.x, ship.y);
    rt.draw(backing);

    // Set face to use normal blend mode with no tinting
    face.setBlendMode(Phaser.BlendModes.NORMAL);
    face.setAlpha(1.0);  // Ensure full opacity
    rt.draw(face, face.x, face.y);

    const outline = scene.make.graphics({ x: centerX, y: centerY });
    outline.setVisible(false);
    outline.lineStyle(2, 0xffffff, 0.8);
    outline.strokeCircle(0, 0, coreRadius + 2);
    rt.draw(outline);

    rt.saveTexture(targetKey);

    face.clearMask();
    ship.destroy();
    face.destroy();
    maskShape.destroy();
    backing.destroy();
    outline.destroy();
    rt.destroy();

    return targetKey;
  }

  /**
   * Apply a color tint to a base64 image.
   */
  static async tintImage(imageData: string, color: number): Promise<string> {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageData;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageData;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = data.data;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = (d[i] * r) / 255;
      d[i + 1] = (d[i + 1] * g) / 255;
      d[i + 2] = (d[i + 2] * b) / 255;
    }
    ctx.putImageData(data, 0, 0);
    return canvas.toDataURL('image/png');
  }
}
