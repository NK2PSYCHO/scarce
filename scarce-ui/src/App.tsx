import { useState } from 'react';
import type { CairnDraft } from '@models/messages';
import { CairnForm } from '@/components/CairnForm';
import { useExtensionMessages } from '@/hooks/useExtensionMessages';

export default function App() {
  const [draft, setDraft] = useState<CairnDraft | null>(null);

  useExtensionMessages((message) => {
    if (message.type === 'showForm') {
      setDraft(message.draft);
    }
  });

  if (draft === null) {
    return null;
  }

  return (
    <div className="p-3">
      <CairnForm
        initialValues={{ ...draft, comment: '', severity: 'normal' }}
        onSubmit={(values) => {
          console.log(values);
        }}
        onCancel={() => undefined}
      />
    </div>
  );
}
