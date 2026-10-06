import { CairnForm } from '@/components/CairnForm';
import type { Cairn } from '@models/cairn';

export default function App() {
  const sampleValues: Omit<Cairn, 'id'> = {
    filePath: 'src/example/sample.ts',
    lineRange: [11, 30],
    codeSnippet: Array.from({ length: 20 }, (_, i) => `line${(i + 1).toString()}`).join('\n'),
    comment: '',
    severity: 'normal',
  };

  return (
    <div className="p-3">
      <CairnForm
        initialValues={sampleValues}
        onSubmit={(values) => console.log(values)}
        onCancel={() => undefined}
      />
    </div>
  );
}
