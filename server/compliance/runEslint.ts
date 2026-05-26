import { spawn } from 'node:child_process';
import type { ESLintMessage } from '../../src/compliance/rules/accessibilityRules';

type RawResult = {
  filePath: string;
  messages: Array<{
    ruleId: string | null;
    severity: number;
    message: string;
    line: number;
    column: number;
  }>;
};

/**
 * Runs `eslint --format json` against given paths and returns normalized
 * messages (with filePath attached to each message).
 *
 * ESLint exit code 1 (violations found) is treated as success — only spawn/
 * parse errors throw.
 */
export function runEslintJson(paths: string[]): Promise<ESLintMessage[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['--no-install', 'eslint', '--format', 'json', ...paths],
      { cwd: process.cwd() },
    );
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (d: Buffer) => stdout.push(d));
    child.stderr.on('data', (d: Buffer) => stderr.push(d));
    child.on('error', reject);
    child.on('close', () => {
      const out = Buffer.concat(stdout).toString('utf-8').trim();
      if (!out) {
        // ESLint produced no JSON (e.g. config error). Surface stderr.
        const err = Buffer.concat(stderr).toString('utf-8');
        return reject(new Error(`eslint produced empty output. stderr: ${err}`));
      }
      try {
        const parsed = JSON.parse(out) as RawResult[];
        const messages: ESLintMessage[] = parsed.flatMap((r) =>
          r.messages.map((m) => ({
            ruleId: m.ruleId,
            severity: m.severity,
            message: m.message,
            line: m.line,
            column: m.column,
            filePath: r.filePath,
          })),
        );
        resolve(messages);
      } catch (e) {
        reject(
          new Error(
            `eslint JSON parse failed: ${e instanceof Error ? e.message : String(e)}`,
          ),
        );
      }
    });
  });
}
