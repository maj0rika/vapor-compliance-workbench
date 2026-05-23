import { expect, test } from '@playwright/test';

test.describe('artifact canvas runtime', () => {
  test('renders the generated component inside a sandboxed canvas frame', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/');
    await page
      .getByLabel('자동화 프롬프트 입력')
      .fill('primary 버튼 컴포넌트 생성, dark mode 지원, Vapor 토큰 준수');
    await page.getByRole('button', { name: '자동화 실행' }).click();

    await expect(page.getByRole('tab', { name: 'Canvas' })).toBeVisible({
      timeout: 6000,
    });
    await expect(page.getByRole('tab', { name: 'Canvas' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const canvas = page.frameLocator('iframe[title="Generated artifact canvas"]');
    await expect(page.locator('iframe[title="Generated artifact canvas"]')).toHaveAttribute(
      'src',
      /\/api\/deepseek\/preview/,
    );
    await expect(
      canvas.getByRole('button', { name: 'Deploy component' }),
    ).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('switches canvas variants and theme', async ({ page }) => {
    await page.goto('/');
    await page
      .getByLabel('자동화 프롬프트 입력')
      .fill('primary 버튼 컴포넌트 생성, dark mode 지원, Vapor 토큰 준수');
    await page.getByRole('button', { name: '자동화 실행' }).click();

    await expect(page.getByRole('tab', { name: 'Canvas' })).toBeVisible({
      timeout: 6000,
    });
    await page.getByRole('button', { name: 'Disabled variant' }).click();

    const canvas = page.frameLocator('iframe[title="Generated artifact canvas"]');
    await expect(
      canvas.getByRole('button', { name: 'Deploy component' }),
    ).toBeDisabled();

    await page.getByRole('button', { name: 'Dark theme' }).click();
    await expect(canvas.locator('body')).toHaveAttribute('data-theme', 'dark');
  });

  test('runs real validation from the workspace and shows gate details', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByLabel('자동화 프롬프트 입력')
      .fill('primary 버튼 컴포넌트 생성, dark mode 지원, Vapor 토큰 준수');
    await page.getByRole('button', { name: '자동화 실행' }).click();

    await expect(page.getByRole('button', { name: 'Run validation' })).toBeVisible({
      timeout: 6000,
    });
    await page.getByRole('button', { name: 'Run validation' }).click();
    await page.getByRole('tab', { name: 'Tests' }).click();

    await expect(page.getByRole('listitem').filter({ hasText: 'Typecheck: PASS' })).toBeVisible({
      timeout: 8000,
    });
    await expect(
      page.getByRole('listitem').filter({ hasText: /^Runtime Render: PASS$/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: /^Cleanup: PASS$/ }),
    ).toBeVisible();
  });

  test('shows clear fail states when generated code is broken', async ({ page }) => {
    await page.goto('/');
    await page
      .getByLabel('자동화 프롬프트 입력')
      .fill('broken raw color component 생성');
    await page.getByRole('button', { name: '자동화 실행' }).click();

    await expect(page.getByRole('button', { name: 'Run validation' })).toBeVisible({
      timeout: 6000,
    });
    await page.getByRole('button', { name: 'Run validation' }).click();
    await page.getByRole('tab', { name: 'Tests' }).click();

    await expect(
      page.getByRole('listitem').filter({ hasText: /^Vapor token usage: FAIL$/ }),
    ).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/raw color value/)).toBeVisible();
  });

  test('repairs a failed artifact and allows approval only after pass', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByLabel('자동화 프롬프트 입력')
      .fill('broken raw color component 생성');
    await page.getByRole('button', { name: '자동화 실행' }).click();

    await page.getByRole('button', { name: 'Run validation' }).click();
    await page.getByRole('tab', { name: 'Tests' }).click();
    await expect(
      page.getByRole('listitem').filter({ hasText: /^Vapor token usage: FAIL$/ }),
    ).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Approve artifact' })).toBeDisabled();

    await page.getByRole('button', { name: 'Fix with Agent' }).click();
    await expect(page.getByText(/실패한 validation 결과를 바탕으로 수정/)).toBeVisible();
    await expect(
      page
        .frameLocator('iframe[title="Generated artifact canvas"]')
        .getByRole('button', { name: 'Deploy component' }),
    ).toBeVisible({ timeout: 6000 });

    await page.getByRole('button', { name: 'Run validation' }).click();
    await page.getByRole('tab', { name: 'Tests' }).click();
    await expect(
      page.getByRole('listitem').filter({ hasText: /^Vapor token usage: PASS$/ }),
    ).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Approve artifact' })).toBeEnabled();

    await page.getByRole('button', { name: 'Approve artifact' }).click();
    await expect(page.getByText('Artifact approved')).toBeVisible();
  });
});
