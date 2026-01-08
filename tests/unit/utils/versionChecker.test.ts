import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VersionChecker } from '../../../src/utils/versionChecker';

describe('VersionChecker', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  describe('checkForUpdate', () => {
    it('should return update available when remote version is newer', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ version: '1.2.0' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await VersionChecker.checkForUpdate('1.1.0');

      expect(result.updateAvailable).toBe(true);
      expect(result.currentVersion).toBe('1.1.0');
      expect(result.latestVersion).toBe('1.2.0');
    });

    it('should return no update when versions are equal', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ version: '1.1.0' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await VersionChecker.checkForUpdate('1.1.0');

      expect(result.updateAvailable).toBe(false);
      expect(result.currentVersion).toBe('1.1.0');
      expect(result.latestVersion).toBe('1.1.0');
    });

    it('should return no update when current version is newer', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ version: '1.0.0' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await VersionChecker.checkForUpdate('1.1.0');

      expect(result.updateAvailable).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const result = await VersionChecker.checkForUpdate('1.1.0');

      expect(result.updateAvailable).toBe(false);
      expect(result.error).toBe(true);
    });

    it('should handle HTTP errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 404
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await VersionChecker.checkForUpdate('1.1.0');

      expect(result.updateAvailable).toBe(false);
      expect(result.error).toBe(true);
    });

    it('should handle malformed JSON gracefully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ invalidField: 'no version' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const result = await VersionChecker.checkForUpdate('1.1.0');

      expect(result.updateAvailable).toBe(false);
      expect(result.error).toBe(true);
    });

    it('should use custom version URL when provided', async () => {
      const customUrl = 'https://example.com/custom-version.json';
      const mockResponse = {
        ok: true,
        json: async () => ({ version: '2.0.0' })
      };
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      await VersionChecker.checkForUpdate('1.0.0', customUrl);

      expect(global.fetch).toHaveBeenCalledWith(customUrl);
    });
  });

  describe('compareVersions', () => {
    it('should return 1 when v1 > v2', () => {
      expect(VersionChecker.compareVersions('1.2.0', '1.1.0')).toBe(1);
      expect(VersionChecker.compareVersions('2.0.0', '1.9.9')).toBe(1);
      expect(VersionChecker.compareVersions('1.0.1', '1.0.0')).toBe(1);
    });

    it('should return -1 when v1 < v2', () => {
      expect(VersionChecker.compareVersions('1.1.0', '1.2.0')).toBe(-1);
      expect(VersionChecker.compareVersions('1.9.9', '2.0.0')).toBe(-1);
      expect(VersionChecker.compareVersions('1.0.0', '1.0.1')).toBe(-1);
    });

    it('should return 0 when versions are equal', () => {
      expect(VersionChecker.compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(VersionChecker.compareVersions('2.5.3', '2.5.3')).toBe(0);
    });

    it('should handle versions with different segment counts', () => {
      expect(VersionChecker.compareVersions('1.0', '1.0.0')).toBe(0);
      expect(VersionChecker.compareVersions('1.0.0', '1.0')).toBe(0);
      expect(VersionChecker.compareVersions('1.1', '1.0.0')).toBe(1);
    });
  });
});
