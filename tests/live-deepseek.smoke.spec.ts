/**
 * Live DeepSeek smoke
 *
 * CI hard gate (verify:ci / test:e2e) 에 포함되지 않습니다.
 * `DEEPSEEK_API_KEY` 환경변수가 없으면 suite 전체를 skip 하고 exit 0 으로 종료합니다.
 *
 * 실행:
 *   DEEPSEEK_API_KEY=... npm run smoke:live-deepseek
 *
 * Scope:
 * - generation, artifact parse, workspace, Canvas iframe, raw leakage 까지만.
 * - Run validation 은 모델/네트워크 출력이 더 flaky 하므로 이 smoke 에서 자동
 *   실행하지 않습니다. UI 에서 사용자가 직접 클릭해 확인하세요.
 *
 * Starter 템플릿 클릭은 deterministic fixture 를 로드하므로 live 호출이 발생하지
 * 않습니다. live smoke 는 PromptBar 에 직접 입력해 fixture 경로를 우회합니다.
 */
import { test, expect } from '@playwright/test';

const hasApiKey = !!process.env.DEEPSEEK_API_KEY;

test.describe('Live DeepSeek smoke', () => {
  test.beforeEach(async () => {
    test.skip(!hasApiKey, 'DEEPSEEK_API_KEY 미설정 — live smoke skip');
  });

  test('generation: 자연어 요청 → 응답 + artifact + Canvas + no raw leakage', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('무엇을 자동화할까요?')).toBeVisible();

    // Starter fixture 경로 우회: PromptBar 에 직접 입력
    await page
      .getByLabel('자동화 프롬프트 입력')
      .fill('primary 버튼 컴포넌트 생성, dark mode 지원, Vapor 토큰 준수');

    // P01 — first token latency (submit 클릭 → assistant streaming bubble
    // 가시화) 가 SLA 3 초 이하임을 실측한다. 사용자가 자동화 실행 클릭 후
    // 3 초 안에 응답이 흘러나오기 시작하지 않으면 UX 가 "멈춘 것" 으로
    // 인지된다. live DeepSeek 의 first token 은 보통 1.0-1.5 초.
    const submitAt = Date.now();
    await page.getByRole('button', { name: '자동화 실행' }).click();
    await page.locator('[data-role="assistant"]').first().waitFor({
      state: 'visible',
      timeout: 3_000,
    });
    const firstTokenMs = Date.now() - submitAt;
    expect(firstTokenMs).toBeLessThan(3_000);
    // 측정값을 stdout 에 기록 — CI 로그/release note 에서 추적 가능
    process.stdout.write(`[P01] first-token latency: ${firstTokenMs}ms\n`);

    // user 메시지 노출
    await expect(page.locator('[data-role="user"]')).toBeVisible();

    // assistant 메시지 done (live 는 느릴 수 있어 90초 허용)
    await expect
      .poll(() => page.locator('[data-role="assistant"][data-status="done"]').count(), {
        timeout: 150_000,
        intervals: [1500, 2500, 3500],
      })
      .toBeGreaterThanOrEqual(1);

    const assistant = page.locator('[data-role="assistant"][data-status="done"]').first();
    await expect(assistant).toBeVisible();

    // 1) 응답 본문이 비어 있지 않다
    const text = (await assistant.textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(0);

    // 2) 응답 본문에 raw artifact tag fragment 가 없다 (visibleConversationText
    //    sanitization regression guard)
    expect(text).not.toMatch(/<artifact\b/i);
    expect(text).not.toMatch(/<artifact-meta\b/i);
    expect(text).not.toMatch(/<\/artifact>/i);
    expect(text).not.toMatch(/```tsx/i);

    // 3) artifact workspace 노출
    const workspace = page.getByLabel('생성물 워크스페이스');
    await expect(workspace).toBeVisible();

    // 4) artifact 산출물 탭 최소 1개 (Component / Story / Test) 노출.
    //    Live DeepSeek 는 component 만 반환할 수도 있어 3개 모두 강요하지 않는다
    //    — empty workspace 회귀만 차단.
    const artifactTabCount = await Promise.all([
      page.getByRole('tab', { name: 'Component' }).count(),
      page.getByRole('tab', { name: 'Story' }).count(),
      page.getByRole('tab', { name: 'Test', exact: true }).count(),
    ]).then((counts) => counts.reduce((a, b) => a + b, 0));
    expect(artifactTabCount).toBeGreaterThanOrEqual(1);

    // 4-a) text empty 차단 (artifact-only 응답이라도 fallback prose 또는 모델
    //      prose 가 반드시 conversation bubble 에 노출되어야 함)
    const conversationTextLen = ((await assistant.textContent()) ?? '').trim().length;
    expect(conversationTextLen).toBeGreaterThan(0);

    // 5) Canvas tab default 선택 + iframe 존재
    await expect(page.getByRole('tab', { name: 'Canvas' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('iframe[title="Generated artifact canvas"]')).toHaveCount(1);

    // 6) Canvas runtime status 가 ready / failed / timeout 중 하나로 settled
    //    (loading 무한 대기 방지 — 30 초 안에 명시적 상태 발급)
    const canvasStatusBadge = page.locator('[aria-label^="Canvas runtime:"]');
    await expect(canvasStatusBadge).toBeVisible({ timeout: 30_000 });
    const canvasLabel = await canvasStatusBadge.first().getAttribute('aria-label');
    expect(canvasLabel).toMatch(/Canvas runtime: (ready|failed|timeout)/);
  });
});
