import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseGeneratedArtifact } from '../../src/agent/responseParser.ts';

const CLEANUP_AFTER_MS = 60_000;

/**
 * In-memory artifact cache. iframe URL 에 artifact 본문을 직접 싣지 않고
 * 짧은 token 만 사용하기 위함. Node HTTP 가 URL 길이를 ~16KB 로 제한
 * (HPE_HEADER_OVERFLOW → 431) 해서 큰 컴포넌트 응답이 들어오면 iframe
 * 자체 로드가 실패하는 회귀가 있었다. POST 로 본문을 미리 저장하고
 * 토큰만 query string 에 실어 limit 을 회피한다.
 */
const ARTIFACT_CACHE = new Map<string, { markdown: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60_000;

function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of ARTIFACT_CACHE) {
    if (entry.expiresAt <= now) ARTIFACT_CACHE.delete(key);
  }
}

async function readBody(req: IncomingMessage, limit = 2 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export async function handleArtifactPreview(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // POST = cache artifact 본문, 토큰만 반환. iframe URL 이 짧아져 Node
  // HPE_HEADER_OVERFLOW (431) 회피.
  if (req.method === 'POST') {
    try {
      purgeExpired();
      const body = await readBody(req);
      const payload = JSON.parse(body) as { artifact?: string };
      const markdown = (payload.artifact ?? '').trim();
      if (!markdown) {
        send(res, 400, 'Missing artifact field');
        return;
      }
      const token = randomUUID();
      ARTIFACT_CACHE.set(token, { markdown, expiresAt: Date.now() + CACHE_TTL_MS });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ token }));
      return;
    } catch (err) {
      send(res, 400, err instanceof Error ? err.message : 'POST failed');
      return;
    }
  }
  if (req.method !== 'GET') {
    send(res, 405, 'Method not allowed');
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const token = url.searchParams.get('token');
  let markdown = '';
  if (token) {
    purgeExpired();
    const cached = ARTIFACT_CACHE.get(token);
    if (!cached) {
      send(res, 404, 'Artifact token expired or unknown.');
      return;
    }
    markdown = cached.markdown;
  } else {
    // 후방 호환: query string 으로 직접 받아온 케이스 (작은 fixture).
    markdown = url.searchParams.get('artifact') ?? '';
  }
  const variant = url.searchParams.get('variant') ?? 'Default';
  const theme = url.searchParams.get('theme') === 'dark' ? 'dark' : 'light';
  const previewRunId = url.searchParams.get('previewRunId') ?? '';
  const parentOrigin = url.searchParams.get('parentOrigin') ?? '*';

  if (!markdown.trim()) {
    send(res, 400, 'Missing artifact source');
    return;
  }

  const artifact = parseGeneratedArtifact(markdown);
  if (!artifact.component) {
    send(res, 422, 'Component artifact is required');
    return;
  }
  if (artifact.metadataValidation?.status === 'fail') {
    send(res, 422, `Metadata contract failed: ${artifact.metadataValidation.errors.join(' ')}`);
    return;
  }

  const runDir = join(tmpdir(), `vapor-preview-${randomUUID()}`);
  const srcDir = join(runDir, 'src');
  await mkdir(srcDir, { recursive: true });
  await writeFile(join(srcDir, artifact.component.filename), artifact.component.content, 'utf8');

  const entryPath = join(srcDir, 'PreviewEntry.tsx');
  const primaryExport = artifact.metadata
    ? artifact.metadata.primaryExport
    : inferPrimaryExport(artifact.component.content);
  if (!primaryExport) {
    send(res, 422, 'Metadata contract failed: primaryExport is required.');
    return;
  }
  await writeFile(
    entryPath,
    previewEntry({
      componentFilename: artifact.component.filename,
      primaryExport,
      strictPrimaryExport: Boolean(artifact.metadata),
      variant,
      theme,
      previewRunId,
      parentOrigin,
      previewProps: buildPreviewProps(markdown, artifact, variant),
    }),
    'utf8',
  );

  setTimeout(() => {
    void rm(runDir, { recursive: true, force: true });
  }, CLEANUP_AFTER_MS).unref();

  sendHtml(
    res,
    [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      '</head>',
      `<body data-theme="${theme}">`,
      '<div id="root"></div>',
      '<script type="module">',
      "import RefreshRuntime from '/@react-refresh';",
      'RefreshRuntime.injectIntoGlobalHook(window);',
      'window.$RefreshReg$ = () => {};',
      'window.$RefreshSig$ = () => (type) => type;',
      'window.__vite_plugin_react_preamble_installed__ = true;',
      '</script>',
      `<script type="module" src="/@fs/${entryPath}"></script>`,
      '</body>',
      '</html>',
    ].join('\n'),
  );
}

