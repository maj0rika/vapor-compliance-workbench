import type { IncomingMessage, ServerResponse } from 'node:http';
import { collectFileSignals, GOVERNED_SCAN_PATHS } from './collectFileSignals';
import { createComplianceReport } from './createComplianceReport';
import { runEslintJson } from './runEslint';
import { readBrowserSmokeResult } from './readBrowserResults';

/**
 * Vite dev middleware: GET /api/compliance/report → JSON ComplianceReport.
 * Runs the deterministic engine over the project root and returns the result.
 *
 * Query params:
 *   ?scope=governed (default) | all
 */
export async function handleComplianceReport(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'governed';

  try {
    const signals = collectFileSignals(process.cwd(), { scope });
    let eslintMessages;
    try {
      // governed scope: lint only governed paths for speed. all scope: lint src/.
      const paths = scope === 'governed' ? GOVERNED_SCAN_PATHS : ['src/'];
      eslintMessages = await runEslintJson(paths);
    } catch (eslintErr) {
      // ESLint failure should not break the whole report — accessibility gate
      // falls back to WARN/skip if eslintMessages remains undefined.
      console.warn(
        '[compliance] ESLint scan failed:',
        eslintErr instanceof Error ? eslintErr.message : eslintErr,
      );
    }
    const browserSmoke = readBrowserSmokeResult(process.cwd());
    const report = createComplianceReport(signals, { eslintMessages, browserSmoke });
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify(report));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: 'compliance_scan_failed',
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
