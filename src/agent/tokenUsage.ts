import type { GeneratedArtifact } from './responseParser';

export type TokenCheckResult = {
  status: 'pass' | 'warn' | 'fail';
  rawColorCount: number;
  rawSpacingCount: number;
  rawRadiusCount: number;
  vaporTokenReferenceCount: number;
  messages: string[];
};

/**
 * Raw color signal sources (모두 fail-grade):
 *   - hex literal: #fff, #ffffff, #ffffffff (3/4/6/8 digits)
 *   - rgb()/rgba()/hsl()/hsla()/oklch()/oklab()/lab()/lch()/color() function 호출
 *   - 일반 CSS 명명 색상 키워드 (red/blue/green/black/white/grey/gray/...)
 *     이들은 `style={{ color: 'red' }}` 같은 inline object 값으로 자주 등장하므로,
 *     ': "<name>"' 또는 ': \'<name>\'' 형태 + JSX `color="red"`/`background="red"`
 *     prop 형태를 잡는다.
 */
const RAW_COLOR_RE =
  /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\s*\(/gi;
const NAMED_COLOR_KEYWORDS = new Set<string>([
  'red',
  'blue',
  'green',
  'black',
  'white',
  'yellow',
  'orange',
  'pink',
  'purple',
  'brown',
  'cyan',
  'magenta',
  'gray',
  'grey',
  'silver',
  'gold',
  'navy',
  'teal',
  'indigo',
  'violet',
  'crimson',
  'salmon',
  'tomato',
  'turquoise',
  'lime',
  'olive',
  'maroon',
  'beige',
  'coral',
]);
const NAMED_COLOR_VALUE_RE =
  /(?:color|background(?:Color)?|borderColor|fill|stroke|outlineColor)\s*[:=]\s*['"]([A-Za-z]+)['"]/gi;

/**
 * Raw spacing/radius 는 inline object 표기 `padding: '16px'`, `padding: 16` 과
 * Tailwind arbitrary value `p-[16px]`/`mt-[8px]`, JSX prop `padding="16px"` 모두
 * 잡는다. `<digits>px` 단독 매칭은 false positive 가 너무 많아 prop 키워드를
 * 게이트로 둔다.
 */
const RAW_SPACING_RE =
  /(?:padding(?:Left|Right|Top|Bottom)?|margin(?:Left|Right|Top|Bottom)?|gap(?:Column|Row)?|top|right|bottom|left|inset)\s*[:=]\s*['"]?-?\d+(?:\.\d+)?(?:px|rem|em)?\b/gi;
const ARBITRARY_TAILWIND_SPACING_RE =
  /\b(?:p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml|gap)-\[\s*-?\d+(?:\.\d+)?(?:px|rem|em)?\s*\]/g;
const RAW_RADIUS_RE =
  /(?:borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)\s*[:=]\s*['"]?-?\d+(?:\.\d+)?(?:px|rem|em)?\b/gi;
const ARBITRARY_TAILWIND_RADIUS_RE = /\brounded(?:-[a-z]+)?-\[\s*-?\d+(?:\.\d+)?(?:px|rem|em)?\s*\]/g;
const VAPOR_TOKEN_RE = /@vapor-ui\/core|var\(--vapor-|bg-v-|text-v-|border-v-|rounded-v-|p-v-|gap-v-/g;

export function checkTokenUsage(artifact: GeneratedArtifact): TokenCheckResult {
  const source = [
    artifact.component?.content ?? '',
    artifact.story?.content ?? '',
    artifact.test?.content ?? '',
  ].join('\n');

  const hexAndFuncCount = countMatches(source, RAW_COLOR_RE);
  const namedColorCount = countNamedColorValues(source);
  const rawColorCount = hexAndFuncCount + namedColorCount;
  const rawSpacingCount =
    countMatches(source, RAW_SPACING_RE) + countMatches(source, ARBITRARY_TAILWIND_SPACING_RE);
  const rawRadiusCount =
    countMatches(source, RAW_RADIUS_RE) + countMatches(source, ARBITRARY_TAILWIND_RADIUS_RE);
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

function countNamedColorValues(source: string): number {
  let count = 0;
  for (const match of source.matchAll(NAMED_COLOR_VALUE_RE)) {
    const candidate = match[1].toLowerCase();
    if (NAMED_COLOR_KEYWORDS.has(candidate)) count++;
  }
  return count;
}
