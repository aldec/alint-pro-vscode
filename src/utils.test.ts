import * as sinon from "sinon";
import * as assert from "assert";
import os from "os";
import path from "path";
import { getBinNames, getBinPath, untildify } from "./utils";

describe("utils", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("getBinNames", () => {
    const tests = [
      {
        isWindows: false,
        firstBin: "vcom",
        restBins: [],
        expected: "vcom",
      },
      {
        isWindows: true,
        firstBin: "vcom",
        restBins: [],
        expected: "vcom.exe",
      },
      {
        isWindows: false,
        firstBin: "vcom",
        restBins: ["vlib"],
        expected: "vcom and vlib",
      },
      {
        isWindows: true,
        firstBin: "vcom",
        restBins: ["vlib"],
        expected: "vcom.exe and vlib.exe",
      },
      {
        isWindows: false,
        firstBin: "vcom",
        restBins: ["vlib", "vlog"],
        expected: "vcom, vlib and vlog",
      },
      {
        isWindows: true,
        firstBin: "vcom",
        restBins: ["vlib", "vlog"],
        expected: "vcom.exe, vlib.exe and vlog.exe",
      },
    ];
    tests.forEach(({ isWindows, firstBin, restBins, expected }) =>
      it("returns correct bin names", async () => {
        sinon.replace(os, "platform", () => (isWindows ? "win32" : "linux"));

        const actual = getBinNames(firstBin, ...restBins);
        assert.equal(actual, expected);
      }),
    );
  });

  describe("getBinPath", () => {
    const tests = [
      {
        isWindows: false,
        alintProPath: "/home/steve/ALINT-PRO",
        bin: "vlog",
        expected: "/home/steve/ALINT-PRO/bin/Linux64/vlog",
      },
      {
        isWindows: true,
        alintProPath: "C:\\Users\\Steve\\ALINT-PRO",
        bin: "vlog",
        expected: "C:\\Users\\Steve\\ALINT-PRO\\bin\\vlog.exe",
      },
    ];
    tests.forEach(({ isWindows, alintProPath, bin, expected }) =>
      it("returns the correct bin path", async () => {
        sinon.replace(os, "platform", () => (isWindows ? "win32" : "linux"));
        sinon.replace(
          path,
          "join",
          isWindows ? path.win32.join : path.posix.join,
        );

        const actual = getBinPath(alintProPath, bin);
        assert.equal(actual, expected);
      }),
    );
  });

  describe("untildify", () => {
    const tests = [
      {
        pathSep: "/",
        homedir: "/Users/steve",
        input: "~/test",
        expected: "/Users/steve/test",
      },
      {
        pathSep: "/",
        homedir: "/home/steve",
        input: "~/test",
        expected: "/home/steve/test",
      },
      {
        pathSep: "\\",
        homedir: "C:\\\\Users\\steve",
        input: "~\\test",
        expected: "C:\\\\Users\\steve\\test",
      },
    ];

    tests.forEach(({ pathSep, homedir, input, expected }) =>
      it("correctly replaces the tilde", async () => {
        const typeStub = sinon.stub(path, "sep");
        typeStub.get(() => pathSep);

        const homedirStub = sinon.stub(os, "homedir");
        homedirStub.returns(homedir);

        assert.equal(untildify(input), expected);
      }),
    );
  });
});
