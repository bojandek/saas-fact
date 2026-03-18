#!/bin/bash
# Build factory-brain and sync dist/ -> src/ .js files
# CLI requires .js files in src/ directory

set -e
echo "Building factory-brain..."
npx tsc --noEmit false --outDir dist --module commonjs --moduleResolution node \
  --target ES2020 --esModuleInterop true --skipLibCheck true \
  --strict false --noEmitOnError false 2>&1 || true

echo "Syncing dist/ -> src/ .js files..."
find dist -maxdepth 1 -name "*.js" | while read f; do
  base=$(basename "$f")
  if [ -f "src/$base" ]; then
    cp "$f" "src/$base"
  fi
done

# Sync subdirectories
for subdir in llm memory metaclaw utils; do
  if [ -d "dist/$subdir" ]; then
    find "dist/$subdir" -name "*.js" | while read f; do
      rel="${f#dist/}"
      if [ -f "src/$rel" ]; then
        cp "$f" "src/$rel"
      fi
    done
  fi
done

echo "Build complete!"
