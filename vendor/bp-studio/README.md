# vendor/bp-studio

The core of [Box Pleating Studio](https://github.com/bp-studio/box-pleating-studio)
by Mu-Tsun Tsai, MIT licence (see `LICENSE.md`).

- `core.mjs` is **generated** by `build.sh` from commit
  `507981157194b13634761c3a2e39565754b6cbbb`: BP Studio's `src/core` and
  `src/shared`, plus our adapter `entry.ts`, bundled by esbuild. Do not edit it;
  change `entry.ts` and rebuild.
- `core.d.mts` types the adapter. Our caller is `design/blueprint.ts`.
- What it gives: flap and river contours (hinges), ridges and stretch gadgets
  for a tree plus flap positions. What it does not give: a flat-foldable
  crease pattern (BP Studio's manual says so). See `design/complete.ts`.
