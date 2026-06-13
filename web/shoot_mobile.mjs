// Responsive audit of the production dist demo.
// For each breakpoint × each tab: assert zero horizontal page scroll
// (documentElement.scrollWidth ≤ viewport), then screenshot. Captures the
// review shots at 375px (all tabs) and a 1440px overview.
//
// Playwright isn't a project dep — resolve it from wherever it's cached.
import { createRequire } from "module";
const BASES = [
  import.meta.url,
  "/Users/kakoullig/.npm/_npx/e41f203b7505f1fb/node_modules/_.cjs",
];
let chromium;
for (const base of BASES) {
  try { ({ chromium } = createRequire(base)("playwright")); break; } catch {}
}
if (!chromium) { console.error("playwright not resolvable"); process.exit(2); }

const URL = process.env.DEMO_URL || "http://localhost:8901/dashboard.html";
const BREAKPOINTS = [
  { w: 375,  h: 812,  shootAllTabs: true },   // iPhone SE / mini
  { w: 414,  h: 896 },                         // iPhone Plus/Max
  { w: 768,  h: 1024 },                        // iPad portrait
  { w: 1440, h: 900,  shootOverview: true },   // desktop reference
];
const TABS = ["OVERVIEW", "COMPANIES", "CONNECTIONS", "NETWORK", "FLAGS"];

const browser = await chromium.launch();
let failures = 0;
const consoleErrors = [];

for (const bp of BREAKPOINTS) {
  const page = await browser.newPage({ viewport: { width: bp.w, height: bp.h } });
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${bp.w}px ${m.text()}`); });
  page.on("pageerror", (e) => consoleErrors.push(`${bp.w}px ${String(e)}`));

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  await page.getByText("VIEW DEMO ANALYSIS").click();
  await page.waitForTimeout(2600); // count-ups + fadeUp settle

  console.log(`\n── ${bp.w}×${bp.h} ──`);
  for (const t of TABS) {
    await page.getByRole("button", { name: t, exact: true }).click();
    await page.waitForTimeout(700);

    const m = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      inner: window.innerWidth,
    }));
    const overflow = m.scrollW - m.inner;
    const ok = overflow <= 1; // sub-pixel tolerance
    if (!ok) failures++;
    console.log(`  ${t.padEnd(12)} scrollW=${m.scrollW} inner=${m.inner}  ${ok ? "✓ no h-scroll" : `✗ OVERFLOW +${overflow}px`}`);

    if (bp.shootAllTabs) {
      await page.screenshot({ path: `screenshots/mobile_375_${t.toLowerCase()}.png`, fullPage: true });
    }
    if (bp.shootOverview && t === "OVERVIEW") {
      await page.screenshot({ path: `screenshots/desktop_1440_overview.png`, fullPage: true });
    }
  }
  await page.close();
}

await browser.close();
console.log(`\nconsole errors: ${consoleErrors.length ? "\n  " + consoleErrors.join("\n  ") : "none"}`);
console.log(failures ? `\nRESULT: ${failures} overflow failure(s) ✗` : "\nRESULT: zero horizontal scroll at every breakpoint ✓");
process.exit(failures || consoleErrors.length ? 1 : 0);
