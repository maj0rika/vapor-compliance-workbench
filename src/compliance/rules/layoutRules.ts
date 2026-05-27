import type { Gate } from '../types.ts';

export type LayoutCheckInput = {
  /** Optional Playwright screenshot result: true = no overflow detected */
  overflowDetected?: boolean;
};

/**
 * Checks for layout overflow issues.
 * If no Playwright result is provided, the gate is skipped (WARN + skipped evidence).
 */
export function checkOverflow(input: LayoutCheckInput = {}): Gate {
  const gateId = 'layout-overflow';
  const name = 'Layout Overflow';

  if (input.overflowDetected === undefined) {
    return {
      gateId,
      name,
      status: 'WARN',
      evidence: [
        {
          message:
            '레이아웃 오버플로 검사는 로컬 개발 환경에서만 실행됩니다. `npm run verify:ci` 로 확인하세요.',
        },
      ],
      fixGuide: [
        {
          title: '로컬에서 전체 검증 실행',
          detail:
            '`npm run verify:ci` 를 실행하면 Playwright smoke 테스트가 모든 뷰포트의 레이아웃을 검증합니다.',
        },
      ],
    };
  }

  if (input.overflowDetected) {
    return {
      gateId,
      name,
      status: 'FAIL',
      evidence: [
        {
          message: 'Playwright detected layout overflow in one or more breakpoints.',
        },
      ],
      fixGuide: [
        {
          title: 'Fix overflow',
          detail: 'Inspect elements with overflow: hidden/scroll and constrain widths using Vapor tokens.',
        },
      ],
    };
  }

  return {
    gateId,
    name,
    status: 'PASS',
    evidence: [{ message: 'No layout overflow detected.' }],
    fixGuide: [],
  };
}
