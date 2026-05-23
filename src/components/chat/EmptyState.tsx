import { Button, Text } from '@vapor-ui/core';
import { AiSmartieOutlineIcon } from '@vapor-ui/icons';

const TEMPLATES = [
  {
    label: 'Primary Button',
    prompt: 'primary 버튼 컴포넌트 생성, dark mode 지원, Vapor 토큰 준수',
    output: 'PrimaryActionButton.tsx · story · Vitest · Axe',
    gates: 'Typecheck, Unit, Runtime, Axe, Token',
  },
  {
    label: 'Data Table',
    prompt: '정렬 가능한 DataTable 컴포넌트와 Storybook story, Vitest 테스트 작성',
    output: 'DataTable.tsx · sortable story · row-state tests',
    gates: 'Loading, empty, error, keyboard states',
  },
  {
    label: 'Token Sync',
    prompt: 'Figma Variables JSON을 Vapor CSS token 매핑으로 변환하는 유틸 작성',
    output: 'token map utility · mapping story · unit tests',
    gates: 'Raw color, spacing, radius checks',
  },
  {
    label: 'A11y Fix',
    prompt: 'IconButton 접근성 결함을 Axe 기준으로 찾고 수정 코드와 테스트 작성',
    output: 'accessible TSX patch · axe-focused tests',
    gates: 'Role, name, keyboard, disabled states',
  },
];

const WORKFLOW_STEPS = [
  'Choose task',
  'Attach spec/token/source',
  'Generate artifact',
  'Validate gates',
  'Repair or approve',
];

export type EmptyStateProps = {
  /** 템플릿 선택 시 호출 — 선택한 문구를 입력창에 채운다. */
  onPick: (suggestion: string) => void;
};

export function EmptyState({ onPick }: EmptyStateProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-start gap-4 overflow-y-auto p-v-400 pb-v-700 pt-v-500">
      <div className="grid max-w-[820px] gap-v-300">
        <div className="grid gap-v-100 rounded-v-300 border border-v-normal bg-v-canvas-100 p-v-300">
          <Text typography="subtitle2">Workbench ready</Text>
          <div className="grid gap-v-100 sm:grid-cols-5">
            {WORKFLOW_STEPS.map((step, index) => (
              <div
                key={step}
                className="flex min-h-[72px] flex-col gap-1 rounded-v-200 border border-v-normal bg-v-canvas-200 px-v-150 py-v-100"
              >
                <Text typography="body4" foreground="hint-200">
                  {index + 1}
                </Text>
                <Text typography="body4">{step}</Text>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-v-300 bg-v-primary-100 text-v-primary">
            <AiSmartieOutlineIcon size={20} aria-hidden="true" />
          </div>

          <div className="flex min-w-0 flex-col gap-3 rounded-v-400 border border-v-normal bg-v-canvas-100 p-v-300 shadow-sm">
            <div className="flex flex-col gap-1">
              <Text typography="subtitle1">무엇을 자동화할까요?</Text>
              <Text typography="body3" foreground="hint-200">
                Vapor 토큰을 지키는 컴포넌트, Storybook story, Vitest 테스트,
                Axe 접근성 체크까지 한 번에 생성합니다.
              </Text>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((template) => (
                <Button
                  key={template.label}
                  size="md"
                  variant="outline"
                  onClick={() => onPick(template.prompt)}
                >
                  <span className="flex min-w-0 flex-col items-start gap-1 text-left">
                    <span>{template.label}</span>
                    <span className="text-xs font-normal text-v-hint">{template.output}</span>
                    <span className="text-xs font-normal text-v-hint">{template.gates}</span>
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
