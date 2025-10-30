import * as vscode from "vscode";

export class DiagnosticManager implements vscode.Disposable {
  protected collections: Record<string, vscode.DiagnosticCollection> = {};
  protected disposables: vscode.Disposable[] = [];

  dispose() {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  /**
   * Get a diagnostic collection for the document URI
   */
  getCollection(uri: vscode.Uri) {
    const uriString = uri.toString();

    this.collections[uriString] ??=
      vscode.languages.createDiagnosticCollection("alint-pro");

    this.disposables.push(this.collections[uriString]);

    return this.collections[uriString];
  }
}
