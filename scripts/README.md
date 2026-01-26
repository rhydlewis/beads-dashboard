# Release Scripts

## Quick Usage

For most releases, use the npm scripts:

```bash
# Patch release (0.3.4 → 0.3.5)
npm run release:patch

# Minor release (0.3.4 → 0.4.0)
npm run release:minor

# Major release (0.3.4 → 1.0.0)
npm run release:major
```

## Advanced Usage

The release script supports additional arguments:

```bash
./scripts/release.sh [patch|minor|major] [bead-id] [release-message]
```

**Examples:**

```bash
# Basic patch release
./scripts/release.sh patch

# Close a bead and do a patch release
./scripts/release.sh patch beads-dashboard-abc

# Close a bead, add custom message, and do a minor release
./scripts/release.sh minor beads-dashboard-abc "Add widget feature"
```

## What the Script Does

1. **Validates** - Checks for uncommitted changes and valid version argument
2. **Closes Bead** - If bead ID provided, closes it with `bd close`
3. **Version Bump** - Runs `npm version [patch|minor|major]` with commit message
4. **Push** - Pushes commits and tags to remote
5. **GitHub Release** - Creates release using `gh release create` with auto-generated notes

## Requirements

- Clean working directory (no uncommitted changes)
- `bd` CLI installed (for closing beads)
- `gh` CLI installed and authenticated (for GitHub releases)
- Git remote configured

## After Release

The script will output next steps:
- Review the GitHub release
- Publish to npm: `cd dist && npm publish` (if you want to publish to npm registry)
