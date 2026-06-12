// Capture the store (web/index.html via file://) — usage: node shoot_store.mjs <outname> [width] [height]
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const out = process.argv[2] || "store.png";
const width = parseInt(process.argv[3] || "1440", 10);
const height = parseInt(process.argv[4] || "900", 10);

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("file://" + path.join(here, "index.html"));
await page.waitForLoadState("networkidle");
// scroll through the page so IntersectionObserver reveals fire, then return to top
await page.evaluate(async () => {
  for (let y = 0; y <= document.body.scrollHeight; y += 400) {
    window.scrollTo({ top: y, behavior: "instant" });
    await new Promise(r => setTimeout(r, 80));
  }
  window.scrollTo({ top: 0, behavior: "instant" });
});
await page.waitForTimeout(900); // fonts + specimen reveal settle
await page.screenshot({ path: `screenshots/${out}`, fullPage: true });
console.log(`${out} captured @${width}x${height} · console errors:`, errors.length ? errors : "none");
await browser.close();
