/**
 * @packageDocumentation
 * Root component of the Scarce sidebar webview.
 */

import { useState } from 'react';
import type { CairnDraft } from '@models/messages';
import { CairnForm } from '@/components/cairnForm';
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
 * Root component of the sidebar webview. Holds the current Cairn draft and any
 * save error, and talks to the extension through the client. Renders nothing
 * until the extension sends a draft.
 *
 * @param props - See {@link AppProps}.
 * @returns The add-Cairn form, or `null` while no draft is active.
 */
export default function App({ client }: AppProps) {
  const [draft, setDraft] = useState<CairnDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState(0);

  useExtensionMessages((message) => {
    if (message.type === 'showForm') {
      setError(null);
      setDraft(message.draft);
      setDraftKey((k) => k + 1);
      return;
    }
    if (message.ok) {
      setError(null);
      setDraft(null);
      return;
    }
    setError(message.error);
  });

  if (draft === null) {
    return null;
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
