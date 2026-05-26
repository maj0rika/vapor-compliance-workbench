import { ChatScreen } from '../../components/chat';
import type { PromptModeOption } from '../../components/prompt';

const MODE_OPTIONS: PromptModeOption[] = [
  { id: 'component', label: '컴포넌트', description: 'React + TSX 생성' },
  { id: 'token-sync', label: '토큰 동기화', description: 'Figma Variables 매핑' },
  { id: 'a11y-audit', label: '접근성 점검', description: 'Axe 기준 점검' },
  { id: 'story-test', label: '스토리/테스트', description: 'Storybook + Vitest' },
];

const MAX_REFERENCE_FILE_SIZE = 300 * 1024;
const MAX_REFERENCE_FILES = 5;

/**
 * Vapor DS 자동화 워크벤치 화면의 데모 페이지.
 *
 * 앱 레이어이므로 Vapor primitive 와 agent 내부 모듈을 직접 import 하지 않고,
 * 제품 컴포넌트(ChatScreen)만 사용한다.
 */
export function ChatDemoPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-v-200">
      <header className="flex flex-col gap-v-50">
        <h1 className="m-0 text-xl font-semibold">Vapor 디자인시스템 자동화 워크벤치</h1>
        <p
          className="m-0 text-sm"
          style={{ color: 'var(--vapor-color-foreground-hint-200)' }}
        >
          자연어로 요청하면 Vapor 컴포넌트 코드 · Storybook story · Vitest 테스트를
          생성하고, 실제 빌드·접근성·토큰 검증을 거쳐 결과를 보여줍니다.
        </p>
      </header>
      <ChatScreen
        modeOptions={MODE_OPTIONS}
        acceptedFileTypes={['.json', '.ts', '.tsx', '.md', '.txt']}
        maxFileSize={MAX_REFERENCE_FILE_SIZE}
        maxFiles={MAX_REFERENCE_FILES}
      />
    </div>
  );
}
