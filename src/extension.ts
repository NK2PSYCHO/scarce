import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      new SidebarProvider(context.extensionUri),
    ),
    vscode.commands.registerCommand('scarce.addAsCairn', () => {
      // TODO: implement Cairn creation
      console.log('scarce.addAsCairn invoked');
    }),
  );
}
