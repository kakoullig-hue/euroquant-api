// Element clip — usage: node shoot_clip.mjs <selector> <outname> [width]
import { chromium } from "playwright";
const sel = process.argv[2] || ".sheet";
const out = process.argv[3] || "clip.png";
const width = parseInt(process.argv[4] || "375", 10);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto("file:///Users/kakoullig/Desktop/euroquant_v4/web/index.html");
await page.waitForLoadState("networkidle");
const el = page.locator(sel).first();
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await el.screenshot({ path: `screenshots/${out}` });
console.log(`${out} captured (${sel} @${width})`);
await browser.close();
