#!/usr/bin/env bash
# Rebuild vendor/bp-studio/core.mjs from a pinned BP Studio commit (MIT).
# Usage: vendor/bp-studio/build.sh [path-to-existing-checkout]
set -euo pipefail
COMMIT=507981157194b13634761c3a2e39565754b6cbbb
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-}"
if [ -z "$SRC" ]; then
  SRC="$(mktemp -d)/box-pleating-studio"
  git clone -q https://github.com/bp-studio/box-pleating-studio "$SRC"
fi
git -C "$SRC" checkout -q "$COMMIT" 2>/dev/null || [ "$(git -C "$SRC" rev-parse HEAD)" = "$COMMIT" ]
mkdir -p "$SRC/src/origami-compiler"
cp "$HERE/entry.ts" "$SRC/src/origami-compiler/entry.ts"
cat > "$SRC/src/origami-compiler/tsconfig.json" <<'JSON'
{ "extends": "../shared/tsconfig", "compilerOptions": { "paths": { "*": ["../*"] } }, "include": ["./*.ts", "../core/**/*.ts", "../shared/**/*.ts"] }
JSON
"$HERE/../../node_modules/.bin/esbuild" "$SRC/src/origami-compiler/entry.ts" \
  --bundle --format=esm --platform=neutral --target=es2022 \
  --tsconfig="$SRC/src/origami-compiler/tsconfig.json" \
  --legal-comments=inline \
  --banner:js="// Box Pleating Studio core, (c) 2020-present Mu-Tsun Tsai, MIT licence (see LICENSE.md). Built from commit $COMMIT by vendor/bp-studio/build.sh. Do not edit." \
  --outfile="$HERE/core.mjs"
cp "$SRC/LICENSE.md" "$HERE/LICENSE.md"
echo "built $HERE/core.mjs from $COMMIT"
