import { describe, it, expect, vi } from 'vitest';
import { computeSystemChecks } from '../../../src/utils/systemCheck';
import { LocalStorage } from '../../../src/utils/localStorage';

vi.mock('../../../src/utils/localStorage', () => ({
  LocalStorage: {
    getFaceHistory: vi.fn().mockReturnValue([{ id: '1' }])
  }
}));

describe('computeSystemChecks', () => {
  it('reports ok when storage available, faces present, and controller detected', () => {
    const results = computeSystemChecks({
      localStorageAvailable: true,
      faceCountOverride: 2,
      gamepadTotal: 1
    });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'LOCAL STORAGE', status: 'ok' }),
        expect.objectContaining({ label: 'FACE CACHE', status: 'ok' }),
        expect.objectContaining({ label: 'CONTROLLER', status: 'ok' })
      ])
    );
  });

  it('warns when no faces or controller and storage unavailable', () => {
    (LocalStorage.getFaceHistory as any).mockReturnValue([]);
    const results = computeSystemChecks({
      localStorageAvailable: false,
      gamepadTotal: 0
    });

    const storage = results.find(r => r.label === 'LOCAL STORAGE');
    const faces = results.find(r => r.label === 'FACE CACHE');
    const controller = results.find(r => r.label === 'CONTROLLER');

    expect(storage?.status).toBe('fail');
    expect(faces?.status).toBe('warn');
    expect(controller?.status).toBe('warn');
  });
});
