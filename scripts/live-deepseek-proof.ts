// 실 DeepSeek 호출로 NL chip → Canvas 렌더 검증.
// chat mock 없음. /api/deepseek/chat 가 dev server (5190) 로 실제 가서
// DEEPSEEK_API_KEY 로 라이브 호출 → 실 응답 본문이 PreviewPanel 에서
// 어떻게 처리되는지 그대로 본다. 응답 + 메타데이터 검증 결과 + 캔버스
// 상태를 모두 dump.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SHOT_DIR = resolve(process.cwd(), 'playwright-report/live-proof');
mkdirSync(SHOT_DIR, { recursive: true });

const BASE = process.env.BASE_URL ?? 'http://localhost:5190';
const TIMEOUT_MS = Number(process.env.LIVE_TIMEOUT_MS ?? 180_000);

const SCENARIOS = [
  {
    name: '1-primary-button',
    chip: 'Vapor primary 버튼 컴포넌트 생성, 다크 모드 지원, Tooltip 포함',
    mode: null,
    expectCanvas: true,
  },
  {
    name: '2-data-table',
    chip: '고정 헤더가 있는 DataTable 컴포넌트, 정렬·페이지네이션 포함',
    mode: null,
    expectCanvas: true,
  },
  {
    name: '3-a11y',
    chip: '첨부한 IconButton 의 접근성 결함 찾아서 수정 코드와 axe 테스트 작성',
    mode: '접근성 점검',
    expectCanvas: true,
  },
  {
    name: '4-token-sync',
    chip: 'Figma Variables JSON 을 Vapor token CSS 로 변환하는 유틸',
    mode: '토큰 동기화',
    expectCanvas: false,
  },
];

const browser = await chromium.launch({ headless: true });
const results: Array<{
  name: string;
  ok: boolean;
  durationMs: number;
  rawResponse?: string;
  metadataStatus?: string;
  metadataError?: string;
  canvasMounted?: boolean;
  iframeRendered?: boolean;
  tokenTabVisible?: boolean;
  error?: string;
  shot: string;
}> = [];

for (const sc of SCENARIOS) {
  const t0 = Date.now();
  const ctx = await browser.newContext({ viewport: { width: 1480, height: 960 } });
  const page = await ctx.newPage();
  const shot = resolve(SHOT_DIR, `${sc.name}.png`);
  const dump = resolve(SHOT_DIR, `${sc.name}.json`);
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: sc.chip }).click();
    if (sc.mode) {
      await page.getByLabel('자동화 모드 선택').click();
      await page.getByRole('option', { name: sc.mode }).click();
    }
    await page.getByRole('button', { name: '자동화 실행' }).click();
    // 어시스턴트 응답 done 까지 대기 (TIMEOUT_MS, 라이브 DeepSeek 는
    // 길게는 2분 이상 걸린다)
    await page
      .locator('[data-role="assistant"][data-status="done"]')
      .first()
      .waitFor({ timeout: TIMEOUT_MS });

    // 디버그 탭 → raw response 캡처
    const debugTab = page.getByRole('tab', { name: '디버그' });
    let rawResponse: string | undefined;
    if (await debugTab.isVisible().catch(() => false)) {
      await debugTab.click();
      rawResponse = await page
        .getByTestId('debug-response-body')
        .textContent({ timeout: 5000 })
        .catch(() => undefined) ?? undefined;
    }

    // 미리보기 탭으로 복귀
    const previewTab = page.getByRole('tab', { name: '미리보기' });
    if (await previewTab.isVisible().catch(() => false)) {
      await previewTab.click();
    }

    // 메타데이터 상태 (Canvas 사용 불가 vs iframe 마운트)
    const canvasUnavailable = await page
      .getByText('Canvas 사용 불가')
      .isVisible()
      .catch(() => false);
    const metadataError = await page
      .locator('text=/메타데이터 검증 실패:.*$/')
      .first()
      .textContent({ timeout: 2000 })
      .catch(() => undefined) ?? undefined;
    const iframeLocator = page.locator('iframe[title="생성물 Canvas 미리보기"]');
    const iframeMounted = await iframeLocator.isVisible().catch(() => false);
    let iframeRendered = false;
    if (iframeMounted) {
      const frame = page.frameLocator('iframe[title="생성물 Canvas 미리보기"]');
      iframeRendered = await frame
        .locator('button, img')
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
    }
    const tokenTabVisible = await page
      .getByRole('tab', { name: '토큰 매핑' })
      .isVisible()
      .catch(() => false);

    await page.screenshot({ path: shot, fullPage: true });

    let ok = false;
    if (sc.expectCanvas) {
      ok = !canvasUnavailable && iframeMounted && iframeRendered;
    } else {
      ok = tokenTabVisible;
    }

    const record = {
      name: sc.name,
      ok,
      durationMs: Date.now() - t0,
      rawResponse,
      metadataStatus: canvasUnavailable ? 'unavailable' : 'available',
      metadataError,
      canvasMounted: iframeMounted,
      iframeRendered,
      tokenTabVisible,
      shot,
    };
    writeFileSync(dump, JSON.stringify(record, null, 2));
    results.push(record);
    console.log(
      `${ok ? '✓' : '✗'} ${sc.name} (${record.durationMs}ms) — canvas=${record.metadataStatus} iframe=${iframeMounted} rendered=${iframeRendered} tokenTab=${tokenTabVisible}`,
    );
    if (metadataError) console.log(`    metadata error: ${metadataError}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    results.push({
      name: sc.name,
      ok: false,
      durationMs: Date.now() - t0,
      error: message,
      shot,
    });
    console.error(`✗ ${sc.name} ERROR (${Date.now() - t0}ms): ${message}`);
  } finally {
    await ctx.close();
  }
}

await browser.close();
const summaryPath = resolve(SHOT_DIR, 'summary.json');
writeFileSync(summaryPath, JSON.stringify(results, null, 2));
console.log(`\nsummary → ${summaryPath}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
