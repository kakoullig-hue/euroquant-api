import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

const resp = await page.goto("https://demo.euroquant.io/", { waitUntil: "networkidle", timeout: 40000 });
console.log("HTTP", resp.status(), "· title:", await page.title());
await page.waitForTimeout(700);
const hasEntry = await page.getByText("VIEW DEMO ANALYSIS").count();
console.log("VIEW DEMO ANALYSIS entry present:", hasEntry === 1);

await page.getByText("VIEW DEMO ANALYSIS").click();
await page.waitForTimeout(4200);
const tabs = ["OVERVIEW", "COMPANIES", "CONNECTIONS", "NETWORK", "FLAGS"];
for (const t of tabs) {
  const btn = page.getByRole("button", { name: t, exact: true });
  const ok = await btn.count();
  if (ok) { await btn.click(); await page.waitForTimeout(1200); }
  console.log(`  tab ${t}: ${ok ? "reachable ✓" : "MISSING ✗"}`);
}
await page.screenshot({ path: "screenshots/live_network.png", fullPage: true });
console.log("console errors:", errors.length ? errors : "NONE");
await browser.close();
