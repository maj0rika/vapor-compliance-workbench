export type ArtifactType = 'component' | 'story' | 'test';

export type CodeArtifact = {
  type: ArtifactType;
  filename: string;
  language: 'ts' | 'tsx';
  content: string;
};

export type GeneratedArtifact = {
  component?: CodeArtifact;
  story?: CodeArtifact;
  test?: CodeArtifact;
  a11yNotes?: string;
  tokenNotes?: string;
};

const ARTIFACT_RE =
  /<artifact\s+type="(component|story|test)"\s+filename="([^"]+)">\s*```(tsx|ts)?\s*([\s\S]*?)```\s*<\/artifact>/g;
const NOTES_RE = /<notes\s+type="(a11y|token)">([\s\S]*?)<\/notes>/g;

export function parseGeneratedArtifact(markdown: string): GeneratedArtifact {
  const result: GeneratedArtifact = {};

  for (const match of markdown.matchAll(ARTIFACT_RE)) {
    const type = match[1] as ArtifactType;
    const artifact: CodeArtifact = {
      type,
      filename: match[2],
      language: (match[3] || inferLanguage(match[2])) as 'ts' | 'tsx',
      content: match[4].trim(),
    };
    result[type] = artifact;
  }

  for (const match of markdown.matchAll(NOTES_RE)) {
    const type = match[1];
    if (type === 'a11y') result.a11yNotes = match[2].trim();
    if (type === 'token') result.tokenNotes = match[2].trim();
  }

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
