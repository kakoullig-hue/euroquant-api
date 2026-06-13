// Verify the production dist demo: five tabs, zero console errors.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:8901/dashboard.html");
await page.waitForTimeout(800);
await page.getByText("VIEW DEMO ANALYSIS").click();
await page.waitForTimeout(4200); // count-ups + fadeUp stagger settle

const tabs = ["OVERVIEW", "COMPANIES", "CONNECTIONS", "NETWORK", "FLAGS"];
for (const t of tabs) {
  await page.getByRole("button", { name: t, exact: true }).click();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `screenshots/dist_tab_${t.toLowerCase()}.png`, fullPage: true });
  console.log(`tab ${t}: captured`);
}
console.log("console errors:", errors.length ? errors : "none");
await browser.close();
process.exit(errors.length ? 1 : 0);
