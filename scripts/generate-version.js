#!/usr/bin/env node

/**
 * Generate version files from package.json
 *
 * This script is run during the build process to ensure version numbers
 * are synchronized across the application.
 *
 * Generates:
 * - src/version.ts - TypeScript constant for the app
 * - public/version.json - JSON file for remote version checking
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

try {
  // Read package.json
  const packageJson = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf-8')
  );

  const version = packageJson.version;

  if (!version) {
    throw new Error('No version found in package.json');
  }

  console.log(`📦 Generating version files for v${version}...`);

  // Generate src/version.ts
  const versionTs = `/**
 * Application version
 * Auto-generated from package.json during build
 * Do not edit manually - changes will be overwritten
 */
export const APP_VERSION = '${version}';
`;

  writeFileSync(join(rootDir, 'src', 'version.ts'), versionTs, 'utf-8');
  console.log('✓ Generated src/version.ts');

  // Generate public/version.json
  const versionJson = JSON.stringify({ version }, null, 2) + '\n';

  writeFileSync(join(rootDir, 'public', 'version.json'), versionJson, 'utf-8');
  console.log('✓ Generated public/version.json');

  console.log(`✨ Version ${version} synchronized across all files`);

} catch (error) {
  console.error('❌ Error generating version files:', error.message);
  process.exit(1);
}
