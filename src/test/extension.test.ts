import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

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
            'Command scarce.addAsCairn is not registered in the command registry'
        );
    });
});