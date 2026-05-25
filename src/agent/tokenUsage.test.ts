import { describe, expect, it } from 'vitest';
import { checkTokenUsage } from './tokenUsage';

describe('checkTokenUsage', () => {
  it('Vapor primitive 를 쓰고 raw style 이 없으면 pass 한다', () => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'PrimaryButton.tsx',
        language: 'tsx',
        content: "import { Button } from '@vapor-ui/core'; export const X = () => <Button colorPalette=\"primary\" />;",
      },
    });

    expect(result.status).toBe('pass');
    expect(result.vaporTokenReferenceCount).toBeGreaterThan(0);
  });

  it('raw color 는 fail 로 판정한다', () => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'Bad.tsx',
        language: 'tsx',
        content: 'export const X = () => <div style={{ color: "#fff" }} />;',
      },
    });

    expect(result.status).toBe('fail');
    expect(result.rawColorCount).toBe(1);
  });

  it('raw spacing 과 radius 는 warn 으로 판정한다', () => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'Warn.tsx',
        language: 'tsx',
        content:
          "import { Button } from '@vapor-ui/core'; export const X = () => <Button style={{ padding: '16px', borderRadius: '8px' }} />;",
      },
    });

    expect(result.status).toBe('warn');
    expect(result.rawSpacingCount).toBe(1);
    expect(result.rawRadiusCount).toBe(1);
  });

  // V05: 기존 regex 가 silently PASS 시켰던 modern CSS 색상 함수 + 명명 색상 +
  // 객체 표기 spacing/radius + arbitrary Tailwind 가 모두 잡혀야 한다.
  it.each([
    ['hsl(220 90% 50%)', 'hsl()'],
    ['hsla(220 90% 50% / 0.5)', 'hsla()'],
    ['oklch(70% 0.15 220)', 'oklch()'],
    ['oklab(0.7 0.1 0.2)', 'oklab()'],
    ['lab(50% 40 30)', 'lab()'],
    ['lch(50% 30 220)', 'lch()'],
    ['color(display-p3 1 0 0)', 'color()'],
  ])('raw color 함수 %s 가 fail 로 잡힌다', (value) => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'Bad.tsx',
        language: 'tsx',
        content: `import { X } from '@vapor-ui/core'; export const Y = () => <div style={{ background: '${value}' }} />;`,
      },
    });
    expect(result.status).toBe('fail');
    expect(result.rawColorCount).toBeGreaterThan(0);
  });

  it.each(['red', 'blue', 'green', 'black', 'white', 'crimson'])(
    '명명 색상 키워드 "%s" 가 inline value 로 쓰이면 fail 로 잡힌다',
    (color) => {
      const result = checkTokenUsage({
        component: {
          type: 'component',
          filename: 'Bad.tsx',
          language: 'tsx',
          content: `import { X } from '@vapor-ui/core'; export const Y = () => <div style={{ color: '${color}' }} />;`,
        },
      });
      expect(result.status).toBe('fail');
      expect(result.rawColorCount).toBeGreaterThan(0);
    },
  );

  it('JSX prop 으로 명명 색상이 들어와도 fail 로 잡힌다 (background="red")', () => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'Bad.tsx',
        language: 'tsx',
        content: `import { Box } from '@vapor-ui/core'; export const X = () => <Box background="red" />;`,
      },
    });
    expect(result.status).toBe('fail');
    expect(result.rawColorCount).toBe(1);
  });

  it('arbitrary Tailwind p-[16px] 같은 spacing 도 warn 으로 잡힌다', () => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'Warn.tsx',
        language: 'tsx',
        content: `import { Box } from '@vapor-ui/core'; export const X = () => <Box className="p-[16px] mt-[8px]" />;`,
      },
    });
    expect(result.status).toBe('warn');
    expect(result.rawSpacingCount).toBeGreaterThanOrEqual(2);
  });

  it('arbitrary Tailwind rounded-[6px] 도 warn 으로 잡힌다', () => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'Warn.tsx',
        language: 'tsx',
        content: `import { Box } from '@vapor-ui/core'; export const X = () => <Box className="rounded-[6px]" />;`,
      },
    });
    expect(result.status).toBe('warn');
    expect(result.rawRadiusCount).toBeGreaterThan(0);
  });

  it('padding-left 같은 변형 키워드도 잡힌다', () => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'Warn.tsx',
        language: 'tsx',
        content: `import { Box } from '@vapor-ui/core'; export const X = () => <Box style={{ paddingLeft: '12px', marginTop: '4px' }} />;`,
      },
    });
    expect(result.status).toBe('warn');
    expect(result.rawSpacingCount).toBeGreaterThanOrEqual(2);
  });

  it('JSX prop padding="16px" 도 잡힌다 (Vapor 추상 prop 이 아닌 raw 값)', () => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'Warn.tsx',
        language: 'tsx',
        content: `import { Box } from '@vapor-ui/core'; export const X = () => <Box padding="16px" />;`,
      },
    });
    expect(result.status).toBe('warn');
    expect(result.rawSpacingCount).toBeGreaterThan(0);
  });

  it('false positive 방지: 평범한 한글/영문 텍스트의 명사는 색상으로 잡지 않는다', () => {
    const result = checkTokenUsage({
      component: {
        type: 'component',
        filename: 'Clean.tsx',
        language: 'tsx',
        content: `import { Button } from '@vapor-ui/core'; export const X = () => <Button>저장하기</Button>; // const blue_var = something;`,
      },
    });
    expect(result.status).toBe('pass');
    expect(result.rawColorCount).toBe(0);
  });
});
