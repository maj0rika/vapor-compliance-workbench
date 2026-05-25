import { validateArtifactMetadata, type MetadataValidationResult } from './artifactMetadata.ts';

export type ArtifactType = 'component' | 'story' | 'test';

export type CodeArtifact = {
  type: ArtifactType;
  filename: string;
  language: 'ts' | 'tsx';
  content: string;
};

export type ArtifactVariantMetadata = {
  name: string;
  props?: Record<string, unknown>;
};

export type ArtifactMetadata = {
  componentName?: string;
  primaryExport?: string;
  defaultProps?: Record<string, unknown>;
  variants?: ArtifactVariantMetadata[];
};

export type GeneratedArtifact = {
  metadata?: ArtifactMetadata;
  metadataValidation?: MetadataValidationResult;
  component?: CodeArtifact;
  story?: CodeArtifact;
  test?: CodeArtifact;
  a11yNotes?: string;
  tokenNotes?: string;
};

const ARTIFACT_RE =
  /<artifact\s+type="(component|story|test)"\s+filename="([^"]+)">\s*```(tsx|ts)?\s*([\s\S]*?)```\s*<\/artifact>/g;
const META_RE = /<artifact-meta>\s*([\s\S]*?)\s*<\/artifact-meta>/;
const NOTES_RE = /<notes\s+type="(a11y|token)">([\s\S]*?)<\/notes>/g;

/**
 * Artifact filename safety policy.
 *
 * LLM 응답의 `filename="..."` 값은 서버 측에서 `path.join(srcDir, filename)`
 * 로 사용되므로, path traversal (`../`, 절대 경로), 위험한 확장자, 제어 문자
 * 가 통과하면 temp workspace 밖의 파일을 덮어쓰거나 임의 실행 코드를 생성할
 * 수 있다. 이 정규식은 강한 화이트리스트로 단일 basename + `.ts`/`.tsx`
 * 확장자만 허용한다.
 */
const SAFE_FILENAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62})\.(ts|tsx)$/;

/**
 * filename 이 안전한 단일 basename 인지 검증한다. 외부 입력 (LLM 응답, 첨부
 * 파일 메타) 을 server 또는 file write 경로로 흘리기 전에 반드시 통과해야
 * 한다.
 */
export function isSafeArtifactFilename(filename: string): boolean {
  if (typeof filename !== 'string') return false;
  if (filename.length === 0 || filename.length > 64) return false;
  if (filename.includes('\0')) return false;
  // ASCII 제어 문자 (0x00-0x1F, 0x7F) 거부
  for (let i = 0; i < filename.length; i++) {
    const code = filename.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false;
  }
  return SAFE_FILENAME_RE.test(filename);
}

export function parseGeneratedArtifact(markdown: string): GeneratedArtifact {
  const metadataParse = parseArtifactMetadata(markdown);
  const result: GeneratedArtifact = {
    ...(metadataParse.metadata ? { metadata: metadataParse.metadata } : {}),
    metadataValidation: { status: 'warn', messages: [], warnings: [], errors: [] },
  };
  const metadata = metadataParse.metadata;
  if (metadata) result.metadata = metadata;

  for (const match of markdown.matchAll(ARTIFACT_RE)) {
    const type = match[1] as ArtifactType;
    const filename = match[2];
    // path traversal / 위험한 확장자 차단. 안전하지 않은 filename 은 이
    // artifact 를 결과에서 누락시켜, server write/UI 표시 모두에서 사용되지
    // 않게 한다.
    if (!isSafeArtifactFilename(filename)) continue;
    const artifact: CodeArtifact = {
      type,
      filename,
      language: (match[3] || inferLanguage(filename)) as 'ts' | 'tsx',
      content: match[4].trim(),
    };
    result[type] = artifact;
  }

  for (const match of markdown.matchAll(NOTES_RE)) {
    const type = match[1];
    if (type === 'a11y') result.a11yNotes = match[2].trim();
    if (type === 'token') result.tokenNotes = match[2].trim();
  }

  result.metadataValidation = validateArtifactMetadata({
    metadata,
    rawMetadata: metadataParse.rawMetadata,
    parseError: metadataParse.parseError,
    componentSource: result.component?.content,
  });

  return result;
}

export function artifactToMarkdown(artifact: GeneratedArtifact): string {
  const sections: string[] = [];
  if (artifact.component) {
    sections.push(codeSection('Component', artifact.component));
  }
  if (artifact.story) {
    sections.push(codeSection('Story', artifact.story));
  }
  if (artifact.test) {
    sections.push(codeSection('Test', artifact.test));
  }
  if (artifact.a11yNotes || artifact.tokenNotes) {
    sections.push(
      [
        '## Validation',
        '',
        '- Typecheck: CHECK',
        '- Unit: CHECK',
        '- Runtime Render: CHECK',
        '- Axe: CHECK',
        '- Vapor token usage: CHECK',
        '- Cleanup: CHECK',
        artifact.a11yNotes ? `\n### A11y\n${artifact.a11yNotes}` : '',
        artifact.tokenNotes ? `\n### Token\n${artifact.tokenNotes}` : '',
      ].join('\n'),
    );
  }
  return sections.join('\n\n');
}

function parseArtifactMetadata(markdown: string): {
  metadata?: ArtifactMetadata;
  rawMetadata?: string;
  parseError?: string;
} {
  const match = markdown.match(META_RE);
  if (!match) return {};
  const rawMetadata = match[1];

  try {
    const raw = JSON.parse(rawMetadata) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { rawMetadata };
    const value = raw as Record<string, unknown>;
    const metadata: ArtifactMetadata = {};

    if (typeof value.componentName === 'string' && value.componentName.trim()) {
      metadata.componentName = value.componentName.trim();
    }
    if (typeof value.primaryExport === 'string' && value.primaryExport.trim()) {
      metadata.primaryExport = value.primaryExport.trim();
    }
    if (isRecord(value.defaultProps)) {
      metadata.defaultProps = value.defaultProps;
    }
    if (Array.isArray(value.variants)) {
      metadata.variants = value.variants.flatMap((variant) => {
        if (!isRecord(variant) || typeof variant.name !== 'string' || !variant.name.trim()) {
          return [];
        }
        return [
          {
            name: variant.name.trim(),
            ...(isRecord(variant.props) ? { props: variant.props } : {}),
          },
        ];
      });
    }

    return {
      rawMetadata,
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    };
  } catch (error) {
    return {
      rawMetadata,
      parseError: error instanceof Error ? error.message : 'unknown parse error',
    };
  }
}

function codeSection(title: string, artifact: CodeArtifact): string {
  return [
    `## ${title}`,
    '',
    `\`${artifact.filename}\``,
    '',
    `\`\`\`${artifact.language}`,
    artifact.content,
    '```',
  ].join('\n');
}

function inferLanguage(filename: string): 'ts' | 'tsx' {
  return filename.endsWith('.tsx') ? 'tsx' : 'ts';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
