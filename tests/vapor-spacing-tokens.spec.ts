import { expect, test } from '@playwright/test';

/**
 * Vapor `--vapor-size-space-*` 토큰이 실제로 픽셀 값으로 paint 되는지
 * 브라우저 환경에서 실측한다. 이 테스트의 존재 이유:
 *
 * Vapor 의 spacing 토큰은 모두 `calc(var(--vapor-scale-factor) * Npx)` 로
 * 정의된다. `--vapor-scale-factor` 가 어디서도 set 되지 않으면 calc()
 * 표현식 전체가 invalid 가 되어 `gap-v-100`, `p-v-200` 등이 모두 0 으로
 * 평가되는 silent 0-pixel 회귀가 발생한다. CSS 빌드는 통과하지만 UI
 * spacing 이 모두 사라진다.
 *
 * G032 에서 `src/index.css` 의 `:root` 에 `--vapor-scale-factor: 1` 을
 * 추가해 fallback 을 보장했다. 이 테스트는 그 fallback (또는 Vapor 가
 * 런타임에 vanilla-extract 로 set 하는 값) 중 적어도 하나가 작동하고
 * 있어 spacing 토큰이 nonzero 픽셀로 paint 되는 것을 절대 보장한다.
 *
 * 회귀 시나리오:
 *   - 누가 실수로 `--vapor-scale-factor: 1` 줄을 지운다
 *   - Vapor 가 v2 로 업그레이드되며 토큰 정의 방식을 바꿔 어떤 경로로도
 *     scale-factor 가 set 되지 않게 된다
 * 둘 다 이 테스트가 잡는다.
 */
test.describe('Vapor spacing token paint (V07)', () => {
  test('--vapor-size-space-100 가 실 paint 에서 nonzero px 로 resolve 된다', async ({ page }) => {
    await page.goto('/');

    // CSS custom property 는 getPropertyValue 로 읽으면 raw 정의 텍스트
    // (calc(...)) 가 그대로 반환된다. paint 까지 가야 calc() 가 실제
    // 픽셀로 평가된다. 따라서 임시 element 에 padding 으로 토큰을 적용한
    // 뒤 padding 의 computed pixel 값을 읽는다. 0 이면 회귀.
    const paddingPx = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.padding = 'var(--vapor-size-space-100)';
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      document.body.appendChild(probe);
      try {
        const computed = getComputedStyle(probe).paddingTop;
        return computed;
      } finally {
        probe.remove();
      }
    });

    expect(paddingPx).toMatch(/^\d+(?:\.\d+)?px$/);
    const numeric = Number.parseFloat(paddingPx);
    expect(Number.isFinite(numeric)).toBe(true);
    expect(numeric).toBeGreaterThan(0);
  });

  test('--vapor-scale-factor 가 직접/간접 경로로 set 되어 있다', async ({ page }) => {
    await page.goto('/');

    const scaleFactor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--vapor-scale-factor').trim(),
    );

    // index.css `:root` 의 fallback 또는 vanilla-extract 런타임 중 어떤
    // 경로로 set 되든 빈 문자열이어선 안 된다.
    expect(scaleFactor).not.toBe('');
    const numeric = Number.parseFloat(scaleFactor);
    expect(Number.isFinite(numeric)).toBe(true);
    expect(numeric).toBeGreaterThan(0);
  });
});
