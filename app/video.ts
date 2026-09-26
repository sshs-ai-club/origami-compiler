// Record the motion player to a video file with headless Chromium.
// Dev/offline tool only; Playwright is a devDependency and loaded lazily.

import { mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function recordPlayer(playerPath: string, outFile: string, opts: { speed?: number; width?: number; height?: number } = {}): Promise<string> {
  const { chromium } = await import("playwright");
  const width = opts.width ?? 800;
  const height = opts.height ?? 760;
  const tmp = join(dirname(resolve(outFile)), ".video-tmp");
  mkdirSync(tmp, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: tmp, size: { width, height } } });
    const page = await context.newPage();
    await page.goto(`${pathToFileURL(resolve(playerPath)).href}?autoplay=1&speed=${opts.speed ?? 2}`);
    await page.waitForFunction(() => (globalThis as unknown as { __done?: boolean }).__done === true, undefined, { timeout: 10 * 60_000 });
    await page.waitForTimeout(1200); // hold the final frame
    const video = page.video();
    await context.close();
    const src = await video!.path();
    renameSync(src, outFile);
    return outFile;
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}
