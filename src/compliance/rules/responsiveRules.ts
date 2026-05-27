import type { Gate } from '../types.ts';

export type ResponsiveInput = {
  /**
   * Optional list of breakpoints that were tested.
   * Pass undefined to indicate the scan has not been run yet.
   */
  testedBreakpoints?: string[];
};

/**
 * Placeholder gate for responsive design checks.
 * Returns WARN until Playwright responsive scan is wired up.
 */
export function checkResponsive(input: ResponsiveInput = {}): Gate {
  const gateId = 'responsive-design';
  const name = 'Responsive Design';

  if (input.testedBreakpoints === undefined) {
    return {
      gateId,
      name,
      status: 'WARN',
      evidence: [
        {
          message:
            '반응형 디자인 검사는 로컬 개발 환경에서만 실행됩니다. `npm run verify:ci` 로 확인하세요.',
        },
      ],
      fixGuide: [
        {
          title: '로컬에서 전체 검증 실행',
          detail:
            '`npm run verify:ci` 를 실행하면 390/768/1280/1440/1480 해상도 × light/dark 테마 smoke 테스트가 모든 뷰포트를 검증합니다.',
        },
      ],
    };
  }

  const evidence = [
    {
      message: `Responsive tests completed for breakpoints: ${input.testedBreakpoints.join(', ')}.`,
    },
  ];

  return {
    gateId,
    name,
    status: 'PASS',
    evidence,
    fixGuide: [],
  };
}
