import { Button, Text } from '@vapor-ui/core';
import { AiSmartieOutlineIcon } from '@vapor-ui/icons';
import type { TemplateKey } from '../../agent';

type TemplateItem = {
  label: string;
  prompt: string;
  output: string;
  gates: string;
  templateKey: TemplateKey;
};

const TEMPLATES: TemplateItem[] = [
  {
    label: '기본 버튼',
    prompt: 'primary 버튼 컴포넌트 생성, 다크 모드 지원, Vapor 토큰 준수',
    output: '버튼 TSX · Storybook 예시 · Vitest · 접근성',
    gates: '타입 검사, 단위 테스트, 렌더, 접근성, 토큰',
    templateKey: 'primary-button',
  },
  {
    label: '데이터 테이블',
    prompt: '정렬 가능한 DataTable 컴포넌트와 Storybook 예시, Vitest 테스트 작성',
    output: '테이블 TSX · 정렬 예시 · 행 상태 테스트',
    gates: '로딩, 빈 상태, 오류, 키보드 상태',
    templateKey: 'data-table',
  },
  {
    label: '토큰 동기화',
    prompt: 'Figma Variables JSON을 Vapor CSS token 매핑으로 변환하는 유틸 작성',
    output: '토큰 매핑 유틸 · 매핑 예시 · 단위 테스트',
    gates: '원시 색상, 간격, 반경 값 검사',
    templateKey: 'token-sync',
  },
  {
    label: '접근성 수정',
    prompt: 'IconButton 접근성 결함을 Axe 기준으로 찾고 수정 코드와 테스트 작성',
    output: '접근성 TSX 패치 · Axe 중심 테스트',
    gates: '역할, 이름, 키보드, 비활성 상태',
    templateKey: 'a11y-fix',
  },
  {
    label: '스토리/테스트',
    prompt: '기존 컴포넌트에 대한 Storybook 예시와 Vitest 테스트 생성',
    output: 'Storybook 예시 · Vitest · 커버리지',
    gates: '단위 테스트, 스토리 렌더, 접근성',
    templateKey: 'story-test',
  },
];

const WORKFLOW_STEPS = [
  '작업 선택',
  '문서·토큰·코드 첨부',
  '산출물 생성',
  '검증 게이트 실행',
  '보수 또는 승인',
];

export type EmptyStateProps = {
  /** 템플릿 선택 시 호출 — templateKey 로 고정 샘플을 로드한다. */
  onPick: (templateKey: TemplateKey) => void;
  /** 검증 샘플을 모델 호출 없이 workbench 에 로드한다. */
  onRunVerifiedSample: () => void;
  /**
   * 자연어 예시 칩 선택 시 호출 — 고정 샘플 로드 없이 PromptBar 입력창만 채운다.
   * 미지정 시 자연어 섹션을 숨긴다.
   */
  onPickPromptText?: (text: string) => void;
};

/** 자연어로 직접 입력해 시작할 수 있는 예시 prompt. */
const NL_PROMPTS = [
  'Vapor primary 버튼 컴포넌트 생성, 다크 모드 지원, Tooltip 포함',
  '고정 헤더가 있는 DataTable 컴포넌트, 정렬·페이지네이션 포함',
  '첨부한 IconButton 의 접근성 결함 찾아서 수정 코드와 axe 테스트 작성',
  'Figma Variables JSON 을 Vapor token CSS 로 변환하는 유틸',
];

export function EmptyState({
  onPick,
  onRunVerifiedSample,
  onPickPromptText,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-start gap-v-200 overflow-y-auto p-v-400 pb-v-700 pt-v-500">
      <div className="grid max-w-[820px] gap-v-300">
        <div className="grid gap-v-200 rounded-v-400 border border-v-normal bg-v-canvas-100 p-v-300 shadow-sm">
          <div className="flex items-center justify-between gap-v-100">
            <Text typography="subtitle2">5단계 작업 흐름</Text>
            <span className="rounded-v-999 bg-v-primary-100 px-v-100 py-v-50 text-xs font-medium text-v-primary">
              진행 순서
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-v-150">
            {WORKFLOW_STEPS.map((step, index) => (
              <div
                key={step}
                className="flex min-h-[88px] min-w-0 flex-col justify-between gap-v-100 rounded-v-300 border border-v-normal bg-v-canvas-200 px-v-150 py-v-150 shadow-sm"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-v-999 bg-v-primary-100 text-sm font-semibold text-v-primary">
                  {index + 1}
                </span>
                <span className="break-keep text-sm font-semibold leading-5 text-v-normal">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-v-150 lg:flex-row">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-v-300 bg-v-primary-100 text-v-primary">
            <AiSmartieOutlineIcon size={20} aria-hidden="true" />
          </div>

          <div className="flex min-w-0 flex-col gap-v-150 rounded-v-400 border border-v-normal bg-v-canvas-100 p-v-300 shadow-sm">
            <div className="flex flex-col gap-v-50">
              <Text typography="subtitle1">Vapor 컴포넌트 패키지를 바로 만듭니다</Text>
              <Text typography="body3" foreground="hint-200">
                컴포넌트 코드, Storybook 예시, Vitest 테스트, 접근성·토큰 검증을
                한 번에 생성하고 오른쪽 Canvas에서 바로 확인합니다.
              </Text>
            </div>

            <div className="grid gap-v-150 rounded-v-300 border border-v-primary bg-v-primary-100 p-v-200">
              <div className="flex min-w-0 flex-col gap-v-50">
                <Text typography="subtitle2">검증된 샘플 바로 보기</Text>
                <Text typography="body4" foreground="hint-200">
                  고정 샘플 · API 호출 없음 · 실제 파서·Canvas
                  런타임·검증 러너를 그대로 사용
                </Text>
              </div>
              <Button
                size="md"
                colorPalette="primary"
                onClick={onRunVerifiedSample}
              >
                검증 샘플 실행
              </Button>
            </div>

            {onPickPromptText && (
              <div className="flex flex-col gap-v-100">
                <Text typography="subtitle2">자연어 예시</Text>
                <Text typography="body4" foreground="hint-200">
                  클릭하면 아래 입력창이 자동으로 채워집니다. 그대로 보내거나
                  자유롭게 수정하세요. 실제 API 호출로 새 산출물을 생성합니다.
                </Text>
                <div className="flex flex-wrap gap-v-50">
                  {NL_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onPickPromptText(prompt)}
                      className="rounded-v-200 border border-v-normal bg-v-canvas-100 px-v-150 py-v-100 text-left text-xs transition-colors hover:border-v-primary hover:bg-v-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v-primary"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-v-100">
              {TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => onPick(template.templateKey)}
                  className="flex min-w-0 flex-col items-start gap-v-50 rounded-v-300 border border-v-normal bg-v-canvas-100 p-v-200 text-left transition-colors hover:border-v-primary hover:bg-v-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v-primary"
                >
                  <span className="break-keep text-sm font-medium">{template.label}</span>
                  <span
                    className="break-keep text-xs leading-5"
                    style={{ color: 'var(--vapor-color-foreground-hint-200)' }}
                  >
                    {template.output}
                  </span>
                  <span
                    className="break-keep text-xs leading-5"
                    style={{ color: 'var(--vapor-color-foreground-hint-200)' }}
                  >
                    {template.gates}
                  </span>
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
