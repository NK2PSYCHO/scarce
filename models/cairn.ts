export type CairnSeverity = 'normal' | 'high' | 'critical';

export interface Cairn {
  id: string;
  filePath: string;
  codeSnippet: string;
  lineRange: [number, number];
  comment: string;
  severity: CairnSeverity;
}
