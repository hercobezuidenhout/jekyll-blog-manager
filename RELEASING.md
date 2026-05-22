# Release Process

This document describes the release process for the Jequill Obsidian plugin using our trunk-based CI/CD workflow.

## Overview

We use a trunk-based development flow with three types of releases:

- **Beta Releases**: Automatic pre-releases created on every merge to `main` (BRAT-compatible)
- **Stable Releases**: Manual promotion of tested beta versions
- **Hotfix Releases**: Automatic patch releases for critical production bugs

## Development Workflow

### Creating a Pull Request

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   ```

3. **Update CHANGELOG.md** (required):
   - Add your changes under the `## [Unreleased]` section
   - Use the appropriate category: Added, Changed, Fixed, Removed
   - Example:
     ```markdown
     ## [Unreleased]
     
     ### Added
     - New distraction-free writing mode
     
     ### Fixed
     - Fixed bug with frontmatter parsing
     ```

4. Push and create PR:
   ```bash
   git push origin feature/my-feature
   # Open PR on GitHub
   ```

5. **PR Validation** will automatically run:
   - ✅ CHANGELOG.md modified
   - ✅ Type check passes
   - ✅ Lint passes
   - ✅ Build succeeds
   - ✅ Breaking changes properly labeled

### Handling Breaking Changes

If your PR contains breaking changes:

1. Include `BREAKING CHANGE:` in your commit message:
   ```
   feat: Redesign settings API
   
   BREAKING CHANGE: Settings structure changed from flat to nested
   ```

2. Add a label to your PR:
   - `bump:major` - for major version bump (e.g., 1.0.0 → 2.0.0)
   - `bump:minor` - for minor version bump (e.g., 1.0.0 → 1.1.0)

3. The PR check will fail without the label, preventing accidental breaking changes.

## Beta Releases (Automatic)

**Trigger**: Merging a PR to `main`

**What happens**:
1. GitHub Actions automatically runs
2. Calculates next version:
   - `0.1.0` → `0.2.0-beta.1` (first beta after stable)
   - `0.2.0-beta.1` → `0.2.0-beta.2` (increment beta)
   - With `bump:major`: `1.0.0-beta.1` (major bump)
3. Updates `package.json`, `manifest.json`, `versions.json`
4. Commits: `"bump: From v0.1.0 to v0.2.0-beta.1"`
5. Creates tag: `v0.2.0-beta.1`
6. Builds plugin
7. Creates GitHub pre-release with `main.js` and `manifest.json`

**Testing with BRAT**:
Users can install beta releases via [BRAT](https://github.com/TfTHacker/obsidian42-brat):
1. Install BRAT plugin
2. Add repository: `hercobezuidenhout/jequill`
3. BRAT auto-updates to new pre-releases

**No manual action required** - happens automatically on merge.

## Stable Releases (Manual)

**When**: After testing a beta release and confirming it's ready for production.

**How to trigger**:

1. Go to [Actions → Stable Release](https://github.com/hercobezuidenhout/jequill/actions/workflows/stable-release.yml)
2. Click "Run workflow"
3. Enter the beta version to promote (e.g., `0.2.0-beta.2`)
4. Click "Run workflow"
5. Approve the production deployment (if required)

**What happens**:
1. Validates the beta tag exists
2. Strips `-beta.X` suffix → stable version (e.g., `0.2.0`)
3. Updates versions in all files
4. Updates `CHANGELOG.md`:
   - Converts `## [Unreleased]` to `## [0.2.0] - 2026-05-22`
   - Adds new `## [Unreleased]` section
5. Commits: `"release: Release v0.2.0"`
6. Creates tag: `v0.2.0`
7. Builds plugin
8. Creates GitHub release (marked as **latest**)

**After stable release**:
- Obsidian's community plugin system can detect the release
- Users can manually install from GitHub releases
- BRAT users also get the stable version

## Hotfix Releases (Automatic)

**When**: Critical production bug that can't wait for next beta cycle.

**How to create**:

1. Create hotfix branch from the stable tag:
   ```bash
   git checkout v1.2.0
   git checkout -b hotfix/critical-bug-fix
   ```

2. Make your fix and update CHANGELOG.md:
   ```markdown
   ## [Unreleased]
   
   ### Fixed
   - Fixed critical security vulnerability in auth
   ```

3. Commit and push:
   ```bash
   git add .
   git commit -m "hotfix: Fix critical security issue"
   git push origin hotfix/critical-bug-fix
   ```

**What happens**:
1. GitHub Actions detects push to `hotfix/**`
2. Finds base stable version (e.g., `1.2.0`)
3. Increments patch: `1.2.1`
4. Updates all version files
5. Updates CHANGELOG.md
6. Commits: `"hotfix: Release v1.2.1"`
7. Creates tag and stable release

**After hotfix**:
- Merge the hotfix branch back to `main`:
  ```bash
  git checkout main
  git merge hotfix/critical-bug-fix
  git push origin main
  ```

## Version Numbers

We follow [Semantic Versioning](https://semver.org/):

- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features (backward compatible)
- **Patch** (0.0.X): Bug fixes

### Beta Versions

Beta versions use the format: `X.Y.Z-beta.N`

Examples:
- `0.1.0-beta.1` - First beta of 0.1.0
- `0.1.0-beta.2` - Second beta of 0.1.0
- `0.1.0` - Stable release (promoted from beta.2)

## Rollback Procedure

### Rollback a beta release

```bash
# Delete the tag
git push --delete origin v0.2.0-beta.1

# Delete the GitHub release (via web UI)

# Revert the version bump commit
git revert <commit-hash>
git push origin main
```

### Rollback a stable release

```bash
# Delete the tag
git push --delete origin v0.2.0

# Delete the GitHub release (via web UI)

# Revert the release commit
git revert <commit-hash>
git push origin main

# Re-run stable workflow with previous beta
```

## CHANGELOG Guidelines

Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

### Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

### Example

```markdown
## [Unreleased]

### Added
- New export to PDF feature
- Settings panel for customizing editor theme

### Changed
- Improved performance of post list rendering

### Fixed
- Fixed crash when opening settings on mobile
- Fixed frontmatter parsing for posts with special characters

### Removed
- Removed deprecated legacy import feature
```

## Verification Checklist

Before promoting to stable:

- [ ] Beta release installed and tested via BRAT
- [ ] All features work as expected
- [ ] No critical bugs reported
- [ ] Performance is acceptable
- [ ] CHANGELOG.md accurately reflects changes
- [ ] Documentation is up to date

## Troubleshooting

### PR validation fails on CHANGELOG check

**Problem**: Forgot to update CHANGELOG.md

**Solution**: Add changes to CHANGELOG.md and push again

### Beta release fails on version calculation

**Problem**: Invalid version format in package.json

**Solution**: Run `node scripts/sync-version.js <valid-version>` and commit

### Hotfix workflow can't find base version

**Problem**: No stable tags exist in history

**Solution**: Create hotfix branch from a tagged stable release, not from main

## Questions?

- Check [GitHub Actions logs](https://github.com/hercobezuidenhout/jequill/actions)
- Open an issue for workflow problems
- See CHANGELOG.md for release history
