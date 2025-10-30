import * as vscode from "vscode";

export class AlintProTaskProvider implements vscode.TaskProvider {
  static TaskType = "alint-pro" as const;

  constructor() {}

  provideTasks(
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Task[]> {
    return [this.getTask()];
  }

  resolveTask(
    task: vscode.Task,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Task> {
    const definition = task.definition as CustomBuildTaskDefinition;
    return this.getTask(definition);
  }

  private getTask(definition?: CustomBuildTaskDefinition): vscode.Task {
    definition ??= {
      type: AlintProTaskProvider.TaskType,
    };

    return new vscode.Task(
      definition,
      vscode.TaskScope.Workspace,
      "Lint with ALINT-PRO",
      AlintProTaskProvider.TaskType,
      new vscode.ProcessExecution("pwd", []),
    );
  }
}

interface CustomBuildTaskDefinition extends vscode.TaskDefinition {
  readonly type: typeof AlintProTaskProvider.TaskType;
}
