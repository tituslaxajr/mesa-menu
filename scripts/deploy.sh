#!/usr/bin/env bash
# One-command production deploy for Mesa. Run this ON THE SERVER.
#   bash scripts/deploy.sh
# It pulls the latest main, does a clean PRODUCTION build, and (re)starts the
# app under pm2. A clean build is what fixes the "Module not found" state that
# `next dev` gets into when new files are pulled under a running dev server.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Pulling latest main…"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "→ Installing dependencies…"
npm ci

echo "→ Clean production build (clears stale .next module graph)…"
rm -rf .next
npm run build

echo "→ (Re)starting under pm2…"
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.js
  pm2 save
  echo "✓ Deployed. Live under pm2 (process: mesa)."
else
  echo "pm2 not found. Either install it (npm i -g pm2) and re-run,"
  echo "or serve the production build directly with:  npm run start"
fi
