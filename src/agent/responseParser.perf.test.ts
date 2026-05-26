import { describe, expect, it } from 'vitest';
import { parseGeneratedArtifact } from './responseParser';

/**
 * P02 — artifact parse latency budget.
 *
 * 도구의 검증 cycle 은 streaming response 가 완료되자마자 즉시 parse 를
 * 호출하므로, parse 자체가 hot path 다. 100ms 예산을 초과하면 사용자가
 * "응답 완료 → preview 렌더" 사이의 stall 을 인지하게 된다.
 *
 * 측정 방식: realistic large response (component + story + test + metadata +
 * notes) 를 10회 parse 한 평균이 100ms 이하인지 확인. 단일 호출은 GC
 * jitter 등으로 튀므로 평균을 본다.
 */

const LARGE_RESPONSE = `<artifact-meta>
{
  "componentName": "DataTable",
  "primaryExport": "DataTable",
  "defaultProps": { "rows": [], "columns": [] },
  "variants": [
    { "name": "Default", "props": { "rows": [{ "id": 1, "label": "Row 1" }] } },
    { "name": "Loading", "props": { "loading": true } },
    { "name": "Empty", "props": { "rows": [] } },
    { "name": "Error", "props": { "error": "Failed to fetch" } },
    { "name": "Selected", "props": { "selectedRowIds": [1, 2, 3] } }
  ]
}
</artifact-meta>

<artifact type="component" filename="DataTable.tsx">
\`\`\`tsx
${'import { useState, useMemo, useCallback } from "react";\n'.repeat(40)}
export function DataTable({ rows, columns, loading, error }: DataTableProps) {
  ${'const [state, setState] = useState(0);\n  '.repeat(30)}
  return (
    <div className="data-table">
      ${'<div className="row">cell</div>\n      '.repeat(50)}
    </div>
  );
}
\`\`\`
</artifact>

<artifact type="story" filename="DataTable.stories.tsx">
\`\`\`tsx
${'export const Variant = { args: { rows: [] } };\n'.repeat(30)}
\`\`\`
</artifact>

<artifact type="test" filename="DataTable.test.tsx">
\`\`\`tsx
${'it("renders", () => { expect(true).toBe(true); });\n'.repeat(20)}
\`\`\`
</artifact>

<notes type="a11y">
${'Row cells expose accessible names.\n'.repeat(15)}
</notes>

<notes type="token">
${'Uses Vapor v-* spacing tokens exclusively.\n'.repeat(15)}
</notes>`;

describe('responseParser perf (P02)', () => {
  it('parse 평균 latency 가 100ms 예산 안에 든다', () => {
    const iterations = 10;
    parseGeneratedArtifact(LARGE_RESPONSE); // warmup, JIT
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      const result = parseGeneratedArtifact(LARGE_RESPONSE);
      expect(result.component?.filename).toBe('DataTable.tsx');
    }
    const avgMs = (performance.now() - start) / iterations;
    expect(avgMs).toBeLessThan(100);
  });
});
