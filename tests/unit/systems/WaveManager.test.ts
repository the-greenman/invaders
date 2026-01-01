import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WaveManager, WaveConfig } from '../../../src/systems/WaveManager';
import { GalagaGrid } from '../../../src/entities/GalagaGrid';
import { Alien, AlienState } from '../../../src/entities/Alien';
import { Random } from '../../../src/utils/RandomProvider';
import { AttackPath } from '../../../src/systems/AttackPath';

// Hoist mocks
const { mockRandom } = vi.hoisted(() => ({
  mockRandom: {
    between: vi.fn(),
    floatBetween: vi.fn(),
    random: vi.fn(),
    pick: vi.fn(),
    shuffle: vi.fn()
  }
}));

// Mock dependencies
vi.mock('../../../src/utils/RandomProvider', () => {
  return {
    Random: mockRandom
  };
});

// Mock AttackPath
vi.mock('../../../src/systems/AttackPath', () => {
  const MockPath = {
    start: vi.fn(),
    getCurrentPosition: vi.fn(),
    isComplete: vi.fn()
  };
  return {
    AttackPath: vi.fn(),
    createRandomAttackPath: vi.fn(() => MockPath)
  };
});

describe('WaveManager', () => {
  let waveManager: WaveManager;
  let mockGrid: any;
  let mockScene: any;
  let mockAliens: any[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    vi.clearAllMocks();

    // Reset mock random behavior
    mockRandom.between.mockReturnValue(0);
    mockRandom.pick.mockImplementation((arr: any[]) => arr[0]);

    // Setup Mock Aliens
    mockAliens = [];
    for (let i = 0; i < 10; i++) {
      let currentState = AlienState.IN_FORMATION;
      const alien = {
        x: i * 50,
        y: 100,
        getState: vi.fn().mockImplementation(() => currentState),
        setAlienState: vi.fn().mockImplementation((s) => { currentState = s; }),
        setFormationPosition: vi.fn(),
        getFormationPosition: vi.fn().mockReturnValue({ x: i * 50, y: 100 }),
        setAttackPath: vi.fn(),
        getAttackPath: vi.fn(),
        getGridPosition: vi.fn().mockReturnValue({ row: 0, col: i }),
        isAlive: vi.fn().mockReturnValue(true),
        move: vi.fn(),
        followPath: vi.fn(),
        setPosition: vi.fn()
      };
      mockAliens.push(alien);
    }

    // Setup Mock Grid
    mockGrid = {
      getAliveAliens: vi.fn().mockReturnValue(mockAliens)
    };

    // Setup Mock Scene
    mockScene = {
      registry: {
        get: vi.fn()
      }
    };

    const config: WaveConfig = {
      minInterval: 1000,
      maxInterval: 2000,
      minSize: 2,
      maxSize: 5,
      maxWaves: 2
    };

    waveManager = new WaveManager(mockGrid as GalagaGrid, mockScene, 0, config);
    // Initialize lastWaveTime to avoid immediate launch due to 0 start time
    (waveManager as any).lastWaveTime = 1000;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with 0 active waves', () => {
      expect(waveManager.getActiveWaveCount()).toBe(0);
    });
  });

  describe('Wave Launching', () => {
    it('should launch wave when conditions are met', () => {
      // Setup conditions:
      // Time passed > interval (mocked Random.between returns minInterval 1000)
      vi.setSystemTime(3000); // 2000ms passed since init (init time was 1000, lastWaveTime=1000)
      // Diff = 2000 > 1000
      
      // Random.between for interval returns 1000
      mockRandom.between.mockReturnValueOnce(1000);
      // Random.between for wave size returns 2
      mockRandom.between.mockReturnValueOnce(2);
      
      // Random.between for alien selection
      // We set default return value to 0 in beforeEach, so it will pick first available

      waveManager.update(16);

      expect(waveManager.getActiveWaveCount()).toBe(1);
      // Check aliens were updated
      expect(mockAliens[0].setAlienState).toHaveBeenCalledWith(AlienState.ATTACKING);
      expect(mockAliens[0].setAttackPath).toHaveBeenCalled();
    });

    it('should not launch wave if interval not passed', () => {
      vi.setSystemTime(1500); // 500ms passed
      // Random interval returns 1000. 500 > 1000 is False.
      mockRandom.between.mockReturnValueOnce(1000); 

      waveManager.update(16);
      expect(waveManager.getActiveWaveCount()).toBe(0);
    });

    it('should not launch wave if max waves reached', () => {
      // Create mock alien that counts as active (Alive + ATTACKING)
      const activeAlien = {
        isAlive: vi.fn().mockReturnValue(true),
        getState: vi.fn().mockReturnValue(AlienState.ATTACKING),
        followPath: vi.fn(),
        getAttackPath: vi.fn().mockReturnValue({ isComplete: () => false }),
        move: vi.fn(),
        setPosition: vi.fn(),
        setAlienState: vi.fn()
      };

      // Force 2 active waves manually
      (waveManager as any).activeWaves.push({ aliens: [activeAlien], active: true });
      (waveManager as any).activeWaves.push({ aliens: [activeAlien], active: true });
      
      vi.setSystemTime(5000); // Plenty of time passed
      // Random interval returns min (to try to launch)
      mockRandom.between.mockReturnValue(0);

      waveManager.update(16);
      
      // Should still be 2 because maxWaves is 2
      expect(waveManager.getActiveWaveCount()).toBe(2);
    });
  });

  describe('Wave Updates', () => {
    it('should update attacking aliens', () => {
      // Manually add an active wave
      const alien = mockAliens[0];
      alien.getState.mockReturnValue(AlienState.ATTACKING);
      
      const mockPath = {
        getCurrentPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
        isComplete: vi.fn().mockReturnValue(false)
      };
      alien.getAttackPath.mockReturnValue(mockPath);

      (waveManager as any).activeWaves.push({
        aliens: [alien],
        active: true,
        launchTime: 1000
      });

      waveManager.update(16);

      expect(alien.followPath).toHaveBeenCalled();
    });

    it('should transition to returning when path complete', () => {
      const alien = mockAliens[0];
      alien.getState.mockReturnValue(AlienState.ATTACKING);
      
      const mockPath = {
        isComplete: vi.fn().mockReturnValue(true)
      };
      alien.getAttackPath.mockReturnValue(mockPath);

      (waveManager as any).activeWaves.push({
        aliens: [alien],
        active: true
      });

      waveManager.update(16);

      expect(alien.setAlienState).toHaveBeenCalledWith(AlienState.RETURNING);
    });

    it('should update returning aliens', () => {
      const alien = mockAliens[0];
      alien.getState.mockReturnValue(AlienState.RETURNING);
      // Mock distance calculation logic inside updateReturnToFormation
      // It uses alien.x/y and formation position
      alien.x = 200;
      alien.y = 200;
      // Target is 0, 100 (from setup)
      // Distance is ~223 > 5

      (waveManager as any).activeWaves.push({
        aliens: [alien],
        active: true
      });

      waveManager.update(16);

      expect(alien.move).toHaveBeenCalled();
    });

    it('should snap returning aliens to formation when close', () => {
      const alien = mockAliens[0];
      alien.getState.mockReturnValue(AlienState.RETURNING);
      // Close to target
      alien.x = 1; // Target is 0
      alien.y = 101; // Target is 100
      // Distance is sqrt(1^2 + 1^2) = 1.4 < 5

      (waveManager as any).activeWaves.push({
        aliens: [alien],
        active: true
      });

      waveManager.update(16);

      expect(alien.setPosition).toHaveBeenCalledWith(0, 100);
      expect(alien.setAlienState).toHaveBeenCalledWith(AlienState.IN_FORMATION);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup waves when all aliens done', () => {
      const alien = mockAliens[0];
      alien.getState.mockReturnValue(AlienState.IN_FORMATION); // Done

      (waveManager as any).activeWaves.push({
        aliens: [alien],
        active: true
      });

      waveManager.update(16);

      expect(waveManager.getActiveWaveCount()).toBe(0);
    });
  });
});
