import * as vscode from 'vscode';
import { SidebarProvider, diffProvider } from './panels/SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Vedix Agent extension is now active!');

  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('vedix.chatView', sidebarProvider)
  );

  const startCommand = vscode.commands.registerCommand('vedix.start', () => {
    vscode.commands.executeCommand('vedix.chatView.focus');
  });

  const providerRegistration = vscode.workspace.registerTextDocumentContentProvider('vedix-diff', diffProvider);

  context.subscriptions.push(startCommand, providerRegistration);
}

export function deactivate() {}
