/**
 * 자세한 사용 설명서.
 *
 * EmptyState 에서 사용자가 명시적으로 열 때만 lazy 로딩되어
 * 초기 JS bundle 예산 (200KB gzip) 헤드룸을 보호한다.
 */
export function UsageGuide() {
  return (
    <div className="mt-v-150 flex flex-col gap-v-150 text-sm">
      <ol
        className="m-0 flex list-decimal flex-col gap-v-100 pl-v-300"
        style={{ color: 'var(--vapor-color-foreground-normal-200)' }}
      >
        <li>
          <strong>예시 또는 검증 샘플로 시작</strong>합니다. 위 카드를 누르면
          결정적 fixture 가 워크스페이스에 로드되어 DeepSeek 호출 없이도 전체
          흐름(코드 생성 → Canvas → 검증)을 확인할 수 있습니다.
        </li>
        <li>
          직접 요청하려면 아래 입력창에 자연어로 작성하고, 필요하면
          <code>.tsx</code> / <code>.ts</code> / <code>.json</code> /
          <code>.md</code> 참고 파일을 첨부합니다 (한 요청당 최대 5개, 300KB
          이하). 모드 셀렉터로 <code>Component</code> · <code>Token Sync</code>{' '}
          · <code>A11y Audit</code> · <code>Story/Test</code> 중 의도를
          고정합니다.
        </li>
        <li>
          응답이 끝나면 오른쪽 워크스페이스에 Canvas · Component · Story · Test
          탭이 생깁니다. Canvas 탭은 sandboxed iframe 에서 실제 React
          컴포넌트를 mount 합니다.
        </li>
        <li>
          <strong>Test 탭에서 검증 실행</strong>을 누르면 임시 워크스페이스에서
          실제 <code>tsc</code> · <code>vitest</code> · 접근성 · 토큰 게이트가
          돌아갑니다. 실패한 게이트는 <code>Fix with Agent</code> 로 바로 보수
          루프에 전달됩니다.
        </li>
        <li>
          모든 게이트가 통과해야 <strong>Approve</strong> 버튼이 활성화됩니다.
          헤더의 <em>예시 다시 선택</em> 으로 언제든 처음으로 돌아갈 수
          있습니다.
        </li>
      </ol>
      <p
        className="m-0"
        style={{ color: 'var(--vapor-color-foreground-hint-200)' }}
      >
        Tip: <code>에러</code> · <code>typecheck</code> · <code>axe</code> ·{' '}
        <code>broken</code> 같은 키워드를 요청에 넣으면 의도적으로 실패한
        artifact 로 보수 루프를 시연할 수 있습니다.
      </p>
    </div>
  );
}
