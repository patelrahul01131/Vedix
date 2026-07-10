import * as vscode from 'vscode';
import { SidebarProvider, diffProvider } from './panels/SidebarProvider';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Vedix Agent extension is now active!');

  const config = vscode.workspace.getConfiguration('vedix');
  let apiKey = config.get<string>('apiKey');

  if (!apiKey) {
    const action = await vscode.window.showWarningMessage(
      'Welcome to Vedix! Please provide your API Key to start.',
      'Enter API Key'
    );

    if (action === 'Enter API Key') {
      const inputKey = await vscode.window.showInputBox({
        prompt: 'Enter your Vedix API Key:',
        password: true,
        ignoreFocusOut: true,
      });

      if (inputKey) {
        // Validate with backend
        try {
          const res = await fetch('http://localhost:3001/api/keys/verify', {
            headers: { Authorization: `Bearer ${inputKey}` }
          });
          
          if (res.ok) {
            await config.update('apiKey', inputKey, vscode.ConfigurationTarget.Global);
            apiKey = inputKey;
            vscode.window.showInformationMessage('API Key validated and saved successfully.');
          } else {
            vscode.window.showErrorMessage('Invalid API Key. Please try again.');
          }
        } catch (e: any) {
          vscode.window.showErrorMessage(`Could not connect to backend to verify API key: ${e.message}`);
        }
      }
    }
  }

  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('vedix.chatView', sidebarProvider)
  );

  const startCommand = vscode.commands.registerCommand('vedix.start', () => {
    vscode.commands.executeCommand('vedix.chatView.focus');
  });

  const logoutCommand = vscode.commands.registerCommand('vedix.logout', async () => {
    await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage('Vedix API Key has been removed. Please reload the window or run the start command to authenticate again.');
  });

  const settingsCommand = vscode.commands.registerCommand('vedix.settings', async () => {
    const selection = await vscode.window.showQuickPick(['Logout (Clear API Key)'], {
      placeHolder: 'Settings'
    });
    if (selection === 'Logout (Clear API Key)') {
      vscode.commands.executeCommand('vedix.logout');
    }
  });

  const providerRegistration = vscode.workspace.registerTextDocumentContentProvider('vedix-diff', diffProvider);

  context.subscriptions.push(startCommand, logoutCommand, settingsCommand, providerRegistration);
}

export function deactivate() {}
