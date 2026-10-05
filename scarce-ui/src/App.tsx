import { CairnForm } from '@/components/CairnForm';
import type { Cairn } from '@models/cairn';

export default function App() {
  const sampleValues: Omit<Cairn, 'id'> = {
    filePath: 'src/example/sample.ts',
    lineRange: [11, 14],
    codeSnippet: 'line1\nline2\nline3\nline4',
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
