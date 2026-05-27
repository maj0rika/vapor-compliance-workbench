export type FileSource = {
  path: string;
  content: string;
};

export type FileSignals = {
  /** Combined source text from all scanned .ts/.tsx files */
  combinedSource: string;
  /** Per-file content for location-level evidence reporting */
  fileSources: FileSource[];
  /** List of scanned file paths (relative) */
  scannedFiles: string[];
  /** README.md content, or undefined if not found */
  readmeContent: string | undefined;
  /** Whether docs/vapor-compliance.md exists */
  vaporComplianceDocExists: boolean;
  /** tsconfig.app.json raw text, or undefined if not found */
  tsconfigText: string | undefined;
  /** package.json scripts keys, or undefined if not found */
  scriptNames: string[] | undefined;
};

export type ScanScope = 'all' | 'governed';

export type CollectOptions = {
  /** 'all' = 전체 src/ 감사, 'governed' = 강제 경로만 (verify:compliance) */
  scope?: ScanScope;
};
