# Version Management

This project uses automatic version synchronization to ensure version numbers are consistent across the codebase and for update notifications.

## How It Works

When you push to your repository, Cloudflare automatically:
1. Runs `npm run build`
2. This triggers `npm run prebuild` (via npm lifecycle)
3. Which runs `npm run generate-version`
4. The script reads `package.json` and generates:
   - `src/version.ts` - TypeScript constant used by the app
   - `public/version.json` - JSON file for remote version checking

## Auto-Update Notifications

When users are on the main menu:
- The game checks `/version.json` every 5 minutes
- If a newer version is detected, a notification appears
- Users can click the notification or press `R` to reload

## Releasing a New Version

To release a new version:

1. **Update version in package.json:**
   ```bash
   npm version patch  # For bug fixes (1.0.0 → 1.0.1)
   npm version minor  # For new features (1.0.0 → 1.1.0)
   npm version major  # For breaking changes (1.0.0 → 2.0.0)
   ```

2. **Commit and push:**
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z"
   git push
   ```

3. **Cloudflare auto-deploys:**
   - Cloudflare detects the push
   - Runs the build (which auto-generates version files)
   - Deploys the new version
   - Users on old version see update notification

## Manual Version Generation

To manually regenerate version files (rarely needed):
```bash
npm run generate-version
```

## Files Involved

- **`package.json`** - Source of truth for version number
- **`scripts/generate-version.js`** - Script that generates version files
- **`src/version.ts`** - Auto-generated TypeScript constant
- **`public/version.json`** - Auto-generated JSON for remote checking
- **`src/utils/versionChecker.ts`** - Utility for checking updates
- **`src/scenes/MenuScene.ts`** - Shows update notifications

## Testing Locally

To test the update notification:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, simulate a new version:
   ```bash
   echo '{"version": "99.0.0"}' > public/version.json
   ```

3. Wait up to 5 minutes (or refresh the page)
4. You'll see the update notification appear

## Important Notes

- ✅ Version files are committed to git (so they work in dev)
- ✅ Version is auto-generated on every build
- ✅ No manual editing of `src/version.ts` or `public/version.json` needed
- ✅ Just update `package.json` and push!