function previewEntry({
  componentFilename,
  primaryExport,
  strictPrimaryExport,
  variant,
  theme,
  previewRunId,
  parentOrigin,
  previewProps,
}: {
  componentFilename: string;
  primaryExport: string;
  strictPrimaryExport: boolean;
  variant: string;
  theme: 'light' | 'dark';
  previewRunId: string;
  parentOrigin: string;
  previewProps: Record<string, unknown>;
}): string {
  const importPath = `./${componentFilename.replace(/\.tsx?$/, '')}`;
  return [
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    "import { ThemeProvider } from '@vapor-ui/core';",
    "import '/src/index.css';",
    `import * as ComponentModule from '${importPath}';`,
    '',
    `const Component = ${componentLookupExpression(primaryExport, strictPrimaryExport)};`,
    `if (!Component) throw new Error(${JSON.stringify(`No exported React component found for primaryExport "${primaryExport}".`)});`,
    `const previewProps = ${JSON.stringify(previewProps)};`,
    `const previewVariant = ${JSON.stringify(variant)};`,
    `const previewTheme = ${JSON.stringify(theme)};`,
    `const previewRunId = ${JSON.stringify(previewRunId)};`,
    `const parentOrigin = ${JSON.stringify(parentOrigin)};`,
    '',
    'function notifyPreview(type: "vapor-preview-ready" | "vapor-preview-error", message?: string) {',
    '  window.parent.postMessage({ type, previewRunId, variant: previewVariant, theme: previewTheme, message }, parentOrigin);',
    '}',
    '',
    'class PreviewErrorBoundary extends React.Component<',
    '  { children: React.ReactNode },',
    '  { error?: Error }',
    '> {',
    '  state: { error?: Error } = {};',
    '  componentDidCatch(error: Error) {',
    '    this.setState({ error });',
    '    notifyPreview("vapor-preview-error", error.message);',
    '  }',
    '  render() {',
    '    if (this.state.error) {',
    '      return <pre data-preview-error>{this.state.error.message}</pre>;',
    '    }',
    '    return this.props.children;',
    '  }',
    '}',
    '',
    'function ReadyReporter() {',
    '  React.useEffect(() => {',
    '    notifyPreview("vapor-preview-ready");',
    '  }, []);',
    '  return null;',
    '}',
    '',
    'function PreviewApp() {',
    '  const element = React.createElement(',
    '    Component as React.ComponentType<Record<string, unknown>>,',
    '    previewProps,',
    '  );',
    '  return (',
    `    <ThemeProvider defaultTheme={${JSON.stringify(theme)}}>`,
    `      <main data-testid="artifact-canvas" aria-label={${JSON.stringify(`${primaryExport} preview`)}} style={{ display: 'grid', placeItems: 'start center', minHeight: '100vh', padding: 24 }}>`,
    '        {element}',
    '      </main>',
    '    </ThemeProvider>',
    '  );',
    '}',
    '',
    "const rootElement = document.getElementById('root')!;",
    "const root = (window as any).__vaporPreviewRoot ?? createRoot(rootElement);",
    "(window as any).__vaporPreviewRoot = root;",
    'root.render(',
    '  <PreviewErrorBoundary>',
    '    <PreviewApp />',
    '    <ReadyReporter />',
    '  </PreviewErrorBoundary>,',
    ');',
    'document.body.dataset.theme = previewTheme;',
    'document.body.dataset.variant = previewVariant;',
    '',
  ].join('\n');
}

function inferPrimaryExport(componentSource: string): string {
  return componentSource.match(/export function\s+(\w+)/)?.[1] ?? 'GeneratedComponent';
}

function componentLookupExpression(primaryExport: string, strictPrimaryExport: boolean): string {
  const exact = `ComponentModule[${JSON.stringify(primaryExport)}]`;
  if (strictPrimaryExport) return exact;
  return `${exact} ?? Object.values(ComponentModule).find((value) => typeof value === 'function')`;
}

function inferDefaultLabel(markdown: string): string {
  return markdown.match(/children:\s*['"]([^'"]+)['"]/)?.[1] ?? 'Generated action';
}

function buildPreviewProps(
  markdown: string,
  artifact: ReturnType<typeof parseGeneratedArtifact>,
  variant: string,
): Record<string, unknown> {
  const metadata = artifact.metadata;
  if (metadata) {
    const selectedVariant = metadata.variants?.find((item) => item.name === variant);
    return {
      ...(metadata.defaultProps ?? {}),
      ...(selectedVariant?.props ?? {}),
    };
  }

  return {
    children: inferDefaultLabel(markdown),
    ...(variant === 'Disabled' ? { disabled: true } : {}),
  };
}

function send(res: ServerResponse, status: number, message: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(message);
}

function sendHtml(res: ServerResponse, html: string): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(html);
}
