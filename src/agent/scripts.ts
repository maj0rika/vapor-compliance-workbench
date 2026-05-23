/**
 * Vapor DS 자동화 도메인의 모의 응답 스크립트.
 *
 * 실제 DeepSeek 대신 deterministic artifact 를 방출해 E2E 를 안정화한다.
 */

import type { AgentMode } from './types';

export type AgentScript = {
  /** 어시스턴트 응답 본문. */
  reply: string;
  /** PreviewPanel 에 렌더링할 생성 artifact. */
  draft?: string;
  /** 설정 시 본문 일부를 흘린 뒤 오류로 종료한다 (오류 경로 테스트용). */
  error?: string;
};

const COMPONENT_ARTIFACT = `<artifact type="component" filename="PrimaryActionButton.tsx">
\`\`\`tsx
import { Button } from '@vapor-ui/core';

export type PrimaryActionButtonProps = {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
};

export function PrimaryActionButton({
  children,
  disabled = false,
  onClick,
}: PrimaryActionButtonProps) {
  return (
    <Button
      type="button"
      colorPalette="primary"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
\`\`\`
</artifact>

<artifact type="story" filename="PrimaryActionButton.stories.tsx">
\`\`\`tsx
import type { Meta, StoryObj } from '@storybook/react';
import { PrimaryActionButton } from './PrimaryActionButton';

const meta = {
  title: 'Vapor Automation/PrimaryActionButton',
  component: PrimaryActionButton,
  args: { children: 'Deploy component' },
} satisfies Meta<typeof PrimaryActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
\`\`\`
</artifact>

<artifact type="test" filename="PrimaryActionButton.test.tsx">
\`\`\`tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PrimaryActionButton } from './PrimaryActionButton';

describe('PrimaryActionButton', () => {
  it('calls onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<PrimaryActionButton onClick={onClick}>Deploy</PrimaryActionButton>);

    await userEvent.click(screen.getByRole('button', { name: 'Deploy' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
\`\`\`
</artifact>

<notes type="a11y">
Accessible name is provided by children. Disabled state is delegated to Vapor Button.
</notes>

<notes type="token">
Uses @vapor-ui/core Button and colorPalette instead of raw color values.
</notes>
`;

const TOKEN_ARTIFACT = `<artifact type="component" filename="figmaToVaporTokenMap.ts">
\`\`\`ts
export const figmaToVaporTokenMap = {
  'color.primary.500': 'var(--vapor-color-background-primary-200)',
  'color.surface.default': 'var(--vapor-color-background-canvas-100)',
  'radius.control.md': 'var(--vapor-size-borderRadius-300)',
} as const;
\`\`\`
</artifact>

<artifact type="story" filename="TokenSyncPreview.stories.tsx">
\`\`\`tsx
export const TokenSyncPreview = () => (
  <dl>
    <dt>Figma variable</dt>
    <dd>color.primary.500</dd>
    <dt>Vapor token</dt>
    <dd>var(--vapor-color-background-primary-200)</dd>
  </dl>
);
\`\`\`
</artifact>

<artifact type="test" filename="figmaToVaporTokenMap.test.ts">
\`\`\`ts
import { describe, expect, it } from 'vitest';
import { figmaToVaporTokenMap } from './figmaToVaporTokenMap';

describe('figmaToVaporTokenMap', () => {
  it('maps primary color to a Vapor token', () => {
    expect(figmaToVaporTokenMap['color.primary.500']).toContain('--vapor-');
  });
});
\`\`\`
</artifact>

<notes type="a11y">
Token sync output is textual and should be rendered as a definition list or table.
</notes>

<notes type="token">
Maps Figma variable names to existing Vapor CSS custom properties.
</notes>
`;

