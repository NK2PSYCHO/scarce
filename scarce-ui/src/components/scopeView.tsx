/**
 * @packageDocumentation
 * Renders the sidebar's Cairn view for the current scope: global (grouped by
 * repo), repo (grouped by file and severity) or file (This file / Repo tabs).
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Cairn, CairnSeverity } from '@models/cairn';
import type { FileGroup, FileScopeView, RepoGroup, SeverityGroup } from '@models/scope';
import type { ScopeView } from '@models/scope';
import { CairnList } from '@/components/cairnList';
import { CollapsibleSection } from '@/components/collapsibleSection';
import { cn } from '@/lib/utils';

/** Per-card actions (Edit now; Delete and Resolve later), shared by every list in the view. */
const ActionsContext = createContext<((cairn: Cairn) => ReactNode) | undefined>(undefined);

/**
 * Props for the ScopeViewPanel component.
 */
export interface ScopeViewPanelProps {
  /**
   * The view built by the extension for the current scope.
   */
  view: ScopeView;

  /**
   * Callback invoked when the user clicks a Cairn to jump to it.
   */
  onNavigate: (cairn: Cairn) => void;

  /**
   * Optional buttons rendered on every Cairn card.
   */
  renderActions?: (cairn: Cairn) => ReactNode;
}

const SEVERITY_LABEL: Record<CairnSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
};

/**
 * Short hint shown in place of an empty list.
 *
 * @param props - The hint text as children.
 * @returns The rendered hint.
 */
function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * One expanded section per severity, each with its Cairns.
 *
 * @param props - Severity groups and the navigate callback.
 * @returns The rendered sections.
 */
function SeveritySections({
  groups,
  onNavigate,
}: {
  groups: SeverityGroup[];
  onNavigate: (cairn: Cairn) => void;
}) {
  const renderActions = useContext(ActionsContext);
  return (
    <>
      {groups.map((group) => (
        <CollapsibleSection
          key={group.severity}
          title={SEVERITY_LABEL[group.severity]}
          count={group.cairns.length}
        >
          <CairnList cairns={group.cairns} onNavigate={onNavigate} renderActions={renderActions} />
        </CollapsibleSection>
      ))}
    </>
  );
}

/**
 * One expanded section per file, each split by severity.
 *
 * @param props - File groups and the navigate callback.
 * @returns The rendered sections, or an empty hint.
 */
function FileSections({
  files,
  onNavigate,
}: {
  files: FileGroup[];
  onNavigate: (cairn: Cairn) => void;
}) {
  if (files.length === 0) {
    return <EmptyHint>No cairns in this repo yet.</EmptyHint>;
  }
  return (
    <>
      {files.map((file) => (
        <CollapsibleSection
          key={file.absolutePath}
          title={file.filePath}
          tooltip={file.absolutePath}
          count={file.severities.reduce((sum, group) => sum + group.cairns.length, 0)}
        >
          <SeveritySections groups={file.severities} onNavigate={onNavigate} />
        </CollapsibleSection>
      ))}
    </>
  );
}

/**
 * One collapsed section per repo, each a flat list.
 *
 * @param props - Repo groups and the navigate callback.
 * @returns The rendered sections, or an empty hint.
 */
function RepoSections({
  groups,
  onNavigate,
}: {
  groups: RepoGroup[];
  onNavigate: (cairn: Cairn) => void;
}) {
  const renderActions = useContext(ActionsContext);
  if (groups.length === 0) {
    return <EmptyHint>No cairns yet. Select some code and run &quot;Add as Cairn&quot;.</EmptyHint>;
  }
  return (
    <>
      {groups.map((group) => (
        <CollapsibleSection
          key={group.rootPath}
          title={group.label}
          tooltip={group.rootPath}
          count={group.cairns.length}
          defaultOpen={false}
        >
          <CairnList cairns={group.cairns} onNavigate={onNavigate} renderActions={renderActions} />
        </CollapsibleSection>
      ))}
    </>
  );
}

type FileTab = 'file' | 'repo';

const TABS: { id: FileTab; label: string }[] = [
  { id: 'file', label: 'This file' },
  { id: 'repo', label: 'Repo' },
];

/**
 * The "This file" and "Repo" tabs. "This file" is the default; the selected
 * tab is kept only while this view stays mounted.
 *
 * @param props - The file view and the navigate callback.
 * @returns The tab bar and the selected tab's content.
 */
function FileScope({
  view,
  onNavigate,
}: {
  view: FileScopeView;
  onNavigate: (cairn: Cairn) => void;
}) {
  const [tab, setTab] = useState<FileTab>('file');

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Cairn scope" className="flex gap-1 border-b border-border">
        {TABS.map((item) => (
          <button
            key={item.id}
            id={`scarce-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls="scarce-tabpanel"
            onClick={() => {
              setTab(item.id);
            }}
            className={cn(
              'cursor-pointer border-b-2 px-2 py-1 text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none',
              tab === item.id
                ? 'border-ring font-medium'
                : 'border-transparent text-muted-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id="scarce-tabpanel"
        role="tabpanel"
        aria-labelledby={`scarce-tab-${tab}`}
        className="flex flex-col gap-2"
      >
        {tab === 'repo' ? (
          <FileSections files={view.repo} onNavigate={onNavigate} />
        ) : view.file.length === 0 ? (
          <EmptyHint>No open cairns in this file.</EmptyHint>
        ) : (
          <SeveritySections groups={view.file} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}

/**
 * Renders the view for whichever scope the extension reported.
 *
 * @param props - See {@link ScopeViewPanelProps}.
 * @returns The global, repo or file view.
 */
function ScopeViewBody({ view, onNavigate }: Omit<ScopeViewPanelProps, 'renderActions'>) {
  switch (view.kind) {
    case 'global':
      return (
        <div className="flex flex-col gap-2">
          <RepoSections groups={view.groups} onNavigate={onNavigate} />
        </div>
      );
    case 'repo':
      return (
        <div className="flex flex-col gap-2">
          <FileSections files={view.files} onNavigate={onNavigate} />
        </div>
      );
    case 'file':
      return <FileScope view={view} onNavigate={onNavigate} />;
  }
}

/**
 * Renders the Cairn view for the current scope and makes `renderActions` available
 * to every Cairn list inside it.
 *
 * @param props - See {@link ScopeViewPanelProps}.
 * @returns The global, repo or file view.
 */
export function ScopeViewPanel({ view, onNavigate, renderActions }: ScopeViewPanelProps) {
  return (
    <ActionsContext.Provider value={renderActions}>
      <ScopeViewBody view={view} onNavigate={onNavigate} />
    </ActionsContext.Provider>
  );
}
