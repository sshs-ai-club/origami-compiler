import { configDefaults, defineConfig } from "vitest/config";

// The design tests run the grid-packing search on several grids; allow for it.
// Agent worktrees live under .claude/worktrees; their tests are not this checkout's.
export default defineConfig({ test: { testTimeout: 30_000, exclude: [...configDefaults.exclude, ".claude/**"] } });
