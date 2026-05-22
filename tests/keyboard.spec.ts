import { test, expect } from '@playwright/test';

test.describe('Prompt Input 키보드 조작', () => {
  test('Enter 로 제출하고 Shift+Enter 로 줄바꿈한다', async ({ page }) => {
    await page.goto('/');

    const textarea = page.getByLabel('프롬프트 입력');
    await textarea.click();
    await textarea.fill('첫 줄');
    await textarea.press('Shift+Enter');
    await page.keyboard.type('둘째 줄');
    await expect(textarea).toHaveValue('첫 줄\n둘째 줄');

    await textarea.press('Enter');
    await expect(page.getByRole('heading', { name: '제출됨' })).toBeVisible();
    await expect(textarea).toHaveValue('');
  });

  test('ESC 로 열린 데이터소스 메뉴를 닫는다', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('데이터소스 선택').click();
    await expect(page.getByRole('option', { name: '웹 검색' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('option', { name: '웹 검색' })).toBeHidden();
  });

  test('키보드로 파일 선택 버튼을 조작해 파일 대화상자를 연다', async ({
    page,
  }) => {
    await page.goto('/');

    const selectFileButton = page.getByRole('button', { name: '파일 선택' });
    await selectFileButton.focus();
    await expect(selectFileButton).toBeFocused();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    const fileChooser = await fileChooserPromise;
    expect(fileChooser.element()).toBeTruthy();
  });

  test('Tab 으로 주요 컨트롤을 순서대로 순회한다', async ({ page }) => {
    await page.goto('/');

    const dataSource = page.getByLabel('데이터소스 선택');
    await dataSource.focus();
    await expect(dataSource).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: '파일 선택' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel('프롬프트 입력')).toBeFocused();
  });
});
