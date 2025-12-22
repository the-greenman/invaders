import { FaceDetection } from '@mediapipe/face_detection';
import { Camera } from '@mediapipe/camera_utils';
import { LocalStorage } from '../utils/localStorage';
import { ImageProcessor } from '../utils/imageProcessor';
import { COLORS } from '../constants';

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
    
    this.faceDetection = new FaceDetection({
      locateFile: (file) => {
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
    bbox?: { xMin: number; yMin: number; width: number; height: number }
  ): Promise<string> {
    let imageData: string;
    
    if (bbox) {
      imageData = await ImageProcessor.cropFaceFromVideo(videoElement, bbox);
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
      this.camera.stop();
      this.camera = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.faceDetection) {
      this.faceDetection.close();
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
  static startDetectionLoop(
    videoElement: HTMLVideoElement,
    onResults: (results: any) => void
  ): void {
    if (!this.faceDetection) {
      throw new Error('MediaPipe not initialized. Call initMediaPipe() first.');
    }
    
    this.faceDetection.onResults(onResults);
    
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.faceDetection!.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });
    
    this.camera.start();
  }
}
