import { access, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.EXTENDER_UI_URL ?? "http://127.0.0.1:5173";
const outputDir = new URL("../docs/assets/screenshots/", import.meta.url);

const screenshotTargets = [
  ["builder.png", "/canvas-design"],
  ["control-panel.png", "/application/application-95a8/control_panel"],
  ["visual-servoing-monitor.png", "/application/application-95a8/visual_servoing_monitor"],
];

const executableCandidates = [
  process.env.PLAYWRIGHT_CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const findExecutablePath = async () => {
  for (const candidate of executableCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate, then fall back to Playwright's bundled browser.
    }
  }

  return undefined;
};

await mkdir(outputDir, { recursive: true });

const executablePath = await findExecutablePath();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

for (const [fileName, path] of screenshotTargets) {
  const url = new URL(path, baseUrl).toString();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({
    path: new URL(fileName, outputDir).pathname,
    fullPage: false,
  });
}

await browser.close();
