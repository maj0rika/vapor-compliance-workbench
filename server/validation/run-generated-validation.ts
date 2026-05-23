/**
 * Placeholder CLI for the real generated artifact gate.
 *
 * This intentionally fails until server/validation implements:
 * parse -> temp workspace -> file write -> typecheck -> Vitest -> Axe ->
 * token gate -> cleanup.
 */
console.error(
  [
    'Generated artifact validation runner is not implemented yet.',
    'Required gate: component/story/test parse, temp workspace typecheck, Vitest, Axe, Vapor token check, cleanup.',
  ].join('\n'),
);

process.exitCode = 1;
