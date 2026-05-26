import { artifactToMarkdown, parseGeneratedArtifact } from './responseParser';
import { selectScript, selectScriptByTemplateKey, type TemplateKey } from './scripts';
import type { AgentMode, AgentRequest, ArtifactProvenance } from './types';

export type VerifiedSampleRun = {
  request: AgentRequest;
  assistantText: string;
  draft: string;
  artifactSource: string;
  artifactProvenance: ArtifactProvenance;
};

const TEMPLATE_KEY_MODE: Record<TemplateKey, AgentMode> = {
  'primary-button': 'component',
  'data-table': 'component',
  'token-sync': 'token-sync',
  'a11y-fix': 'a11y-audit',
  'story-test': 'story-test',
};

export function createVerifiedSampleRun(): VerifiedSampleRun {
  const artifactSource = selectScript('primary button', 'component').draft;
  if (!artifactSource) {
    throw new Error('Verified sample artifact is missing.');
  }

  const artifact = parseGeneratedArtifact(artifactSource);

  return {
    request: {
      text: '검증 샘플 실행: Vapor 기본 버튼',
      mode: 'component',
    },
    assistantText:
      '고정 샘플 산출물을 로드했습니다. API 호출 없이 실제 파서, Canvas 런타임, 검증 러너와 같은 경로로 확인합니다.',
    draft: artifactToMarkdown(artifact),
    artifactSource,
    artifactProvenance: 'deterministic-sample',
  };
}

export function createTemplateSampleRun(templateKey: TemplateKey): VerifiedSampleRun {
  const script = selectScriptByTemplateKey(templateKey);
  const artifactSource = script.draft;
  if (!artifactSource) {
    throw new Error(`Template fixture for "${templateKey}" is missing.`);
  }

  const artifact = parseGeneratedArtifact(artifactSource);
  const mode = TEMPLATE_KEY_MODE[templateKey];

  return {
    request: {
      text: `예시 샘플 실행: ${templateKey}`,
      mode,
    },
    assistantText: script.reply,
    draft: artifactToMarkdown(artifact),
    artifactSource,
    artifactProvenance: 'deterministic-sample',
  };
}
