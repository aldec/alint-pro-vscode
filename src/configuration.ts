import * as vscode from "vscode";
import { NoConfigKeyError } from "./errors";
import { getBinDir, getBinNames, getBinPath } from "./utils";
import { existsSync } from "fs";

export class Configuration {
  protected config: vscode.WorkspaceConfiguration;

  constructor(uri: vscode.Uri) {
    this.config = vscode.workspace.getConfiguration("alintPro", uri);
  }

  /**
   * Get `alintPro.alintProPath` config value. If validation failed,
   * ask user for new value. If user dismissed the notification or input
   * box, return `null`.
   */
  async getAlintProPath(): Promise<string | null> {
    // 1. Get path from the config value
    // 2. If not empty, check if required binaries exist
    //    a. If yes, return the path
    //    b. Ask user otherwise
    // 3. Verify the answer
    //    a. If the user chose to cancel, return undefined
    //    b. If binaries were not found, ask the user again and go to point 3.
    const alintProPath = this.getConfigValue<string>("alintProPath");
    return this.validateAlintProPath(alintProPath);
  }

  getDiagnosticLength(): number {
    return this.getConfigValue<number>("diagnosticLength");
  }

  async getMaxRuleWarn(): Promise<number | undefined> {
    return this.validateMaxRule("maxRuleWarn");
  }

  async getMaxWarn(): Promise<number | undefined> {
    return this.validateMaxRule("maxWarn");
  }

  protected doRequiredBinsExist(path: string): boolean {
    const binsExist = ["vcom", "vlib", "vlog"]
      .map((bin) => getBinPath(path, bin))
      .every(existsSync);
    return binsExist;
  }

  protected getConfigValue<T>(key: string): T {
    const value = this.config.get<T>(key);
    if (value === undefined) {
      throw new NoConfigKeyError(key);
    }

    return value;
  }

  protected getConfigDetails<T>(key: string): ConfigDetails<T> {
    const inspectResult = this.config.inspect<T>(key);
    if (inspectResult?.defaultValue === undefined) {
      throw new NoConfigKeyError(key);
    }

    return (
      inspectResult.workspaceFolderLanguageValue !== undefined ?
        {
          target: vscode.ConfigurationTarget.WorkspaceFolder,
          perLanguage: true,
          value: inspectResult.workspaceFolderLanguageValue,
        }
      : inspectResult.workspaceLanguageValue !== undefined ?
        {
          target: vscode.ConfigurationTarget.Workspace,
          perLanguage: true,
          value: inspectResult.workspaceLanguageValue,
        }
      : inspectResult.globalLanguageValue !== undefined ?
        {
          target: vscode.ConfigurationTarget.Global,
          perLanguage: true,
          value: inspectResult.globalLanguageValue,
        }
      : inspectResult.defaultLanguageValue !== undefined ?
        {
          target: undefined,
          perLanguage: true,
          value: inspectResult.defaultLanguageValue,
        }
      : inspectResult.workspaceFolderValue !== undefined ?
        {
          target: vscode.ConfigurationTarget.WorkspaceFolder,
          perLanguage: false,
          value: inspectResult.workspaceFolderValue,
        }
      : inspectResult.workspaceValue !== undefined ?
        {
          target: vscode.ConfigurationTarget.Workspace,
          perLanguage: false,
          value: inspectResult.workspaceValue,
        }
      : inspectResult.globalValue !== undefined ?
        {
          target: vscode.ConfigurationTarget.Global,
          perLanguage: false,
          value: inspectResult.globalValue,
        }
      : {
          target: undefined,
          perLanguage: false,
          value: inspectResult.defaultValue,
        }
    );
  }

  /**
   * Validate `alintPro.alintProPath` config value. If validation failed,
   * ask user for new value. If user dismissed the notification or input
   * box, return `null`.
   */
  async validateAlintProPath(alintProPath: string): Promise<string | null> {
    // Path is not empty
    if (alintProPath.trim().length > 0) {
      const binsExist = this.doRequiredBinsExist(alintProPath);
      // Everything in order; return the path
      if (binsExist) {
        return alintProPath;
      }

      // Path does not contain required files. Ask for another one
      const response = await vscode.window.showErrorMessage(
        "ALINT-PRO installation path does not contain required files.",
        {
          modal: true,
          detail:
            `Ensure that the ${getBinDir()} subdirectory contains` +
            ` ${getBinNames("vcom", "vlib", "vlog")} files.`,
        },
        "Select path",
      );
      // User dismissed the message
      if (!response) {
        return null;
      }
    } else {
      // Path is not set; ask for a new one
      const response = await vscode.window.showInformationMessage(
        "ALINT-PRO installation path is not set",
        { modal: true },
        "Select path",
      );
      // User dismissed the message
      if (!response) {
        return null;
      }
    }

    const fileDialogResult = (
      await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
      })
    )?.at(0);
    // User dismissed the message
    if (!fileDialogResult) {
      return null;
    }

    // Validate the new path
    const validationResult = await this.validateAlintProPath(
      fileDialogResult.fsPath,
    );

    // The path is valid, update the config value
    if (validationResult) {
      const configDetails = this.getConfigDetails<string>("alintProPath");

      this.config.update(
        "alintProPath",
        validationResult,
        configDetails.target ?? vscode.ConfigurationTarget.Global,
        configDetails.perLanguage,
      );
    }

    return validationResult;
  }

  /**
   * Validate `alintPro.maxRule` or `alintPro.maxRuleWarn` config value. If
   * validation failed, ask user for new value. If user dismissed the
   * notification or input box, return `undefined`.
   */
  private async validateMaxRule(key: string): Promise<number | undefined> {
    const configDetails = this.getConfigDetails<number>(key);
    if (Number.isInteger(configDetails.value) && configDetails.value > 0) {
      return configDetails.value;
    }

    const setNewValueAnswer = await vscode.window.showErrorMessage(
      `alintPro.${key} is not a positive integer`,
      "Set a new value",
    );
    if (!setNewValueAnswer) {
      return;
    }

    const newValue = await vscode.window.showInputBox({
      validateInput: (value) => {
        const numValue = +value;
        return Number.isInteger(numValue) && numValue > 0 ?
            null
          : "Value must be a positive integer";
      },
    });
    if (!newValue) {
      return;
    }
    const numValue = +newValue;

    this.config.update(
      key,
      numValue,
      configDetails.target ?? vscode.ConfigurationTarget.Global,
      configDetails.perLanguage,
    );
    return numValue;
  }
}

export interface ConfigDetails<T> {
  /**
   * `undefined` if the default config value is not overriden
   **/
  target: vscode.ConfigurationTarget | undefined;
  perLanguage: boolean;
  value: T;
}
