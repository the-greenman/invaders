import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TouchControlManager } from '../../../src/managers/TouchControlManager';

describe('TouchControlManager', () => {
  let manager: TouchControlManager;
  let scene: any;
  let mockThumbpadInstance: any;
  let thumbpadFactory: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockThumbpadInstance = {
      getHorizontalAxis: vi.fn().mockReturnValue(0),
      getVerticalAxis: vi.fn().mockReturnValue(0),
      setVisible: vi.fn(),
      destroy: vi.fn()
    };

    thumbpadFactory = vi.fn().mockReturnValue(mockThumbpadInstance);

    scene = {
      input: {
        addPointer: vi.fn()
      },
      add: {
        graphics: vi.fn().mockReturnValue({
          fillStyle: vi.fn(),
          fillCircle: vi.fn(),
          lineStyle: vi.fn(),
          strokeCircle: vi.fn(),
          setDepth: vi.fn(),
          setScrollFactor: vi.fn(),
          clear: vi.fn(),
          setVisible: vi.fn(),
          destroy: vi.fn()
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setScrollFactor: vi.fn().mockReturnThis(),
          setVisible: vi.fn(),
          destroy: vi.fn()
        }),
        zone: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setInteractive: vi.fn().mockReturnThis(),
          setScrollFactor: vi.fn().mockReturnThis(),
          on: vi.fn(),
          destroy: vi.fn()
        })
      }
    };

    manager = new TouchControlManager(scene, {
      forceEnable: true,
      thumbpadFactory
    });
  });

  describe('Initialization', () => {
    it('should initialize controls if touch device', () => {
      expect(manager.isEnabled()).toBe(true);
      expect(scene.input.addPointer).toHaveBeenCalledWith(4);
      expect(thumbpadFactory).toHaveBeenCalled();
      expect(scene.add.graphics).toHaveBeenCalled(); // Fire button
    });
  });

  describe('Input Handling', () => {
    it('should return movement direction from thumbpad', () => {
      // Center
      mockThumbpadInstance.getHorizontalAxis.mockReturnValue(0);
      expect(manager.getMoveDirection()).toBe(0);

      // Left
      mockThumbpadInstance.getHorizontalAxis.mockReturnValue(-0.5);
      expect(manager.getMoveDirection()).toBe(-1);

      // Right
      mockThumbpadInstance.getHorizontalAxis.mockReturnValue(0.5);
      expect(manager.getMoveDirection()).toBe(1);
    });

    it('should handle shoot requests', () => {
      // Manually trigger the fire zone event handler
      // We need to capture the 'pointerdown' callback passed to zone.on
      const zone = scene.add.zone.mock.results[0].value;
      const calls = zone.on.mock.calls;
      const pointerDownCall = calls.find((c: any) => c[0] === 'pointerdown');
      
      expect(pointerDownCall).toBeDefined();
      const callback = pointerDownCall[1];
      
      // Request shoot
      callback();
      
      expect(manager.consumeShootRequest()).toBe(true);
      // Should be consumed (false on second call)
      expect(manager.consumeShootRequest()).toBe(false);
    });
  });

  describe('Visibility', () => {
    it('should toggle visibility', () => {
      manager.hide();
      expect(mockThumbpadInstance.setVisible).toHaveBeenCalledWith(false);
      
      manager.show();
      expect(mockThumbpadInstance.setVisible).toHaveBeenCalledWith(true);
    });
  });
});
