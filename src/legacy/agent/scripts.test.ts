import { describe, expect, it } from 'vitest';
import { selectScriptByTemplateKey, type TemplateKey } from './scripts';
import { parseGeneratedArtifact } from './responseParser';

const KEYS: TemplateKey[] = [
  'primary-button',
  'data-table',
  'token-sync',
  'a11y-fix',
  'story-test',
];

describe('selectScriptByTemplateKey', () => {
  it('각 템플릿 키는 draft artifact 를 반환한다', () => {
    for (const key of KEYS) {
      const script = selectScriptByTemplateKey(key);
      expect(script.draft, `${key} has draft`).toBeTruthy();
    }
  });

  it('모든 템플릿의 draft 는 서로 다르다 (잘못된 fixture 재사용 회귀 방지)', () => {
    const drafts = new Set(
      KEYS.map((key) => selectScriptByTemplateKey(key).draft),
    );
    expect(drafts.size).toBe(KEYS.length);
  });

  it('data-table 템플릿은 DataTable component 를 노출한다 (버그 회귀 방지)', () => {
    const script = selectScriptByTemplateKey('data-table');
    const parsed = parseGeneratedArtifact(script.draft ?? '');

    expect(parsed.metadata?.primaryExport).toBe('DataTable');
    expect(parsed.metadata?.componentName).toBe('DataTable');

    expect(parsed.component?.filename).toBe('DataTable.tsx');
    expect(parsed.component?.content).toContain('export function DataTable');
    expect(parsed.component?.content).not.toContain('export function PrimaryActionButton');
  });

  it('data-table component 는 정렬 가능한 헤더와 aria-sort 를 포함한다', () => {
    const script = selectScriptByTemplateKey('data-table');
    const parsed = parseGeneratedArtifact(script.draft ?? '');

    expect(parsed.component?.content).toMatch(/aria-sort/);
    expect(parsed.component?.content).toMatch(/handleHeaderClick/);
  });
});
