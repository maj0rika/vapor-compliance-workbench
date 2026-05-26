import { expect, test } from '@playwright/test';
import { mockDeepSeekChat } from './fixtures/chat-mock';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * EmptyState 의 자연어 칩 4개가 각자 의도된 워크스페이스 상태로 도달하는지
 * 직접 검증한다. iframe Canvas 가 마운트되어야 하는 시나리오는 실제 컴포넌트
 * 가 렌더되는지 frameLocator 로 확인하고, non-visual (token-sync) 시나리오는
 * 토큰 매핑 표가 visible 한지 확인한다.
 *
 * 각 케이스는 검증 결과를 screenshots/ 디렉터리에 PNG 로 남겨 사용자가
 * 실제 화면을 확인할 수 있게 한다.
 */

const SHOT_DIR = resolve(process.cwd(), 'playwright-report/nl-chips');

function shotPath(name: string): string {
  mkdirSync(SHOT_DIR, { recursive: true });
  return resolve(SHOT_DIR, `${name}.png`);
}

test.describe('NL chip — Canvas / workspace 실제 렌더 확인', () => {
  test.beforeEach(async ({ page }) => {
    await mockDeepSeekChat(page);
  });

  test('chip 1: Primary 버튼 → Canvas iframe + Deploy component 버튼', async ({
    page,
  }) => {
    await page.goto('/');
    // EmptyState NL chip 클릭
    await page
      .getByRole('button', { name: 'Vapor primary 버튼 컴포넌트 생성, 다크 모드 지원, Tooltip 포함' })
      .click();
    await page.getByRole('button', { name: '자동화 실행' }).click();

    await expect(page.getByLabel('생성물 워크스페이스')).toBeVisible({
      timeout: 10_000,
    });
    // Canvas 마운트 — iframe + 실 컴포넌트 버튼 (Deploy component) visible
    await expect(page.getByText('Canvas 사용 불가')).toHaveCount(0);
    const iframe = page.locator('iframe[title="생성물 Canvas 미리보기"]');
    await expect(iframe).toBeVisible({ timeout: 10_000 });
    await expect(
      page.frameLocator('iframe[title="생성물 Canvas 미리보기"]').getByRole('button', {
        name: 'Deploy component',
      }),
    ).toBeVisible({ timeout: 12_000 });
    await page.screenshot({ path: shotPath('chip-1-primary-button'), fullPage: true });
  });

  test('chip 2: DataTable 자연어 → Canvas 마운트 (fallback fixture)', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: '고정 헤더가 있는 DataTable 컴포넌트, 정렬·페이지네이션 포함' })
      .click();
    await page.getByRole('button', { name: '자동화 실행' }).click();

    await expect(page.getByLabel('생성물 워크스페이스')).toBeVisible({
      timeout: 10_000,
    });
    // selectScript 는 키워드 매칭으로 DEFAULT (COMPONENT) artifact 를 반환.
    // 의도된 fallback 동작 — Canvas 가 정상 마운트되는지 확인.
    await expect(page.getByText('Canvas 사용 불가')).toHaveCount(0);
    await expect(page.locator('iframe[title="생성물 Canvas 미리보기"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.frameLocator('iframe[title="생성물 Canvas 미리보기"]').getByRole('button', {
        name: 'Deploy component',
      }),
    ).toBeVisible({ timeout: 12_000 });
    await page.screenshot({ path: shotPath('chip-2-data-table'), fullPage: true });
  });

  test('chip 3: IconButton 접근성 → A11Y artifact + Canvas 마운트', async ({
    page,
  }) => {
    await page.goto('/');
    // 칩 클릭 → 모드 변경 → 실행 순서. (칩 클릭이 PromptBar remount 로
    // mode state 를 초기화시키므로 모드 변경이 그 뒤여야 한다.)
    await page
      .getByRole('button', { name: '첨부한 IconButton 의 접근성 결함 찾아서 수정 코드와 axe 테스트 작성' })
      .click();
    await page.getByLabel('자동화 모드 선택').click();
    await page.getByRole('option', { name: '접근성 점검' }).click();
    await page.getByRole('button', { name: '자동화 실행' }).click();

    await expect(page.getByLabel('생성물 워크스페이스')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Canvas 사용 불가')).toHaveCount(0);
    await expect(page.locator('iframe[title="생성물 Canvas 미리보기"]')).toBeVisible({
      timeout: 10_000,
    });
    // selectScript 는 "axe" 키워드가 포함된 prompt 에 AXE_FAIL_ARTIFACT 를
    // 반환 (a11y rule 보다 우선 매칭). 이 fixture 는 alt 없는 <img> 를 emit
    // 하므로 iframe 안에서 img 또는 button 중 하나라도 렌더되는지로 확인.
    const frame = page.frameLocator('iframe[title="생성물 Canvas 미리보기"]');
    await expect(frame.locator('button, img').first()).toBeVisible({
      timeout: 12_000,
    });
    await page.screenshot({ path: shotPath('chip-3-a11y'), fullPage: true });
  });

  test('chip 4: Figma → token-sync workspace (non-visual, Canvas 강제 없음)', async ({
    page,
  }) => {
    await page.goto('/');
    // 칩 클릭이 PromptBar 를 remount 시켜 모드 state 가 초기화되므로 칩
    // 클릭을 먼저 하고 모드 변경을 그 뒤에 한다.
    await page
      .getByRole('button', { name: 'Figma Variables JSON 을 Vapor token CSS 로 변환하는 유틸' })
      .click();
    await page.getByLabel('자동화 모드 선택').click();
    await page.getByRole('option', { name: '토큰 동기화' }).click();
    await page.getByRole('button', { name: '자동화 실행' }).click();

    await expect(page.getByLabel('생성물 워크스페이스')).toBeVisible({
      timeout: 10_000,
    });
    // token-sync contract: Canvas iframe 강제 마운트 없음
    await expect(page.locator('iframe[title="생성물 Canvas 미리보기"]')).toHaveCount(0);
    // 토큰 매핑 탭이 등장
    await expect(page.getByRole('tab', { name: '토큰 매핑' })).toBeVisible({
      timeout: 8_000,
    });
    await page.screenshot({ path: shotPath('chip-4-token-sync'), fullPage: true });
  });
});
