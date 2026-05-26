import type { ValidationPipelineState } from './PreviewPanel';

export type PipelineStepStatus = 'waiting' | 'active' | 'pass' | 'fail';

export type RunPipelineStep = {
  label: 'Prompt' | 'Artifact' | 'Canvas' | 'Validation' | 'Repair' | 'Approve';
  status: PipelineStepStatus;
};

export function deriveRunPipelineSteps({
  hasPrompt,
  hasDraft,
  hasArtifactSource,
  validationState,
  approved,
}: {
  hasPrompt: boolean;
  hasDraft: boolean;
  hasArtifactSource: boolean;
  validationState: ValidationPipelineState;
  approved?: boolean;
}): RunPipelineStep[] {
  const promptStatus: PipelineStepStatus = hasPrompt ? 'pass' : 'active';
  const artifactStatus: PipelineStepStatus = !hasPrompt
    ? 'waiting'
    : hasDraft
      ? 'pass'
      : 'active';
  const canvasStatus: PipelineStepStatus = !hasDraft
    ? 'waiting'
    : hasArtifactSource
      ? 'pass'
      : 'active';

  return [
    { label: 'Prompt', status: promptStatus },
    { label: 'Artifact', status: artifactStatus },
    { label: 'Canvas', status: canvasStatus },
    { label: 'Validation', status: toPipelineStatus(validationState) },
    { label: 'Repair', status: validationState === 'fail' || validationState === 'error' ? 'active' : 'waiting' },
    { label: 'Approve', status: approved ? 'pass' : validationState === 'pass' ? 'active' : 'waiting' },
  ];
}

function toPipelineStatus(state: ValidationPipelineState): PipelineStepStatus {
  switch (state) {
    case 'running':
      return 'active';
    case 'pass':
      return 'pass';
    case 'fail':
    case 'error':
      return 'fail';
    case 'idle':
      return 'waiting';
  }
}
