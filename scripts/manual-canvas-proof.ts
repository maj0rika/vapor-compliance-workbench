// Direct browser control to prove NL chip → Canvas renders.
// Launches headed Chromium, hits localhost:5190, mocks chat,
// triggers all 4 NL chips, captures screenshots.
import { chromium } from '@playwright/test';
import { selectScript } from '../src/legacy/agent/scripts.ts';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SHOT_DIR = resolve(process.cwd(), 'playwright-report/manual-proof');
mkdirSync(SHOT_DIR, { recursive: true });

const BASE = process.env.BASE_URL ?? 'http://localhost:5190';

function toSseFrame(content) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function buildSseBody(reply, artifact) {
  const chunks = [];
  if (reply) chunks.push(toSseFrame(reply));
  if (artifact) chunks.push(toSseFrame(`\n\n${artifact}`));
  chunks.push('data: [DONE]\n\n');
  return chunks.join('');
}

async function setupMock(page) {
  await page.route('**/api/deepseek/chat', async (route) => {
    try {
      const raw = route.request().postData() ?? '{}';
      const request = JSON.parse(raw);
      const mode = request.mode ?? 'component';
      const script = selectScript(request.text ?? '', mode);
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
        },
        body: buildSseBody(script.reply, script.draft),
      });
    } catch (err) {
      await route.fulfill({ status: 500, body: String(err) });
    }
  });
}

const SCENARIOS = [
  {
    name: '1-primary-button',
    chip: 'Vapor primary 버튼 컴포넌트 생성, 다크 모드 지원, Tooltip 포함',
    mode: null,
  },
  {
    name: '2-data-table',
    chip: '고정 헤더가 있는 DataTable 컴포넌트, 정렬·페이지네이션 포함',
    mode: null,
  },
  {
    name: '3-a11y',
    chip: '첨부한 IconButton 의 접근성 결함 찾아서 수정 코드와 axe 테스트 작성',
    mode: '접근성 점검',
  },
  {
    name: '4-token-sync',
    chip: 'Figma Variables JSON 을 Vapor token CSS 로 변환하는 유틸',
    mode: '토큰 동기화',
  },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const sc of SCENARIOS) {
  const ctx = await browser.newContext({ viewport: { width: 1480, height: 960 } });
  const page = await ctx.newPage();
  await setupMock(page);
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: sc.chip }).click();
    if (sc.mode) {
      await page.getByLabel('자동화 모드 선택').click();
      await page.getByRole('option', { name: sc.mode }).click();
    }
    await page.getByRole('button', { name: '자동화 실행' }).click();
    await page.getByLabel('생성물 워크스페이스').waitFor({ timeout: 10_000 });

    if (sc.name === '4-token-sync') {
      await page.getByRole('tab', { name: '토큰 매핑' }).waitFor({ timeout: 8000 });
    } else {
      await page.locator('iframe[title="생성물 Canvas 미리보기"]').waitFor({
        timeout: 10_000,
      });
      const frame = page.frameLocator('iframe[title="생성물 Canvas 미리보기"]');
      await frame.locator('button, img').first().waitFor({ timeout: 12_000 });
    }
    const shot = resolve(SHOT_DIR, `${sc.name}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    results.push({ name: sc.name, ok: true, shot });
    console.log(`✓ ${sc.name} OK → ${shot}`);
  } catch (err) {
    const shot = resolve(SHOT_DIR, `${sc.name}-FAIL.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    results.push({ name: sc.name, ok: false, error: String(err), shot });
    console.error(`✗ ${sc.name} FAIL: ${err.message}`);
  } finally {
    await ctx.close();
  }
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 1);
