import { fileURLToPath } from "node:url";
const { chromium, webkit } = await import(
  process.env.IMD_PLAYWRIGHT || "playwright"
);
const { AxeBuilder } = await import(
  process.env.UNLK_AXE_MODULE || "@axe-core/playwright"
);
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
process.chdir(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
);
const root = path.resolve("dist");
const out = "test/scratch/browser";
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync("artifacts", { recursive: true });
const results = {
  checkedAt: new Date().toISOString(),
  pages: [],
  interactions: [],
  errors: [],
  webkit: null,
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith("/preview/")) {
    res.writeHead(404).end();
    return;
  }
  pathname = pathname.slice("/preview/".length) || "index.html";
  const file = path.resolve(root, pathname);
  if (!file.startsWith(root + path.sep) && file !== root) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (e, data) => {
    if (e) {
      res.writeHead(404).end();
      return;
    }
    const mime =
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".woff2": "font/woff2",
        ".md": "text/plain",
      }[path.extname(file)] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": mime });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/preview/`;
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().startsWith(base) && r.status() >= 400)
        errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(base);
    await page.waitForTimeout(5000);
    for (const route of [
      "",
      "trade",
      "unlock",
      "milestones",
      "activity",
      "how",
      "contracts",
    ]) {
      await page.goto(`${base}#/${route}`);
      await page.waitForTimeout(route === "activity" ? 5000 : 500);
      await page.evaluate(() => document.fonts.ready);
      const info = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
        h1: document.querySelector("h1")?.textContent,
        fonts: [
          document.fonts.check('16px "DM Sans"'),
          document.fonts.check('28px "Instrument Serif"'),
        ],
      }));
      const axe =
        width === 390
          ? await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          : null;
      results.pages.push({
        browser: "Chromium",
        route,
        width,
        ...info,
        accessibilityAudited: width === 390,
        violations:
          axe?.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })) ?? [],
      });
      await page.screenshot({
        path: `${out}/${width}-${route || "home"}.png`,
        fullPage:
          route === "trade" || route === "milestones" || route === "contracts",
      });
    }
    results.errors.push(...errors);
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole("link", { name: "Trade UNLK", exact: false }).click();
  await page.getByRole("button", { name: "Connect to trade" }).click();
  assert.equal(await page.getByRole("dialog").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").isVisible(), false);
  results.interactions.push("Mobile Trade entry, connect dialog, Escape close");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Milestones", exact: true })
    .click();
  await page.locator("#scenario-tier").selectOption("1");
  assert.match(await page.locator(".scenario-result").innerText(), /275/);
  assert.match(await page.locator(".scenario-result").innerText(), /150/);
  await page.locator("#scenario-tier").selectOption("6");
  assert.match(await page.locator(".scenario-result").innerText(), /1,250/);
  await page.locator("#scenario-E").fill("0");
  await page.locator("#scenario-tier").selectOption("1");
  assert.match(await page.locator(".scenario-result").innerText(), /0 UNLK/);
  results.interactions.push(
    "Scenario 35% and full-unlock outputs; transfer-only E=0 scenario",
  );
  await page.goto(`${base}#/how`);
  const faq = page.locator("details").nth(1);
  await faq.locator("summary").click();
  assert.equal(await faq.getAttribute("open"), "");
  await faq.locator("summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await faq.getAttribute("open"), null);
  results.interactions.push("FAQ pointer and keyboard disclosure");
  await page.goto(`${base}#/trade`);
  await page.getByRole("button", { name: "Sell UNLK", exact: true }).click();
  await page.locator("#trade-amount").fill("1.25");
  await page.locator("#slippage").selectOption("100");
  assert.match(await page.locator(".receive").innerText(), /router credit/);
  results.interactions.push(
    "Buy/Sell direction, decimal amount and slippage selection",
  );
  await page.goto(`${base}#/activity`);
  await page.locator("table tbody tr").first().waitFor({ timeout: 30000 });
  await page.locator("#activity-search").fill("no matching address");
  await page.getByText("No matching records.", { exact: false }).waitFor();
  assert.match(await page.locator("main").innerText(), /No matching records/);
  await page.locator("#activity-search").fill("");
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await page.locator("#event-kind").selectOption("Transfer");
  results.interactions.push("Holder filter, activity tab and event filter");
  await page.goto(`${base}#/trade`);
  await page.keyboard.press("Control+Home");
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => location.hash), "#/trade");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "main");
  results.interactions.push("Skip link retains route and focuses main");
  await context.close();
  const offline = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await offline.route("https://**/*", (r) => r.abort());
  const op = await offline.newPage();
  await op.goto(base);
  await op.getByRole("button", { name: "Connect wallet" }).click();
  assert.equal(await op.getByRole("dialog").isVisible(), true);
  results.interactions.push(
    "Connect control is available before RPC reads, including offline",
  );
  await offline.close();
  let wb;
  try {
    wb = await webkit.launch({ headless: true, timeout: 15000 });
    const wp = await Promise.race([
      wb.newPage({ viewport: { width: 390, height: 844 } }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(Error("WebKit did not create a page within 15 seconds")),
          15000,
        ),
      ),
    ]);
    await wp.goto(base);
    await wp.getByRole("link", { name: "Trade UNLK", exact: false }).click();
    await wp.getByRole("button", { name: "Connect to trade" }).click();
    assert.equal(await wp.getByRole("dialog").isVisible(), true);
    await wp.keyboard.press("Escape");
    await wp.screenshot({ path: `${out}/webkit-trade.png` });
    results.webkit = { passed: true };
    await wb.close();
  } catch (e) {
    results.webkit = { passed: false, error: String(e).slice(0, 4000) };
  } finally {
    await wb?.close().catch(() => {});
  }
} catch (e) {
  results.errors.push(String(e));
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  fs.writeFileSync(
    "artifacts/browser-validation.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        pages: results.pages.length,
        violations: results.pages.filter(
          (p) => p.violations.length || p.scroll > p.width,
        ),
        interactions: results.interactions,
        errors: results.errors,
        webkit: results.webkit,
      },
      null,
      2,
    ),
  );
}
