import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeGeneratedFiles } from './writeGeneratedFiles.ts';
import type {
  CodeArtifact,
  GeneratedArtifact,
} from '../../src/agent/responseParser.ts';

const SAFE_COMPONENT: CodeArtifact = {
  type: 'component',
  filename: 'PrimaryButton.tsx',
  language: 'tsx',
  content: 'export function PrimaryButton() { return null; }',
};
const SAFE_STORY: CodeArtifact = {
  type: 'story',
  filename: 'PrimaryButton.stories.tsx',
  language: 'tsx',
  content: 'export const Default = {};',
};
const SAFE_TEST: CodeArtifact = {
  type: 'test',
  filename: 'PrimaryButton.test.tsx',
  language: 'tsx',
  content: "import { it, expect } from 'vitest'; it('runs', () => expect(true).toBe(true));",
};

function makeArtifact(overrides: Partial<GeneratedArtifact>): GeneratedArtifact {
  return {
    metadata: {
      componentName: 'PrimaryButton',
      primaryExport: 'PrimaryButton',
      variants: [{ name: 'Default', props: {} }],
    },
    metadataValidation: { status: 'pass', messages: [], warnings: [], errors: [] },
    component: SAFE_COMPONENT,
    story: SAFE_STORY,
    test: SAFE_TEST,
    ...overrides,
  };
}

describe('writeGeneratedFiles defense in depth', () => {
  let workspace: string;
  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'vapor-generated-test-'));
  });
  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it.each([
    ['../../../etc/passwd.tsx', 'component'],
    ['/abs/path.tsx', 'component'],
    ['evil/sub.tsx', 'story'],
    ['evil\\sub.tsx', 'story'],
    ['PrimaryButton.exe', 'component'],
    ['', 'test'],
    ['..', 'test'],
  ] as const)(
    'unsafe %s (in %s) 는 throw 하고 workspace 외부에 파일을 쓰지 않는다',
    async (badName, kind) => {
      const overrides: Partial<GeneratedArtifact> = {};
      if (kind === 'component') overrides.component = { ...SAFE_COMPONENT, filename: badName };
      if (kind === 'story') overrides.story = { ...SAFE_STORY, filename: badName };
      if (kind === 'test') overrides.test = { ...SAFE_TEST, filename: badName };

      await expect(writeGeneratedFiles(workspace, makeArtifact(overrides))).rejects.toThrow(
        /Unsafe artifact filename/,
      );
    },
  );

  it('safe filename 만으로 구성된 artifact 는 정상적으로 src/ 안에만 쓴다', async () => {
    await writeGeneratedFiles(workspace, makeArtifact({}));

    const srcEntries = await readdir(join(workspace, 'src'));
    expect(srcEntries).toEqual(
      expect.arrayContaining([
        'PrimaryButton.tsx',
        'PrimaryButton.stories.tsx',
        'PrimaryButton.test.tsx',
        'GeneratedRuntimeRender.test.tsx',
        'GeneratedRuntimeAxe.test.tsx',
        'storybook-react.d.ts',
      ]),
    );
    // workspace 루트 직속에 LLM filename 이 쓰이지 않았음
    const rootEntries = await readdir(workspace);
    expect(rootEntries).not.toContain('PrimaryButton.tsx');
  });
});
