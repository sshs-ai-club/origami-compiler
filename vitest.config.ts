import { defineConfig } from "vitest/config";

// The design tests run the grid-packing search on several grids; allow for it.
export default defineConfig({ test: { testTimeout: 30_000 } });
