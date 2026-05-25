/**
 * Live DeepSeek smoke test
 *
 * CI hard gate에 포함되지 않습니다.
 * DEEPSEEK_API_KEY 환경변수가 없으면 전체 suite를 skip합니다.
 *
 * 실행법: DEEPSEEK_API_KEY=... npm run smoke:live-deepseek
 */
import { test, expect } from '@playwright/test';

const hasApiKey = !!process.env.DEEPSEEK_API_KEY;

test.describe('Live DeepSeek smoke', () => {
  test.beforeEach(async () => {
    // API key 없으면 이 describe 전체 skip
    test.skip(!hasApiKey, 'DEEPSEEK_API_KEY 미설정 — live smoke skip');
  });

  test('Primary Button 프롬프트 → 응답 수신 → assistant 메시지 + artifact source 존재', async ({
    page,
  }) => {
    await page.goto('/');

    // Empty state 로드 확인
    await expect(page.getByText('무엇을 자동화할까요?')).toBeVisible();

    // Primary Button 템플릿 클릭 → 프롬프트 자동 입력
    await page.getByRole('button', { name: 'Primary Button' }).click();
    await expect(page.getByLabel('자동화 프롬프트 입력')).toHaveValue(
      'primary 버튼 컴포넌트 생성, dark mode 지원, Vapor 토큰 준수',
    );

    // 실행
    await page.getByRole('button', { name: '자동화 실행' }).click();

    // user 메시지 노출
    await expect(page.locator('[data-role="user"]')).toBeVisible();

    // assistant 메시지 완료 대기 (live DeepSeek는 느릴 수 있음 — 60초)
    await expect
      .poll(() => page.locator('[data-status="done"]').count(), {
        timeout: 60_000,
        intervals: [1000, 2000, 3000],
      })
      .toBeGreaterThanOrEqual(2);

    // assistant 메시지에 텍스트 존재
    const assistantMessage = page.locator('[data-role="assistant"][data-status="done"]').first();
    await expect(assistantMessage).toBeVisible();
    const text = await assistantMessage.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);

    // artifact workspace 노출 (artifact source 존재 증명)
    const workspace = page.getByLabel('생성물 워크스페이스');
    await expect(workspace).toBeVisible();

    // Canvas 탭 활성화 (artifact source가 있어야 Canvas 렌더)
    await expect(page.getByRole('tab', { name: 'Canvas' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
