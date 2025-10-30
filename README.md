# ALINT-PRO VSCode Extension

An ALINT-PRO integration for VSCode.

## Features

- Linting System Verilog and VHDL files using ALINT-PRO.

## Requirements

A working ALINT-PRO installation.

## Usage

After installing the extension, open a Verilog or VHDL file and open the
Command Palette. It can be opened using Ctrl+Shift+P or F1 shortcuts. In the
Command Palette, start typing "Lint file with ALINT-PRO" and press Enter when
it is highlighted. The first time you will get a dialog informing about the
path being not set. Press the "Select path" button and pick the installation
path of ALINT-PRO. After that, the linting process should start.

## Extension Settings

This extension contributes the following settings:

- `alintPro.additionalSystemVerilogOptions`: List of additional SystemVerilog options
- `alintPro.additionalVHDLOptions`: List of additional VHDL options
- `alintPro.alintProPath`: Path to ALINT-PRO installation directory
- `alintPro.diagnosticLength`: Length of the diagnostics. Set to -1 to make
  diagnostics go to the end of the line
- `alintPro.maxRuleWarn`: Maximum number of violations per rule before stopping linting
- `alintPro.maxWarn`: Maximum number of violations before stopping linting

## Known Issues

None at the moment.

## Building

To build the extension, see the [BUILDING.md](./BUILDING.md) file.

## Release Notes

### 1.0.0

Initial release of ALINT-PRO VSCode Extension.
