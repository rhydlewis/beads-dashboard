#!/bin/bash
# Release script for beads-dashboard
# Usage: ./scripts/release.sh [patch|minor|major] [bead-id] [release message]

set -e  # Exit on error

VERSION_BUMP=${1:-patch}
BEAD_ID=$2
RELEASE_MESSAGE=$3

# Validate version bump argument
if [[ ! "$VERSION_BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "❌ Error: First argument must be 'patch', 'minor', or 'major'"
  echo "Usage: ./scripts/release.sh [patch|minor|major] [bead-id] [release message]"
  exit 1
fi

# Check if there are uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "❌ Error: You have uncommitted changes. Please commit or stash them first."
  git status -s
  exit 1
fi

echo "🚀 Starting release process..."
echo "   Version bump: $VERSION_BUMP"
if [[ -n "$BEAD_ID" ]]; then
  echo "   Bead ID: $BEAD_ID"
fi

# Close bead if ID provided
if [[ -n "$BEAD_ID" ]]; then
  echo ""
  echo "📋 Closing bead $BEAD_ID..."
  bd close "$BEAD_ID"
fi

# Build the project
echo ""
echo "🔨 Building project..."
npm run build

# Run npm version
echo ""
echo "📦 Bumping version ($VERSION_BUMP)..."
if [[ -n "$RELEASE_MESSAGE" ]]; then
  npm version "$VERSION_BUMP" -m "chore: release %s - $RELEASE_MESSAGE"
else
  npm version "$VERSION_BUMP" -m "chore: release %s"
fi

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "   New version: v$NEW_VERSION"

# Push commits and tags
echo ""
echo "⬆️  Pushing to remote..."
git push
git push --tags

# Create GitHub release
echo ""
echo "🎉 Creating GitHub release v$NEW_VERSION..."
if [[ -n "$RELEASE_MESSAGE" ]]; then
  gh release create "v$NEW_VERSION" --title "v$NEW_VERSION" --notes "$RELEASE_MESSAGE" --generate-notes
else
  gh release create "v$NEW_VERSION" --generate-notes
fi

# Publish to npm
echo ""
echo "📦 Publishing to npm..."
cd dist && npm publish && cd ..

echo ""
echo "✅ Release complete! Version v$NEW_VERSION published to GitHub and npm."
echo ""
echo "📝 Next steps:"
echo "   - Review the release at: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/v$NEW_VERSION"
echo "   - Check npm package at: https://www.npmjs.com/package/beads-dashboard"
