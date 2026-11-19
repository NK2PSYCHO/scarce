/**
 * @packageDocumentation
 * Root component of the Scarce sidebar webview.
 */

import { useEffect, useState } from 'react';
import type { Cairn } from '@models/cairn';
import type { CairnDraft } from '@models/messages';
import type { ScopeView } from '@models/scope';
import { Button } from '@/components/button';
import { CairnForm } from '@/components/cairnForm';
import { ScopeViewPanel } from '@/components/scopeView';
import { useExtensionMessages } from '@/hooks/useExtensionMessages';
import type { ExtensionClient } from '@/lib/extensionClient';

/**
 * Props for the {@link App} component.
 */
interface AppProps {
  /** Client used to send messages from the webview to the extension. */
  client: ExtensionClient;
}

/**
 * Root component of the sidebar webview. Holds the current Cairn draft, any
 * save error, and the latest view the extension pushed for the current scope.
 * While a draft is active it shows the add-Cairn form; otherwise it shows the
 * Cairn view, so closing the form lands on the scope as it is at that moment.
 * Also applies changeRootResult messages (updates root and path without
 * resetting the form, or shows the error).
 *
 * @param props - See {@link AppProps}.
 * @returns The add-Cairn form while a draft is active, otherwise the Cairn view.
 */
export default function App({ client }: AppProps) {
  const [draft, setDraft] = useState<CairnDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [view, setView] = useState<ScopeView | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Cairn | null>(null);

  useExtensionMessages((message) => {
    if (message.type === 'cairnsChanged') {
      setListError(null);
      setView(message.view);
      return;
    }
    if (message.type === 'listError') {
      setListError(message.error);
      return;
    }
    if (message.type === 'showForm') {
      setError(null);
      setEditing(null);
      setDraft(message.draft);
      setDraftKey((k) => k + 1);
      return;
    }
    if (message.type === 'changeRootResult') {
      if (message.ok) {
        setError(null);
        setDraft((d) =>
          d === null ? null : { ...d, rootPath: message.rootPath, filePath: message.filePath },
        );
      } else {
        setError(message.error);
      }
      return;
    }
    if (message.ok) {
      setError(null);
      setDraft(null);
      setEditing(null);
      return;
    }
    setError(message.error);
  });

  // Declared after useExtensionMessages so its listener is attached first.
  useEffect(() => {
    client.ready();
  }, [client]);

  if (editing !== null) {
    return (
      <div className="p-3 flex flex-col gap-3">
        {error !== null && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        <CairnForm
          key={editing.id}
          initialValues={{
            rootPath: editing.rootPath,
            filePath: editing.filePath,
            codeSnippet: editing.codeSnippet,
            lineRange: editing.lineRange,
            comment: editing.comment,
            severity: editing.severity,
          }}
          onSubmit={(values) => {
            setError(null);
            client.updateCairn(editing.id, {
              comment: values.comment,
              severity: values.severity,
            });
          }}
          onCancel={() => {
            client.cancel();
            setError(null);
            setEditing(null);
          }}
        />
      </div>
    );
  }

  if (draft === null) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {listError !== null && (
          <p role="alert" className="text-sm text-red-500">
            {listError}
          </p>
        )}
        {view !== null && (
          <ScopeViewPanel
            view={view}
            onNavigate={(cairn) => {
              client.navigateToCairn(cairn.id);
            }}
            renderActions={(cairn) => (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setError(null);
                  setEditing(cairn);
                }}
              >
                Edit
              </Button>
            )}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      {error !== null && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      <CairnForm
        key={draftKey}
        onChangeRoot={() => {
          client.changeRoot();
        }}
        initialValues={{ ...draft, comment: '', severity: 'normal' }}
        onSubmit={(values) => {
          setError(null);
          client.saveCairn(values);
        }}
        onCancel={() => {
          client.cancel();
          setError(null);
          setDraft(null);
        }}
      />
    </div>
  );
}
