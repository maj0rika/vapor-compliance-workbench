import { expect, test } from '@playwright/test';

test.describe('Vapor 다크모드 (U07)', () => {
  test('ThemeToggle 클릭 시 data-vapor-theme + color-scheme 가 토글된다', async ({ page }) => {
    await page.goto('/');

    // 초기: light
    await expect(page.locator('html')).toHaveAttribute('data-vapor-theme', 'light');

    // 다크 모드로 전환
    await page.getByRole('button', { name: '다크 모드로 전환' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-vapor-theme', 'dark');
    // color-scheme 도 dark 로 변경되어 브라우저 native control (scrollbar 등) 도 모드 따라감
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.style.colorScheme),
    ).toBe('dark');

    // 라이트로 복귀
    await page.getByRole('button', { name: '라이트 모드로 전환' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-vapor-theme', 'light');
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.style.colorScheme),
    ).toBe('light');
  });

  test('다크 모드에서 app shell 배경색이 실제로 어두워진다 (브라우저 실측)', async ({ page }) => {
    await page.goto('/');

    // light body 배경 색상 측정
    const lightBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(lightBg).toMatch(/rgb\(/);

    await page.getByRole('button', { name: '다크 모드로 전환' }).click();
    // 다크 모드 attribute 적용 완료 대기
    await expect(page.locator('html')).toHaveAttribute('data-vapor-theme', 'dark');

    // CSS variable 갱신은 다음 paint frame 후 적용. 둘이 다른지만 확인.
    await expect
      .poll(async () => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .not.toBe(lightBg);

    const darkBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );

    // light vs dark 의 luminance 차이를 확인 — light 가 dark 보다 밝아야 한다.
    const luminance = (rgb: string): number => {
      const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return 0;
      const [, r, g, b] = match;
      return 0.2126 * Number(r) + 0.7152 * Number(g) + 0.0722 * Number(b);
    };
    expect(luminance(lightBg)).toBeGreaterThan(luminance(darkBg));
  });
});
