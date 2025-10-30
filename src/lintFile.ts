import * as fs from "fs/promises";
import * as os from "os";
import { join as joinPaths, resolve as resolvePath } from "path";
import * as vscode from "vscode";
import { getBinPath, getOutputChannel, spawnProcess } from "./utils";
import {
  AlintProError,
  NonZeroExitStatusError,
  OrphanedDiagnosticDetailsError,
  UnsupportedLanguageIdError,
} from "./errors";
import { Configuration } from "./configuration";
import { DiagnosticManager } from "./diagnosticManager";

export function lintFile(
  diagnosticManager: DiagnosticManager,
): () => Promise<void> {
  return async () => {
    let tempDir: string | undefined;

    try {
      const document = vscode.window.activeTextEditor?.document;
      if (!document) {
        vscode.window.showErrorMessage("No file open in the current tab");
        return;
      }

      const diagnosticCollection = diagnosticManager.getCollection(
        document.uri,
      );

      const config = new Configuration(document.uri);

      const alintProPath = await config.getAlintProPath();
      if (!alintProPath) {
        return;
      }

      // Create a temporary directory for the working library
      tempDir = await fs.mkdtemp(joinPaths(os.tmpdir(), "alint-vscode-"));

      diagnosticCollection.clear();

      while (true) {
        try {
          const diagnostics = await runLinter(document, alintProPath, tempDir);
          diagnosticCollection.set(document.uri, diagnostics);
          break;
        } catch (err) {
          // If the document is not in a supported language, ask user to change
          // it.
          if (err instanceof UnsupportedLanguageIdError) {
            const response = await vscode.window.showErrorMessage(
              err.message,
              {
                modal: true,
                detail:
                  "Supported language modes are:" +
                  " 'System Verilog' (systemverilog), 'Verilog' (verilog)" +
                  " and 'VHDL' (vhdl)",
              },
              "Change language",
            );
            // User dismissed the message
            if (!response) {
              return;
            }

            // Open a change language dialog
            await vscode.commands.executeCommand(
              "workbench.action.editor.changeLanguageMode",
            );
            continue;
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      // Don't do anything when command fails
      if (err instanceof NonZeroExitStatusError) {
      } else if (err instanceof AlintProError) {
        vscode.window.showErrorMessage(err.message);
      } else {
        throw err;
      }
    } finally {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }
  };
}

function parseLinterDiagnostics(
  result: vscode.Diagnostic[],
  alintOutput: string,
  cwd: string,
  document: vscode.TextDocument,
  diagnosticLength: number,
): void {
  const diagnosticPatterns = [
    // When parsing is aborted
    /^(?<code>VHDL-1482): VHDL file '(?<path>.+?)' is ignored due to errors$/m,
    /^(?<code>RUNM-1040): (?<severity>[^:]+): (?<message>.+)$/m,

    // The most common
    /^(?<code>[^:]+): (?<severity>[^:]+): (?<path>.+?) : \((?<line>\d+), (?<column>\d+)\): (?<message>.+)$/m,
  ];

  const detailsPattern =
    /^Details: (?<path>.+?) : \((?<line>\d+), (?<column>\d+)\): (?<message>.+)$/m;

  const outputLines = alintOutput.split("\n");

  for (const outputLine of outputLines) {
    let matched = false;

    for (const pattern of diagnosticPatterns) {
      const match = outputLine.match(pattern);
      if (!match?.groups) {
        continue;
      }
      matched = true;

      const vhdlFileIgnored = match.groups["code"] === "VHDL-1482";

      const line =
        match.groups["line"] ? Number.parseInt(match.groups["line"]) - 1 : 0;
      const column =
        match.groups["column"] ?
          Number.parseInt(match.groups["column"]) - 1
        : 0;

      const lineLength = document.lineAt(line).text.length;
      const endColumn =
        // Make diagnostic to the end of the line, if `diagnosticLength === -1`
        diagnosticLength === -1 ? lineLength : (
          Math.min(column + diagnosticLength, lineLength)
        );

      const range = new vscode.Range(line, column, line, endColumn);

      const message =
        vhdlFileIgnored ?
          "VHDL file is ignored due to errors"
        : match.groups["message"];

      const code = match.groups["code"] as string | undefined;

      const severity =
        vhdlFileIgnored || match.groups["severity"] === "Error" ?
          vscode.DiagnosticSeverity.Error
        : match.groups["severity"] === "Info" ?
          vscode.DiagnosticSeverity.Information
        : vscode.DiagnosticSeverity.Warning;

      const diagnostic = new vscode.Diagnostic(range, message, severity);
      diagnostic.source = "alint-pro";
      diagnostic.code = code;
      result.push(diagnostic);
      break;
    }

    if (matched) {
      continue;
    }

    const match = outputLine.match(detailsPattern);
    if (!match?.groups) {
      continue;
    }

    const lastDiagnostic = result.at(-1);
    if (!lastDiagnostic) {
      throw new OrphanedDiagnosticDetailsError();
    }

    const path = resolvePath(cwd, match.groups["path"]);
    const line = Number.parseInt(match.groups["line"]) - 1;
    const column = Number.parseInt(match.groups["column"]) - 1;
    const range = new vscode.Range(line, column, line, column + 1);
    const location = new vscode.Location(vscode.Uri.file(path), range);
    const message = match.groups["message"];

    const information = new vscode.DiagnosticRelatedInformation(
      location,
      message,
    );
    lastDiagnostic.relatedInformation ??= [];
    lastDiagnostic.relatedInformation.push(information);
  }
}

async function runLinter(
  document: vscode.TextDocument,
  alintProPath: string,
  cwd: string,
): Promise<vscode.Diagnostic[]> {
  let result: vscode.Diagnostic[] = [];
  const vlibBin = getBinPath(alintProPath, "vlib");
  const vlibCmd = [vlibBin, "work"];

  const config = new Configuration(document.uri);
  const maxRuleWarn = await config.getMaxRuleWarn();
  const maxWarn = await config.getMaxWarn();
  const diagnosticLength = config.getDiagnosticLength();

  if (maxRuleWarn === undefined || maxWarn === undefined) {
    return [];
  }

  const commonArgs = [
    "-alint",
    "-alint_elabflatmode",
    ...["-alint_maxrulewarn", maxRuleWarn.toString()],
    ...["-alint_maxwarn", maxWarn.toString()],
    ...["-work", "work"],
    document.uri.fsPath,
  ];

  const language =
    document.languageId === "systemverilog" ? "verilog" : document.languageId;
  try {
    switch (language) {
      case "verilog": {
        const vlogBin = getBinPath(alintProPath, "vlog");
        const vlogCmd = [vlogBin, "-sv2k9", ...commonArgs];

        getOutputChannel().clear();
        await spawnProcess(vlibCmd, { cwd });
        parseLinterDiagnostics(
          result,
          await spawnProcess(vlogCmd, { cwd }),
          cwd,
          document,
          diagnosticLength,
        );

        break;
      }

      case "vhdl": {
        const vcomBin = getBinPath(alintProPath, "vcom");
        const vcomCmd = [vcomBin, "-2002", ...commonArgs];

        getOutputChannel().clear();
        await spawnProcess(vlibCmd, { cwd });
        parseLinterDiagnostics(
          result,
          await spawnProcess(vcomCmd, { cwd }),
          cwd,
          document,
          diagnosticLength,
        );

        break;
      }

      default: {
        throw new UnsupportedLanguageIdError(language);
      }
    }
  } catch (err) {
    // Parsing failed, but we still want to display diagnostics
    if (
      err instanceof NonZeroExitStatusError &&
      err.code === 1 &&
      result.pop()?.code === "RUNM-1040"
    ) {
    } else {
      throw err;
    }
  }

  return result;
}
