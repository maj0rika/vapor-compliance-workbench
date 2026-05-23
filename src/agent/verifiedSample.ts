import { artifactToMarkdown, parseGeneratedArtifact } from './responseParser';
import { selectScript } from './scripts';
import type { AgentRequest, ArtifactProvenance } from './types';

export type VerifiedSampleRun = {
  request: AgentRequest;
  assistantText: string;
  draft: string;
  artifactSource: string;
  artifactProvenance: ArtifactProvenance;
};

export function createVerifiedSampleRun(): VerifiedSampleRun {
  const artifactSource = selectScript('primary button', 'component').draft;
  if (!artifactSource) {
    throw new Error('Verified sample artifact is missing.');
  }

  const artifact = parseGeneratedArtifact(artifactSource);

  return {
    request: {
      text: 'Verified sample run: primary Vapor button component',
      mode: 'component',
    },
    assistantText:
      'Deterministic sample artifact를 로드했습니다. DeepSeek 호출은 하지 않았고, parser, Canvas runtime, validation runner는 실제 생성물과 같은 경로를 사용합니다.',
    draft: artifactToMarkdown(artifact),
    artifactSource,
    artifactProvenance: 'deterministic-sample',
  };
}
