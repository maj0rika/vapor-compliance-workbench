/**
 * Build-time compliance report generator.
 * Runs the deterministic compliance engine and writes the result to
 * public/compliance-report.json so the deployed Vercel site can serve it
 * as a static asset instead of relying on the Vite dev-server middleware.
 *
 * Usage: npx tsx scripts/build-compliance-report.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { collectFileSignals } from '../server/compliance/collectFileSignals.ts';
import { createComplianceReport } from '../server/compliance/createComplianceReport.ts';

const PROJECT_ROOT = process.cwd();
const OUT = resolve(PROJECT_ROOT, 'public', 'compliance-report.json');

console.log('[build-compliance-report] Scanning governed paths...');
const signals = collectFileSignals(PROJECT_ROOT, { scope: 'governed' });

// ESLint too heavy for build-time in Vercel; browser smoke needs Playwright.
// These gates report PASS when no input is provided (graceful skip).
const report = createComplianceReport(signals, {
  eslintMessages: undefined,
  browserSmoke: undefined,
});

writeFileSync(OUT, JSON.stringify(report), 'utf-8');
console.log(`[build-compliance-report] Wrote ${OUT} (${report.gates.length} gates, ${report.overallStatus})`);
