import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeTempFile(name: string, content = 'sample'): string {
  const dir = mkdtempSync(join(tmpdir(), 'vapor-e2e-'));
  const filePath = join(dir, name);
  writeFileSync(filePath, content);
  return filePath;
}

test.describe('채팅 대화 흐름', () => {
  test('빈 상태에서 추천 칩을 누르면 입력창이 채워진다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('무엇을 도와드릴까요?')).toBeVisible();

    await page.getByRole('button', { name: '제목 추천해줘' }).click();
    await expect(page.getByLabel('프롬프트 입력')).toHaveValue('제목 추천해줘');
  });

  test('메시지를 보내면 어시스턴트 응답이 스트리밍되고 액션이 노출된다', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('프롬프트 입력').fill('제목 추천해줘');
    await page.getByRole('button', { name: '보내기' }).click();

    await expect(page.locator('[data-role="user"]')).toBeVisible();
    await expect
      .poll(() => page.locator('[data-status="done"]').count(), {
        timeout: 6000,
      })
      .toBeGreaterThanOrEqual(2); // user + assistant 모두 done

    await expect(page.getByRole('button', { name: '응답 복사' })).toBeVisible();
    await expect(page.getByRole('button', { name: '응답 재생성' })).toBeVisible();
  });

  test('스트리밍 중 ESC 를 누르면 응답이 중단된다', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('프롬프트 입력').fill('블로그 글 초안 작성해줘');
    await page.getByRole('button', { name: '보내기' }).click();

    await expect(page.locator('[data-role="assistant"]')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByText('응답이 중단되었습니다.')).toBeVisible();
  });

  test('초안이 생기면 미리보기 패널이 열리고 닫고 다시 열 수 있다', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('프롬프트 입력').fill('이 문장 다듬어줘');
    await page.getByRole('button', { name: '보내기' }).click();

    const preview = page.getByLabel('초안 미리보기');
    await expect(preview).toBeVisible({ timeout: 6000 });
    await expect(preview).toContainText('수정본', { timeout: 6000 });

    await page.getByRole('button', { name: '미리보기 닫기' }).click();
    await expect(preview).toBeHidden();

    await page.getByRole('button', { name: '초안 보기' }).click();
    await expect(preview).toBeVisible();
  });

  test('응답 재생성을 누르면 다시 스트리밍한다', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('프롬프트 입력').fill('제목 추천해줘');
    await page.getByRole('button', { name: '보내기' }).click();
    await expect
      .poll(() => page.locator('[data-status="done"]').count(), {
        timeout: 6000,
      })
      .toBeGreaterThanOrEqual(2);

    await page.getByRole('button', { name: '응답 재생성' }).click();
    // 재생성 직후 어시스턴트 메시지가 다시 스트리밍 상태가 된다.
    await expect(page.locator('[data-role="assistant"]')).toHaveAttribute(
      'data-status',
      'streaming',
    );
    await expect
      .poll(() => page.locator('[data-status="done"]').count(), {
        timeout: 6000,
      })
      .toBeGreaterThanOrEqual(2);
  });

  test('지원하지 않는 파일은 거부 피드백을 표시한다', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('input[type="file"]')
      .setInputFiles(makeTempFile('malware.exe'));
    await expect(page.getByRole('alert')).toContainText(
      '지원하지 않는 파일 형식',
    );
  });

  test('첨부한 파일이 대화 메시지에 함께 표시된다', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('input[type="file"]')
      .setInputFiles(makeTempFile('outline.md'));
    await page.getByLabel('프롬프트 입력').fill('이 개요 검토해줘');
    await page.getByRole('button', { name: '보내기' }).click();

    const userBubble = page.locator('[data-role="user"]');
    await expect(userBubble).toContainText('이 개요 검토해줘');
    await expect(userBubble).toContainText('outline.md');
  });
});
