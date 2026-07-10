import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class VedixDiffProvider implements vscode.TextDocumentContentProvider {
  public contents = new Map<string, string>();
  private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  public onDidChange = this.onDidChangeEmitter.event;

  public update(uri: vscode.Uri) {
     this.onDidChangeEmitter.fire(uri);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.path) || '';
  }
}
export const diffProvider = new VedixDiffProvider();

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist')],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    this._setWebviewMessageListener(webviewView.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist', 'assets', 'index.js'));
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist', 'assets', 'index.css'));
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vedix Agent</title>
        <link rel="stylesheet" href="${cssUri}">
      </head>
      <script>
        window.WORKSPACE_ROOT = ${JSON.stringify(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '')};
        window.API_KEY = ${JSON.stringify(vscode.workspace.getConfiguration('vedix').get('apiKey') || '')};
      </script>
      <body>
        <div id="root"></div>
        <script type="module" src="${jsUri}"></script>
      </body>
      </html>
    `;
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {
          case 'hello':
            vscode.window.showInformationMessage(text);
            return;
          case 'logout':
            (async () => {
              await vscode.workspace.getConfiguration('vedix').update('apiKey', undefined, vscode.ConfigurationTarget.Global);
              webview.postMessage({ command: 'apiKeyUpdated', payload: '' });
              vscode.window.showInformationMessage('Vedix API Key has been removed.');
            })();
            return;
          case 'saveApiKey':
            (async () => {
              try {
                const res = await fetch('http://localhost:3001/api/keys/verify', {
                  headers: { Authorization: `Bearer ${text}` }
                });
                if (res.ok) {
                  await vscode.workspace.getConfiguration('vedix').update('apiKey', text, vscode.ConfigurationTarget.Global);
                  webview.postMessage({ command: 'apiKeyUpdated', payload: text });
                  vscode.window.showInformationMessage('API Key validated and saved successfully.');
                } else {
                  vscode.window.showErrorMessage('Invalid API Key. The key was not saved.');
                }
              } catch (e: any) {
                vscode.window.showErrorMessage(`Could not connect to backend to verify API key: ${e.message}`);
              }
            })();
            return;
          case 'getWorkspaceFiles':
            vscode.workspace.findFiles('**/*.*', '**/node_modules/**').then(files => {
              const filePaths = files
                .map(f => vscode.workspace.asRelativePath(f))
                .filter(p => !p.startsWith('.git/') && !p.startsWith('dist/') && !p.startsWith('out/'))
                .slice(0, 1000);
              webview.postMessage({ command: 'workspaceFiles', payload: filePaths });
            });
            return;
          case 'openDiff':
            try {
              const { toolName, toolArgs } = message;
              const filePath = toolArgs?.path || toolArgs?.filePath || toolArgs?.file_path || toolArgs?.filename;
              if (!filePath) return;
              
              const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
              const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
              const originalUri = vscode.Uri.file(absolutePath);
              
              let leftUri = originalUri;
              let currentContent = '';
              
              if (!fs.existsSync(absolutePath)) {
                 diffProvider.contents.set('empty', '');
                 leftUri = vscode.Uri.parse('vedix-diff:empty');
              } else {
                 currentContent = fs.readFileSync(absolutePath, 'utf8');
              }

              let proposedContent = '';
               if (toolName === 'edit_file' || toolName === 'update_file') {
                 if (toolArgs.replacements && Array.isArray(toolArgs.replacements)) {
                    let lines = currentContent.split(/\r?\n/);
                    const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
                    
                    // Pre-flight snap line numbers
                    for (const rep of toolArgs.replacements) {
                        const expectedNormalized = normalize(rep.expectedContent || '');
                        if (!expectedNormalized) continue;
                        
                        const targetBlock = lines.slice(Math.max(0, rep.startLine - 1), rep.endLine).join('\n');
                        if (normalize(targetBlock) !== expectedNormalized) {
                            const expectedLinesCount = rep.expectedContent.split(/\r?\n/).length;
                            let bestMatch = null;
                            let minDistance = Infinity;
                            
                            for (let i = 0; i < lines.length - expectedLinesCount + 1; i++) {
                                const block = lines.slice(i, i + expectedLinesCount).join('\n');
                                if (normalize(block) === expectedNormalized) {
                                    const distance = Math.abs((i + 1) - rep.startLine);
                                    if (distance < minDistance) {
                                        minDistance = distance;
                                        bestMatch = { startLine: i + 1, endLine: i + expectedLinesCount };
                                    }
                                }
                            }
                            if (bestMatch) {
                                rep.startLine = bestMatch.startLine;
                                rep.endLine = bestMatch.endLine;
                            }
                        }
                    }

                    const sortedReplacements = [...toolArgs.replacements].sort((a, b) => b.startLine - a.startLine);
                    for (const rep of sortedReplacements) {
                        const startLine = Math.max(1, rep.startLine);
                        const endLine = Math.min(lines.length, rep.endLine);
                        const beforeLines = lines.slice(0, startLine - 1);
                        const afterLines = lines.slice(endLine);
                        const replacementLines = (rep.replacementContent || '').split(/\r?\n/);
                        lines = [...beforeLines, ...replacementLines, ...afterLines];
                    }
                    proposedContent = lines.join('\n');
                 } else if (toolArgs.startLine !== undefined && toolArgs.endLine !== undefined && toolArgs.replacementContent !== undefined) {
                    const lines = currentContent.split(/\r?\n/);
                    // Add safe slice checks
                    const startLine = Math.max(1, toolArgs.startLine);
                    const endLine = Math.min(lines.length, toolArgs.endLine);
                    const beforeLines = lines.slice(0, startLine - 1);
                    const afterLines = lines.slice(endLine);
                    proposedContent = [...beforeLines, toolArgs.replacementContent, ...afterLines].join('\n');
                 } else if (toolArgs.targetContent && toolArgs.replacementContent !== undefined) {
                    const normalizedCurrent = currentContent.replace(/\r\n/g, '\n');
                    const normalizedTarget = toolArgs.targetContent.replace(/\r\n/g, '\n');
                    const normalizedReplacement = toolArgs.replacementContent.replace(/\r\n/g, '\n');
                    proposedContent = normalizedCurrent.replace(normalizedTarget, normalizedReplacement);
                 } else {
                    proposedContent = currentContent; // fallback
                 }
              } else if (toolName === 'write_file' || toolName === 'create_file') {
                 proposedContent = toolArgs.content || '';
              } else {
                 return; // Unsupported tool for diff
              }

              const proposedPath = path.basename(absolutePath) + '-proposed';
              const proposedUri = vscode.Uri.parse(`vedix-diff:${proposedPath}`);
              diffProvider.contents.set(proposedUri.path, proposedContent);
              diffProvider.update(proposedUri);
              
              if (proposedContent === currentContent) {
                  vscode.window.showInformationMessage(`No changes detected! The agent's proposed edit resulted in the exact same code, or it failed to find the target code to replace.`);
              }
              
              vscode.commands.executeCommand('vscode.diff', leftUri, proposedUri, `Proposed: ${path.basename(absolutePath)}`);
            } catch (e) {
              console.error('Failed to open diff', e);
            }
            return;
            
          case 'closeDiff':
            try {
              const { filePath } = message;
              if (!filePath) return;
              
              const filename = path.basename(filePath);
              for (const tabGroup of vscode.window.tabGroups.all) {
                for (const tab of tabGroup.tabs) {
                  if (tab.input instanceof vscode.TabInputTextDiff) {
                     const modifiedUri = tab.input.modified;
                     if (modifiedUri.scheme === 'vedix-diff' && modifiedUri.path.includes(filename)) {
                        vscode.window.tabGroups.close(tab);
                     }
                  }
                }
              }
            } catch (e) {
              console.error('Failed to close diff', e);
            }
            return;
            
          case 'openFile':
            try {
              const { filePath } = message;
              if (!filePath) return;
              const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
              const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
              
              if (fs.existsSync(absolutePath)) {
                vscode.workspace.openTextDocument(absolutePath).then(doc => {
                  vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One });
                });
                // If diff viewer is open in active editor, this will open the file instead.
              }
            } catch (e) {
              console.error('Failed to open file', e);
            }
            return;
        }
      }
    );
  }
}