const A11Y_ARTIFACT = `<artifact type="component" filename="AccessibleAttachButton.tsx">
\`\`\`tsx
import { IconButton, Tooltip } from '@vapor-ui/core';
import { AttachFileOutlineIcon } from '@vapor-ui/icons';

export function AccessibleAttachButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={<IconButton aria-label="참고 파일 첨부" onClick={onClick} />}
      >
        <AttachFileOutlineIcon size={18} />
      </Tooltip.Trigger>
      <Tooltip.Popup>토큰 JSON 또는 컴포넌트 파일 첨부</Tooltip.Popup>
    </Tooltip.Root>
  );
}
\`\`\`
</artifact>

<artifact type="story" filename="AccessibleAttachButton.stories.tsx">
\`\`\`tsx
export const KeyboardReachable = {
  parameters: { a11y: { disable: false } },
};
\`\`\`
</artifact>

<artifact type="test" filename="AccessibleAttachButton.test.tsx">
\`\`\`tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccessibleAttachButton } from './AccessibleAttachButton';

describe('AccessibleAttachButton', () => {
  it('has an accessible name', () => {
    render(<AccessibleAttachButton onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: '참고 파일 첨부' })).toBeEnabled();
  });
});
\`\`\`
</artifact>

<notes type="a11y">
Icon-only control has a visible tooltip and an aria-label for screen readers.
</notes>

<notes type="token">
No raw color, spacing, or radius values are introduced.
</notes>
`;

const BROKEN_ARTIFACT = `<artifact type="component" filename="BrokenRawColorButton.tsx">
\`\`\`tsx
export function BrokenRawColorButton({ children }: { children: string }) {
  return (
    <button type="button" style={{ color: "#ffffff", backgroundColor: "#2563eb" }}>
      {children}
    </button>
  );
}
\`\`\`
</artifact>

<artifact type="story" filename="BrokenRawColorButton.stories.tsx">
\`\`\`tsx
import type { Meta, StoryObj } from '@storybook/react';
import { BrokenRawColorButton } from './BrokenRawColorButton';

const meta = {
  title: 'Vapor Automation/BrokenRawColorButton',
  component: BrokenRawColorButton,
  args: { children: 'Broken action' },
} satisfies Meta<typeof BrokenRawColorButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
\`\`\`
</artifact>

<artifact type="test" filename="BrokenRawColorButton.test.tsx">
\`\`\`tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrokenRawColorButton } from './BrokenRawColorButton';

describe('BrokenRawColorButton', () => {
  it('renders the button', () => {
    render(<BrokenRawColorButton>Broken action</BrokenRawColorButton>);
    expect(screen.getByRole('button', { name: 'Broken action' })).toBeEnabled();
  });
});
\`\`\`
</artifact>

<notes type="a11y">
The native button has an accessible name.
</notes>

<notes type="token">
This artifact intentionally uses raw color values so the token gate fails.
</notes>
`;

const DEFAULT: AgentScript = {
  reply:
    '요청을 DS 자동화 작업으로 분해했습니다.\n\n' +
    '- Vapor primitive 를 직접 감싸는 React 컴포넌트 생성\n' +
    '- Storybook story 와 Vitest 테스트 동시 작성\n' +
    '- 접근성 이름, keyboard path, token 사용 여부 검증\n\n' +
    '오른쪽 artifact workspace 에 생성물을 정리했습니다.',
  draft: COMPONENT_ARTIFACT,
};

const ERROR: AgentScript = {
  reply: '생성 파이프라인을 실행하는 중에',
  error: '컴포넌트 자동화 요청 처리에 실패했습니다. 입력 파일과 mode 를 확인해 주세요.',
};

export function selectScript(input: string, mode: AgentMode = 'component'): AgentScript {
  const text = input.toLowerCase();
  if (/broken|raw|깨진/.test(text)) {
    return {
      reply: '의도적으로 깨진 raw color artifact 를 생성했습니다. Tests 탭에서 실패 게이트를 확인하세요.',
      draft: BROKEN_ARTIFACT,
    };
  }
  if (/에러|error|실패/.test(text)) return ERROR;
  if (mode === 'token-sync' || /figma|token|variable/.test(text)) {
    return {
      reply: 'Figma Variables 를 Vapor token 매핑으로 정규화했습니다.',
      draft: TOKEN_ARTIFACT,
    };
  }
  if (mode === 'a11y-audit' || /a11y|axe|접근성/.test(text)) {
    return {
      reply: '접근성 기준으로 컴포넌트 contract 를 재작성했습니다.',
      draft: A11Y_ARTIFACT,
    };
  }
  return DEFAULT;
}
