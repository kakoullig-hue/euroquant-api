// Step 1 screenshots: upload hero (idle / focus / rejection) and the
// ephemeral pipeline log (analyze route stalled so the log stays visible).
import { chromium } from "playwright";

const URL = "http://localhost:5173/dashboard.html";
const OUT = "screenshots";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.route("**/api/health", (r) => r.fulfill({ status: 200, json: { status: "ok" } }));
await page.route("**/api/v1/analyze", () => {}); // never fulfil -> stage log runs

await page.goto(URL);
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/step1_upload_hero.png` });

await page.keyboard.press("Tab");
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/step1_upload_focus.png` });

await page.setInputFiles("input[type=file]", {
  name: "captable.xlsx", mimeType: "application/vnd.ms-excel", buffer: Buffer.from("not a pdf"),
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/step1_upload_rejection.png` });

await page.setInputFiles("input[type=file]", {
  name: "captable_demo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 demo"),
});
await page.waitForTimeout(5200); // elapsed ~5s -> stage 02 EXTRACT active
await page.screenshot({ path: `${OUT}/step1_pipeline_log.png` });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
