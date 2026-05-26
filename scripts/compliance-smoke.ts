/**
 * Headless smoke test for CompliancePage at 3 viewports.
 * - Asserts no console error
 * - Asserts no horizontal overflow (document.scrollWidth - innerWidth <= 1)
 * - Captures screenshot per viewport
 *
 * Usage: npx tsx scripts/compliance-smoke.ts
 * Requires dev server already running on http://127.0.0.1:5180
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:5180';
const OUT = resolve('test-results', 'compliance-smoke');
mkdirSync(OUT, { recursive: true });

type ViewportResult = {
  name: string;
  width: number;
  height: number;
  docOverflow: number;
  bodyOverflow: number;
  consoleErrors: number;
  passed: boolean;
};

const viewports = [
  { name: 'mobile-390', width: 390, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

const browser = await chromium.launch();
let allOk = true;
const results: ViewportResult[] = [];

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Vapor UI Compliance Workbench', { timeout: 8000 });

  const overflow = await page.evaluate(() => ({
    docOverflow:
      document.documentElement.scrollWidth - window.innerWidth,
    bodyOverflow: document.body.scrollWidth - window.innerWidth,
  }));

  const shot = resolve(OUT, `${vp.name}.png`);
  await page.screenshot({ path: shot, fullPage: false });

  const okOverflow = overflow.docOverflow <= 1 && overflow.bodyOverflow <= 1;
  const okErrors = errors.length === 0;
  const status = okOverflow && okErrors ? 'PASS' : 'FAIL';
  if (status !== 'PASS') allOk = false;

  results.push({
    name: vp.name,
    width: vp.width,
    height: vp.height,
    docOverflow: overflow.docOverflow,
    bodyOverflow: overflow.bodyOverflow,
    consoleErrors: errors.length,
    passed: status === 'PASS',
  });

  console.log(
    `[${vp.name}] ${status} doc=${overflow.docOverflow} body=${overflow.bodyOverflow} errors=${errors.length}`,
  );
  if (errors.length) errors.forEach((e) => console.log(`  console.error: ${e}`));
  console.log(`  -> ${shot}`);
  await ctx.close();
}

await browser.close();

const resultJson = resolve(OUT, 'result.json');
writeFileSync(
  resultJson,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      url: URL,
      anyOverflow: results.some((r) => r.docOverflow > 1 || r.bodyOverflow > 1),
      testedBreakpoints: results.map((r) => r.name),
      viewports: results,
    },
    null,
    2,
  ),
);
console.log(`-> ${resultJson}`);

process.exit(allOk ? 0 : 1);
