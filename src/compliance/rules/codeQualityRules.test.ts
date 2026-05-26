import { describe, expect, it } from 'vitest';
import { checkCodeQuality } from './codeQualityRules';

describe('checkCodeQuality', () => {
  it('returns WARN when no inputs provided', () => {
    const gate = checkCodeQuality();
    expect(gate.status).toBe('WARN');
    expect(gate.evidence[0].message).toContain('skipped');
  });

  it('PASS when strict mode + all scripts + sufficient README', () => {
    const gate = checkCodeQuality({
      tsconfigText: '{ "compilerOptions": { "strict": true } }',
      scriptNames: ['typecheck', 'lint', 'test', 'build', 'verify:compliance', 'dev'],
      readmeLength: 2000,
    });
    expect(gate.status).toBe('PASS');
    expect(gate.evidence).toHaveLength(3);
    expect(gate.fixGuide).toHaveLength(0);
  });

  it('FAIL when strict mode is off', () => {
    const gate = checkCodeQuality({
      tsconfigText: '{ "compilerOptions": { "strict": false } }',
      scriptNames: ['typecheck', 'lint', 'test', 'build', 'verify:compliance'],
      readmeLength: 2000,
    });
    expect(gate.status).toBe('FAIL');
    expect(gate.fixGuide[0].title).toContain('strict');
  });

  it('FAIL with specific missing scripts', () => {
    const gate = checkCodeQuality({
      tsconfigText: '"strict": true',
      scriptNames: ['typecheck', 'build'],
      readmeLength: 1000,
    });
    expect(gate.status).toBe('FAIL');
    const missing = gate.evidence.find((e) => e.message.includes('누락'));
    expect(missing?.message).toContain('lint');
    expect(missing?.message).toContain('test');
    expect(missing?.message).toContain('verify:compliance');
  });

  it('FAIL when README too short', () => {
    const gate = checkCodeQuality({
      tsconfigText: '"strict": true',
      scriptNames: ['typecheck', 'lint', 'test', 'build', 'verify:compliance'],
      readmeLength: 200,
    });
    expect(gate.status).toBe('FAIL');
    expect(gate.fixGuide[0].title).toBe('README 확장');
  });
});
