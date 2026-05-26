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
  return [
    { label: 'Prompt', status: hasPrompt ? 'pass' : 'waiting' },
    { label: 'Artifact', status: hasDraft ? 'pass' : 'waiting' },
    { label: 'Canvas', status: hasArtifactSource ? 'pass' : 'waiting' },
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
