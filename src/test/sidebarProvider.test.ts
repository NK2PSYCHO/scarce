/**
 * @packageDocumentation
 * Extension Host tests for `SidebarProvider.showForm`: the draft is queued until the
 * webview app posts `ready`, delivered once, and re-queued when the webview is hidden
 * or disposed.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import { SidebarProvider } from '../sidebarProvider';
import type { CairnStore } from '../store/cairnStore';
import type { CairnDraft, WebviewToExtensionMessage } from '../../models/messages';

const DRAFT: CairnDraft = {
  rootPath: '/repo',
  filePath: 'a.ts',
  codeSnippet: 'const a = 1;',
  lineRange: [2, 2],
};

interface FakeView {
  view: vscode.WebviewView;
  posted: unknown[];
  receive(message: WebviewToExtensionMessage): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

function fakeView(): FakeView {
  const posted: unknown[] = [];
  let onMessage: (message: WebviewToExtensionMessage) => void = () => undefined;
  let onVisibility: () => void = () => undefined;
  let onDispose: () => void = () => undefined;
  const state = { visible: true };
  const view = {
    get visible() {
      return state.visible;
    },
    webview: {
      options: {},
      html: '',
      cspSource: 'test',
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: unknown) => {
        posted.push(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (cb: (message: WebviewToExtensionMessage) => void) => {
        onMessage = cb;
        return { dispose: () => undefined };
      },
    },
    onDidChangeVisibility: (cb: () => void) => {
      onVisibility = cb;
      return { dispose: () => undefined };
    },
    onDidDispose: (cb: () => void) => {
      onDispose = cb;
      return { dispose: () => undefined };
    },
  };
  return {
    view: view as unknown as vscode.WebviewView,
    posted,
    receive: (message) => onMessage(message),
    setVisible: (visible) => {
      state.visible = visible;
      onVisibility();
    },
    dispose: () => onDispose(),
  };
}

function setup(): { provider: SidebarProvider; fake: FakeView } {
  const provider = new SidebarProvider(vscode.Uri.file('/ext'), {} as unknown as CairnStore);
  const fake = fakeView();
  provider.resolveWebviewView(fake.view);
  return { provider, fake };
}

suite('SidebarProvider.showForm', () => {
  test('queues the draft until the webview posts ready, then delivers it', async () => {
    const { provider, fake } = setup();
    await provider.showForm(DRAFT);
    assert.deepStrictEqual(fake.posted, []);
    fake.receive({ type: 'ready' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(fake.posted, [{ type: 'showForm', draft: DRAFT }]);
  });

  test('posts immediately when the webview is already ready', async () => {
    const { provider, fake } = setup();
    fake.receive({ type: 'ready' });
    await provider.showForm(DRAFT);
    assert.deepStrictEqual(fake.posted, [{ type: 'showForm', draft: DRAFT }]);
  });

  test('a repeated ready does not resend a delivered draft', async () => {
    const { provider, fake } = setup();
    await provider.showForm(DRAFT);
    fake.receive({ type: 'ready' });
    fake.receive({ type: 'ready' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.strictEqual(fake.posted.length, 1);
  });

  test('does not post after the webview is disposed', async () => {
    const { provider, fake } = setup();
    fake.receive({ type: 'ready' });
    fake.dispose();
    await provider.showForm(DRAFT);
    assert.deepStrictEqual(fake.posted, []);
  });
});
