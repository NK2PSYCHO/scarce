import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('scarce.addAsCairn', () => {
      // TODO: implement Cairn creation
      console.log('scarce.addAsCairn invoked');
    }),
  );
}
