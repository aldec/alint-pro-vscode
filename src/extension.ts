import * as vscode from "vscode";
import { AlintProTaskProvider } from "./alintProTaskProvider";
import { lintFile } from "./lintFile";
import { DiagnosticManager } from "./diagnosticManager";

export function activate(context: vscode.ExtensionContext) {
  const diagnosticManager = new DiagnosticManager();
  context.subscriptions.push(diagnosticManager);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "alint-pro.lintFile",
      lintFile(diagnosticManager),
    ),
  );

  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot =
    workspaceFolders && workspaceFolders.length > 0 ?
      workspaceFolders[0].uri.fsPath
    : undefined;
  if (!workspaceRoot) {
    return;
  }

  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      AlintProTaskProvider.TaskType,
      new AlintProTaskProvider(),
    ),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
