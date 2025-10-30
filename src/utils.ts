import * as vscode from "vscode";
import { join as joinPath, sep as pathSep } from "path";
import * as os from "os";
import * as cp from "child_process";
import { NonZeroExitStatusError } from "./errors";

export function getBinDir(): string {
  return os.platform() === "win32" ? "bin" : "bin/Linux64";
}

export function getBinNames(firstBin: string, ...restBins: string[]): string {
  const head = [firstBin, ...restBins.slice(0, -1)].map(getBinName).join(", ");
  const last = restBins.slice(-1).map(getBinName);
  return [head, ...last].join(" and ");
}

export function getBinPath(alintProPath: string, bin: string): string {
  return joinPath(alintProPath, getBinDir(), getBinName(bin));
}

let _channel: vscode.OutputChannel;
export function getOutputChannel(): vscode.OutputChannel {
  if (!_channel) {
    _channel = vscode.window.createOutputChannel("ALINT-PRO");
  }

  return _channel;
}

export function spawnProcess(
  command: string[],
  options?: cp.SpawnOptionsWithoutStdio,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const bin = command[0];
    const args = command.slice(1);
    let stdoutData = "";

    getOutputChannel().show(true);
    getOutputChannel().appendLine(`\$ ${command.join(" ")}`);

    const process = cp.spawn(bin, args, options);

    process.stdout.on("data", (data: Uint8Array) => {
      getOutputChannel().appendLine(`${data}`);
      stdoutData += data.toString();
    });

    process.stderr.on("data", (data: Uint8Array) => {
      getOutputChannel().appendLine(`${data}`);
    });

    process.on("close", (code) => {
      getOutputChannel().appendLine(`Child process exited with code ${code}\n`);
      if (code === 0) {
        resolve(stdoutData);
      } else {
        reject(new NonZeroExitStatusError(code));
      }
    });
  });
}

export function untildify(path: string): string {
  const prefix = `~${pathSep}`;
  return (
    path.startsWith(prefix) ?
      os.homedir() + pathSep + path.substring(prefix.length)
    : path === prefix ? os.homedir()
    : path
  );
}

function getBinName(bin: string): string {
  return os.platform() === "win32" ? bin + ".exe" : bin;
}
