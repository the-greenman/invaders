/**
 * Image Processor Utility Module
 *
 * Handles all image manipulation operations including:
 * - Cropping faces from video frames
 * - Applying color tints to images
 * - Resizing images
 *
 * All methods return base64 encoded image data strings
 */

export class ImageProcessor {
  /**
   * Crop a face from a video element using bounding box coordinates
   * @param videoElement - HTMLVideoElement with active video stream
   * @param bbox - Bounding box with normalized coordinates (0-1)
   * @param padding - Extra pixels around the face crop (default 20)
   * @returns Promise resolving to base64 image data string
   *
   * TODO:
   * 1. Create a canvas element
   * 2. Calculate crop area from bbox (convert normalized coords to pixels)
   *    - x = bbox.xMin * videoElement.videoWidth - padding
   *    - y = bbox.yMin * videoElement.videoHeight - padding
   *    - width = bbox.width * videoElement.videoWidth + padding * 2
   *    - height = bbox.height * videoElement.videoHeight + padding * 2
   * 3. Ensure crop area stays within video bounds (Math.max, Math.min)
   * 4. Make crop square (size = Math.min(width, height))
   * 5. Set canvas dimensions to square size
   * 6. Draw cropped portion: ctx.drawImage(video, x, y, size, size, 0, 0, size, size)
   * 7. Return canvas.toDataURL('image/png')
   */
  static async cropFaceFromVideo(
    videoElement: HTMLVideoElement,
    bbox: { xMin: number; yMin: number; width: number; height: number },
    padding: number = 20
  ): Promise<string> {
    const { canvas, ctx } = this.createCanvas(1, 1);
    
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    
    let x = bbox.xMin * videoWidth - padding;
    let y = bbox.yMin * videoHeight - padding;
    let width = bbox.width * videoWidth + padding * 2;
    let height = bbox.height * videoHeight + padding * 2;
    
    x = Math.max(0, x);
    y = Math.max(0, y);
    width = Math.min(width, videoWidth - x);
    height = Math.min(height, videoHeight - y);
    
    const size = Math.min(width, height);
    canvas.width = size;
    canvas.height = size;
    
    ctx.drawImage(videoElement, x, y, size, size, 0, 0, size, size);
    
    return canvas.toDataURL('image/png');
  }

  /**
   * Apply a color tint to an image
   * @param imageData - Base64 image data string
   * @param color - Hex color value (e.g., 0x00ff00 for green)
   * @returns Promise resolving to tinted base64 image string
   *
   * TODO:
   * 1. Create an Image object and load the imageData
   * 2. Return new Promise that resolves when image loads
   * 3. Create canvas with image dimensions
   * 4. Draw original image to canvas
   * 5. Get image pixel data: ctx.getImageData(0, 0, width, height)
   * 6. Extract RGB from color hex:
   *    - r = (color >> 16) & 0xFF
   *    - g = (color >> 8) & 0xFF
   *    - b = color & 0xFF
   * 7. Loop through pixels (i += 4) and apply tint:
   *    - data[i] = (data[i] * r) / 255     // Red channel
   *    - data[i+1] = (data[i+1] * g) / 255 // Green channel
   *    - data[i+2] = (data[i+2] * b) / 255 // Blue channel
   *    - data[i+3] unchanged (alpha)
   * 8. Put modified data back: ctx.putImageData(imageData, 0, 0)
   * 9. Return canvas.toDataURL('image/png')
   */
  static async tintImage(imageData: string, color: number = 0x00ff00): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const { canvas, ctx } = this.createCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        
        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;
        
        const { r, g, b } = this.hexToRgb(color);
        
        for (let i = 0; i < data.length; i += 4) {
          data[i] = (data[i] * r) / 255;
          data[i + 1] = (data[i + 1] * g) / 255;
          data[i + 2] = (data[i + 2] * b) / 255;
        }
        
        ctx.putImageData(imageDataObj, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }

  /**
   * Resize an image to specific dimensions
   * @param imageData - Base64 image data string
   * @param width - Target width in pixels
   * @param height - Target height in pixels
   * @returns Promise resolving to resized base64 image string
   *
   * TODO:
   * 1. Create an Image object and load the imageData
   * 2. Return new Promise that resolves when image loads
   * 3. Create canvas with target dimensions (width, height)
   * 4. Draw image scaled to canvas: ctx.drawImage(img, 0, 0, width, height)
   * 5. Return canvas.toDataURL('image/png')
   */
  static async resizeImage(imageData: string, width: number, height: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const { canvas, ctx } = this.createCanvas(width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }

  /**
   * HELPER: Convert hex color to RGB object
   * @param color - Hex color value (e.g., 0x00ff00)
   * @returns Object with r, g, b values (0-255)
   *
   * Example: hexToRgb(0x00ff00) => { r: 0, g: 255, b: 0 }
   */
  static hexToRgb(color: number): { r: number; g: number; b: number } {
    return {
      r: (color >> 16) & 0xFF,
      g: (color >> 8) & 0xFF,
      b: color & 0xFF
    };
  }

  /**
   * HELPER: Create a canvas element with specified dimensions
   * @param width - Canvas width
   * @param height - Canvas height
   * @returns Object with canvas and context
   */
  static createCanvas(width: number, height: number): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx };
  }
}
