/**
 * VersionChecker
 *
 * Utility for checking if a new version of the game is available.
 * Fetches version information from a remote endpoint and compares with current version.
 */

export interface VersionCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  error?: boolean;
  errorMessage?: string;
}

export class VersionChecker {
  private static readonly DEFAULT_VERSION_URL = '/version.json';

  /**
   * Check if a new version is available
   * @param currentVersion - The current version of the game (e.g., "1.0.0")
   * @param versionUrl - Optional custom URL to check for version info
   * @returns Promise with version check result
   */
  static async checkForUpdate(
    currentVersion: string,
    versionUrl: string = this.DEFAULT_VERSION_URL
  ): Promise<VersionCheckResult> {
    try {
      const response = await fetch(versionUrl);

      if (!response.ok) {
        return {
          updateAvailable: false,
          currentVersion,
          error: true,
          errorMessage: `HTTP error: ${response.status}`
        };
      }

      const data = await response.json();

      if (!data.version || typeof data.version !== 'string') {
        return {
          updateAvailable: false,
          currentVersion,
          error: true,
          errorMessage: 'Invalid version data'
        };
      }

      const latestVersion = data.version;
      const comparison = this.compareVersions(latestVersion, currentVersion);
      const updateAvailable = comparison > 0;

      return {
        updateAvailable,
        currentVersion,
        latestVersion,
        error: false
      };
    } catch (error) {
      return {
        updateAvailable: false,
        currentVersion,
        error: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Compare two semantic version strings
   * @param v1 - First version (e.g., "1.2.0")
   * @param v2 - Second version (e.g., "1.1.0")
   * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }
}
