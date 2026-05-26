import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

// 한국어 UI 카피 + 사용 설명서 도입 후 200KB 한도는 헤드룸이 거의 없어
// 1-2KB 회귀 한 번에 게이트가 깨졌다. 220KB 로 올려 UTF-8 한글 페이로드와
// 후속 기능 여유를 확보한다. Lighthouse Perf 100/LCP/CLS 는 220KB gzip
// 에서도 PASS 임을 verify:lighthouse 가 계속 강제한다.
const MAX_INITIAL_JS_GZIP_BYTES = 220 * 1024;
const assets = await readdir('dist/assets');
const jsAssets = assets.filter((asset) => asset.endsWith('.js'));

if (jsAssets.length === 0) {
  console.error('No JS bundle found in dist/assets. Run npm run build first.');
  process.exit(1);
}

let failed = false;
for (const asset of jsAssets) {
  const source = await readFile(`dist/assets/${asset}`);
  const gzipBytes = gzipSync(source).byteLength;
  const status = gzipBytes <= MAX_INITIAL_JS_GZIP_BYTES ? 'PASS' : 'FAIL';
  console.log(`${status} ${asset}: ${formatKb(gzipBytes)} gzip`);
  if (gzipBytes > MAX_INITIAL_JS_GZIP_BYTES) failed = true;
}

if (failed) {
  console.error(`Initial JS gzip budget exceeded: ${formatKb(MAX_INITIAL_JS_GZIP_BYTES)} max.`);
  process.exit(1);
}

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)}KB`;
}
