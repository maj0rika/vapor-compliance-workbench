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
});
