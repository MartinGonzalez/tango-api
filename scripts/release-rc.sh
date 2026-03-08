#!/usr/bin/env bash
set -euo pipefail

# Ensure we're on main
branch=$(git branch --show-current)
if [ "$branch" != "main" ]; then
  echo "Error: must be on main (currently on '$branch')" >&2
  exit 1
fi

# Ensure working tree is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree has uncommitted changes" >&2
  exit 1
fi

# Push latest commits
git push origin main

# Find latest rc tag and increment
latest=$(git tag --sort=-v:refname | grep '^v0\.0\.2-rc' | head -1)
if [ -z "$latest" ]; then
  echo "Error: no existing v0.0.2-rc* tags found" >&2
  exit 1
fi

rc_num=$(echo "$latest" | sed 's/v0\.0\.2-rc//')
next=$((rc_num + 1))
tag="v0.0.2-rc${next}"

# Create and push tag
git tag "$tag"
git push origin "$tag"

echo "$tag"
