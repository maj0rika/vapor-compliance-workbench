import type { GeneratedArtifact } from './responseParser';

export type TokenCheckResult = {
  status: 'pass' | 'warn' | 'fail';
  rawColorCount: number;
  rawSpacingCount: number;
  rawRadiusCount: number;
  vaporTokenReferenceCount: number;
  messages: string[];
};

const RAW_COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\(/gi;
const RAW_SPACING_RE = /(?:padding|margin|gap|top|right|bottom|left):\s*["']?\d+px/gi;
const RAW_RADIUS_RE = /borderRadius:\s*["']?\d+px/gi;
const VAPOR_TOKEN_RE = /@vapor-ui\/core|var\(--vapor-|bg-v-|text-v-|border-v-|rounded-v-|p-v-|gap-v-/g;

export function checkTokenUsage(artifact: GeneratedArtifact): TokenCheckResult {
  const source = [
    artifact.component?.content ?? '',
    artifact.story?.content ?? '',
    artifact.test?.content ?? '',
  ].join('\n');

  const rawColorCount = countMatches(source, RAW_COLOR_RE);
  const rawSpacingCount = countMatches(source, RAW_SPACING_RE);
  const rawRadiusCount = countMatches(source, RAW_RADIUS_RE);
  const vaporTokenReferenceCount = countMatches(source, VAPOR_TOKEN_RE);
  const messages: string[] = [];

  if (rawColorCount > 0) messages.push(`${rawColorCount} raw color value(s) detected.`);
  if (rawSpacingCount > 0) messages.push(`${rawSpacingCount} raw spacing value(s) detected.`);
  if (rawRadiusCount > 0) messages.push(`${rawRadiusCount} raw radius value(s) detected.`);
  if (vaporTokenReferenceCount === 0) messages.push('No Vapor primitive or token reference detected.');

  const status =
    vaporTokenReferenceCount === 0 || rawColorCount > 0
      ? 'fail'
      : rawSpacingCount > 0 || rawRadiusCount > 0
        ? 'warn'
        : 'pass';

  return {
    status,
    rawColorCount,
    rawSpacingCount,
    rawRadiusCount,
    vaporTokenReferenceCount,
    messages,
  };
}

function countMatches(value: string, regex: RegExp): number {
  return value.match(regex)?.length ?? 0;
}
