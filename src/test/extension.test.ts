import * as assert from 'assert';
import * as vscode from 'vscode';

interface ScarceManifest {
  contributes?: {
    commands?: { command: string; title: string }[];
    menus?: Record<string, { command: string; when?: string }[]>;
  };
}

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Add as Cairn activates the extension when invoked', async () => {
    // Must run first so the extension is activated via the command, not the existing menu invocation.

    const ext = vscode.extensions.getExtension('nk2psycho.scarce');
    assert.ok(ext, 'Extension nk2psycho.scarce not found');
    assert.strictEqual(ext?.isActive, false);

    await vscode.commands.executeCommand('scarce.addAsCairn');

    assert.strictEqual(ext?.isActive, true);
  });

  test('Add as Cairn is declared and menu-only', () => {
    const ext = vscode.extensions.getExtension('nk2psycho.scarce');
    assert.ok(ext, 'Extension nk2psycho.scarce not found');

    const manifest = ext.packageJSON as ScarceManifest;

    const commands = manifest.contributes?.commands ?? [];
    assert.ok(
      commands.some(
        (c) =>
          c.command === 'scarce.addAsCairn' && typeof c.title === 'string' && c.title.length > 0,
      ),
      'contributes.commands does not declare scarce.addAsCairn with a non-empty title',
    );

    const commandPalette = manifest.contributes?.menus?.commandPalette ?? [];
    assert.ok(
      commandPalette.some((m) => m.command === 'scarce.addAsCairn' && m.when === 'false'),
      'contributes.menus.commandPalette does not declare scarce.addAsCairn with when === false',
    );

    const editorContext = manifest.contributes?.menus?.['editor/context'] ?? [];
    assert.ok(
      editorContext.some((m) => m.command === 'scarce.addAsCairn'),
      'contributes.menus["editor/context"] does not declare scarce.addAsCairn',
    );
  });

  test('Add as Cairn command is registered', async () => {
    // Ensure the extension is activated
    const ext = vscode.extensions.getExtension('nk2psycho.scarce');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // Fetch all available commands in the extension host
    const commands = await vscode.commands.getCommands(true);

    // Assert that your command is successfully registered
    assert.ok(
      commands.includes('scarce.addAsCairn'),
      'Command scarce.addAsCairn is not registered in the command registry',
    );
  });
});
