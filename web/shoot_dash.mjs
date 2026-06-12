// Capture the dashboard (demo mode) — usage: node shoot_dash.mjs <outname> [tab]
import { chromium } from "playwright";

const out = process.argv[2] || "dash.png";
const tab = process.argv[3]; // optional tab to click (COMPANIES, FLAGS, ...)

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.route("**/api/health", (r) => r.fulfill({ status: 200, json: { status: "ok" } }));

await page.goto("http://localhost:5173/dashboard.html");
await page.waitForTimeout(600);
await page.getByText("VIEW DEMO ANALYSIS").click();
if (tab) {
  await page.getByRole("button", { name: tab, exact: true }).click();
}
await page.waitForTimeout(4000); // let count-ups and fadeUp stagger settle
await page.screenshot({ path: `screenshots/${out}`, fullPage: true });
console.log(`${out} captured · console errors:`, errors.length ? errors : "none");
await browser.close();
