import { expect, test } from '@playwright/test';

/**
 * 이슈 #3 회귀 방지: 한 템플릿을 선택한 뒤에도 헤더 "예시 다시 선택" 으로
 * EmptyState 로 복귀해 다른 템플릿을 다시 고를 수 있어야 한다.
 */
test.describe('template-reset', () => {
  test('헤더 "예시 다시 선택" 으로 다른 예시를 다시 고를 수 있다', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Vapor 디자인시스템 자동화 워크벤치' }),
    ).toBeVisible();

    // 첫 번째 템플릿 선택
    await page.getByRole('button', { name: '기본 버튼' }).click();
    await expect(page.getByText('고정 샘플', { exact: true })).toBeVisible({
      timeout: 6000,
    });

    // 대화 시작 후 헤더에 "예시 다시 선택" 버튼이 노출된다
    const resetButton = page.getByRole('button', { name: '예시 다시 선택' });
    await expect(resetButton).toBeVisible();

    // 다시 선택 → EmptyState 로 복귀
    await resetButton.click();
    await expect(
      page.getByRole('heading', { name: 'Vapor 디자인시스템 자동화 워크벤치' }),
    ).toBeVisible();

    // 다른 템플릿 선택 가능 — 데이터 테이블 로딩 확인
    await page.getByRole('button', { name: '데이터 테이블' }).click();
    await expect(page.getByText('고정 샘플', { exact: true })).toBeVisible({
      timeout: 6000,
    });
    const workspace = page.getByLabel('생성물 워크스페이스');
    await page.getByRole('tab', { name: '코드' }).click();
    await expect(workspace).toContainText('export function DataTable');
  });
});
