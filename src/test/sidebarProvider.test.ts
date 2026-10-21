/**
 * @packageDocumentation
 * Extension Host tests for `SidebarProvider.showForm`: the draft is queued until the
 * webview app posts `ready`, delivered once, and re-queued when the webview is hidden
 * or disposed.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import { SidebarProvider } from '../sidebarProvider';
import { resolveRootChange } from '../changeRoot';
import type { CairnStore } from '../store/cairnStore';
import type { RootMemory } from '../rootMemory';
import type { CairnDraft, WebviewToExtensionMessage } from '../../models/messages';

const DRAFT: CairnDraft = {
  rootPath: '/repo',
  filePath: 'a.ts',
  codeSnippet: 'const a = 1;',
  lineRange: [2, 2],
};

const SRC_DRAFT: CairnDraft = {
  rootPath: '/repo/src',
  filePath: 'a.ts',
  codeSnippet: 'const a = 1;',
  lineRange: [2, 2],
};
const SRC_FILE = '/repo/src/a.ts';
const FILE = '/repo/a.ts';

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

type OpenDialog = typeof vscode.window.showOpenDialog;

suite('SidebarProvider changeRoot', () => {
  const win = vscode.window as unknown as { showOpenDialog: OpenDialog };
  const original = win.showOpenDialog;
  let dialogCalls: vscode.OpenDialogOptions[] = [];
  let nextPick: vscode.Uri[] | undefined;

  function installDialogStub(): void {
    dialogCalls = [];
    nextPick = undefined;
    win.showOpenDialog = (options?: vscode.OpenDialogOptions) => {
      dialogCalls.push(options ?? {});
      return Promise.resolve(nextPick);
    };
  }

  async function readyForm(): Promise<FakeView> {
    installDialogStub();
    const { provider, fake } = setup();
    fake.receive({ type: 'ready' });
    await provider.showForm(SRC_DRAFT, SRC_FILE);
    fake.posted.length = 0;
    return fake;
  }

  async function requestChangeRoot(fake: FakeView): Promise<void> {
    fake.receive({ type: 'changeRoot' });
    await new Promise((resolve) => setImmediate(resolve));
  }

  teardown(() => {
    win.showOpenDialog = original;
  });

  test('changeRoot opens the folder picker at the current root', async () => {
    const fake = await readyForm();
    await requestChangeRoot(fake);
    assert.strictEqual(dialogCalls.length, 1);
    assert.strictEqual(dialogCalls[0]?.canSelectFolders, true);
    assert.strictEqual(dialogCalls[0]?.canSelectFiles, false);
    assert.strictEqual(dialogCalls[0]?.canSelectMany, false);
    assert.strictEqual(dialogCalls[0]?.defaultUri?.fsPath, '/repo/src');
  });

  test('changeRoot posts the new root and relative path when the file is inside it', async () => {
    const fake = await readyForm();
    nextPick = [vscode.Uri.file('/repo')];
    await requestChangeRoot(fake);
    assert.deepStrictEqual(fake.posted, [
      { type: 'changeRootResult', ok: true, rootPath: '/repo', filePath: 'src/a.ts' },
    ]);
  });

  test('changeRoot posts an error when the folder does not contain the file', async () => {
    const fake = await readyForm();
    nextPick = [vscode.Uri.file('/elsewhere')];
    await requestChangeRoot(fake);
    assert.deepStrictEqual(fake.posted, [resolveRootChange('/elsewhere', SRC_FILE)]);
    const posted = fake.posted[0] as { ok?: boolean };
    assert.strictEqual(posted.ok, false);
  });

  test('a cancelled picker posts nothing', async () => {
    const fake = await readyForm();
    await requestChangeRoot(fake);
    assert.strictEqual(dialogCalls.length, 1);
    assert.deepStrictEqual(fake.posted, []);
  });

  test('an accepted root becomes the picker default next time', async () => {
    const fake = await readyForm();
    nextPick = [vscode.Uri.file('/repo')];
    await requestChangeRoot(fake);
    await requestChangeRoot(fake);
    assert.strictEqual(dialogCalls[1]?.defaultUri?.fsPath, '/repo');
  });

  test('a rejected root keeps the previous picker default', async () => {
    const fake = await readyForm();
    nextPick = [vscode.Uri.file('/elsewhere')];
    await requestChangeRoot(fake);
    await requestChangeRoot(fake);
    assert.strictEqual(dialogCalls[1]?.defaultUri?.fsPath, '/repo/src');
  });

  test('changeRoot before any form is shown does nothing', async () => {
    installDialogStub();
    const { fake } = setup();
    fake.receive({ type: 'ready' });
    await requestChangeRoot(fake);
    assert.strictEqual(dialogCalls.length, 0);
    assert.deepStrictEqual(fake.posted, []);
  });
});

suite('SidebarProvider.showForm', () => {
  test('queues the draft until the webview posts ready, then delivers it', async () => {
    const { provider, fake } = setup();
    await provider.showForm(DRAFT, FILE);
    assert.deepStrictEqual(fake.posted, []);
    fake.receive({ type: 'ready' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(fake.posted, [{ type: 'showForm', draft: DRAFT }]);
  });

  test('posts immediately when the webview is already ready', async () => {
    const { provider, fake } = setup();
    fake.receive({ type: 'ready' });
    await provider.showForm(DRAFT, FILE);
    assert.deepStrictEqual(fake.posted, [{ type: 'showForm', draft: DRAFT }]);
  });

  test('a repeated ready does not resend a delivered draft', async () => {
    const { provider, fake } = setup();
    await provider.showForm(DRAFT, FILE);
    fake.receive({ type: 'ready' });
    fake.receive({ type: 'ready' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.strictEqual(fake.posted.length, 1);
  });

  test('does not post after the webview is disposed', async () => {
    const { provider, fake } = setup();
    fake.receive({ type: 'ready' });
    fake.dispose();
    await provider.showForm(DRAFT, FILE);
    assert.deepStrictEqual(fake.posted, []);
  });
});

suite('SidebarProvider root memory', () => {
  const win = vscode.window as unknown as { showOpenDialog: OpenDialog };
  const original = win.showOpenDialog;
  let sets: [string, string][] = [];
  const memory: RootMemory = {
    get: () => undefined,
    set: (folder, root) => {
      sets.push([folder, root]);
      return Promise.resolve();
    },
  };

  async function changeRootWith(pick: vscode.Uri[] | undefined): Promise<void> {
    sets = [];
    win.showOpenDialog = () => Promise.resolve(pick);
    const provider = new SidebarProvider(
      vscode.Uri.file('/ext'),
      {} as unknown as CairnStore,
      memory,
    );
    const fake = fakeView();
    provider.resolveWebviewView(fake.view);
    fake.receive({ type: 'ready' });
    await provider.showForm(SRC_DRAFT, SRC_FILE, '/repo/src');
    fake.receive({ type: 'changeRoot' });
    await new Promise((resolve) => setImmediate(resolve));
  }

  teardown(() => {
    win.showOpenDialog = original;
  });

  test('saves the picked root for the workspace folder after a successful change', async () => {
    await changeRootWith([vscode.Uri.file('/repo')]);
    assert.deepStrictEqual(sets, [['/repo/src', '/repo']]);
  });

  test('does not save when the picked folder does not contain the file', async () => {
    await changeRootWith([vscode.Uri.file('/elsewhere')]);
    assert.deepStrictEqual(sets, []);
  });

  test('does not save when the picker is cancelled', async () => {
    await changeRootWith(undefined);
    assert.deepStrictEqual(sets, []);
  });
});
