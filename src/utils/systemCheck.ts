import { LocalStorage } from './localStorage';

export type SystemCheckStatus = 'ok' | 'warn' | 'fail';

export type SystemCheckResult = {
  label: string;
  status: SystemCheckStatus;
  detail: string;
};

type ComputeOptions = {
  gamepadTotal?: number;
  faceCountOverride?: number;
  localStorageAvailable?: boolean;
};

function isLocalStorageAvailable(): { available: boolean; detail?: string } {
  try {
    const testKey = '__system_check__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return { available: true };
  } catch (error: any) {
    return { available: false, detail: error?.message || 'Unavailable' };
  }
}

export function computeSystemChecks(options: ComputeOptions = {}): SystemCheckResult[] {
  const { available, detail } =
    typeof options.localStorageAvailable === 'boolean'
      ? { available: options.localStorageAvailable, detail: undefined }
      : isLocalStorageAvailable();

  const faceCount =
    typeof options.faceCountOverride === 'number'
      ? options.faceCountOverride
      : LocalStorage.getFaceHistory().length;

  const gamepadTotal = typeof options.gamepadTotal === 'number' ? options.gamepadTotal : 0;

  const results: SystemCheckResult[] = [];

  results.push({
    label: 'LOCAL STORAGE',
    status: available ? 'ok' : 'fail',
    detail: available ? 'Available' : `Unavailable${detail ? ` (${detail})` : ''}`
  });

  results.push({
    label: 'FACE CACHE',
    status: faceCount > 0 ? 'ok' : 'warn',
    detail: faceCount > 0 ? `${faceCount} face(s) detected` : 'No faces stored'
  });

  results.push({
    label: 'CONTROLLER',
    status: gamepadTotal > 0 ? 'ok' : 'warn',
    detail: gamepadTotal > 0 ? 'Controller connected' : 'No controller detected'
  });

  return results;
}
