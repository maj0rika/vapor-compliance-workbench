import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseGeneratedArtifact } from '../../src/agent/responseParser.ts';

const CLEANUP_AFTER_MS = 60_000;

export async function handleArtifactPreview(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    send(res, 405, 'Method not allowed');
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const markdown = url.searchParams.get('artifact') ?? '';
  const variant = url.searchParams.get('variant') ?? 'Default';
  const theme = url.searchParams.get('theme') === 'dark' ? 'dark' : 'light';

  if (!markdown.trim()) {
    send(res, 400, 'Missing artifact source');
    return;
  }

  const artifact = parseGeneratedArtifact(markdown);
  if (!artifact.component) {
    send(res, 422, 'Component artifact is required');
    return;
  }

  const runDir = join(tmpdir(), `vapor-preview-${randomUUID()}`);
  const srcDir = join(runDir, 'src');
  await mkdir(srcDir, { recursive: true });
  await writeFile(join(srcDir, artifact.component.filename), artifact.component.content, 'utf8');

  const entryPath = join(srcDir, 'PreviewEntry.tsx');
  await writeFile(
    entryPath,
    previewEntry({
      componentFilename: artifact.component.filename,
      primaryExport: inferPrimaryExport(artifact.component.content),
      variant,
      theme,
      defaultLabel: inferDefaultLabel(markdown),
      disabled: variant === 'Disabled',
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
  variant,
  theme,
  defaultLabel,
  disabled,
}: {
  componentFilename: string;
  primaryExport: string;
  variant: string;
  theme: 'light' | 'dark';
  defaultLabel: string;
  disabled: boolean;
}): string {
  const importPath = `./${componentFilename.replace(/\.tsx?$/, '')}`;
  return [
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    "import { ThemeProvider } from '@vapor-ui/core';",
    "import '/src/index.css';",
    `import * as ComponentModule from '${importPath}';`,
    '',
    `const Component = ComponentModule[${JSON.stringify(primaryExport)}] ?? Object.values(ComponentModule).find((value) => typeof value === 'function');`,
    "if (!Component) throw new Error('No exported React component found.');",
    `const previewChildren = ${JSON.stringify(defaultLabel)};`,
    '',
    'function PreviewApp() {',
    '  return (',
    `    <ThemeProvider defaultTheme={${JSON.stringify(theme)}}>`,
    `      <main data-testid="artifact-canvas" aria-label={${JSON.stringify(`${primaryExport} preview`)}} style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 32 }}>`,
    `        <Component disabled={${JSON.stringify(disabled)}}>{previewChildren}</Component>`,
    '      </main>',
    '    </ThemeProvider>',
    '  );',
    '}',
    '',
    "const rootElement = document.getElementById('root')!;",
    "const root = (window as any).__vaporPreviewRoot ?? createRoot(rootElement);",
    "(window as any).__vaporPreviewRoot = root;",
    'root.render(<PreviewApp />);',
    `document.body.dataset.theme = ${JSON.stringify(theme)};`,
    `document.body.dataset.variant = ${JSON.stringify(variant)};`,
    '',
  ].join('\n');
}

function inferPrimaryExport(componentSource: string): string {
  return componentSource.match(/export function\s+(\w+)/)?.[1] ?? 'GeneratedComponent';
}

function inferDefaultLabel(markdown: string): string {
  return markdown.match(/children:\s*['"]([^'"]+)['"]/)?.[1] ?? 'Generated action';
}

function send(res: ServerResponse, status: number, message: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}

function sendHtml(res: ServerResponse, html: string): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}
