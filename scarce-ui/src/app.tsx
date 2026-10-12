import { useState } from 'react';
import type { CairnDraft } from '@models/messages';
import { CairnForm } from '@/components/cairnForm';
import { useExtensionMessages } from '@/hooks/useExtensionMessages';
import type { ExtensionClient } from '@/lib/extensionClient';

interface AppProps {
  client: ExtensionClient;
}

export default function App({ client }: AppProps) {
  const [draft, setDraft] = useState<CairnDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useExtensionMessages((message) => {
    if (message.type === 'showForm') {
      setError(null);
      setDraft(message.draft);
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
