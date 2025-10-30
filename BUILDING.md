# Building

For building the extension, [pnpm] is used. Install it according to directions
on [pnpm's website][pnpm-installation] and then execute the following commands:

```
pnpm install
pnpm exec vsce package
```

This will build and package it as a .vsix file. It can be installing using the following command:

```
code --install-extension alint-pro-<version>.vsix
```

## Development

### Setting up the environment

Install Visual Studio Code, VSCodium or Code OSS according to instruction on their
respecting websites.

To build the extension, you can optionally start with installing recommended
extensions in VSCode. Some of them are only available in the official Microsoft
build, i.e. not VSCodium or Code OSS. VSCode should recommend available
extensions listed in [.vscode/extensions.json][vscode-extensions-json]
automatically. If not, they can also be installed manually via pressing key
combination Ctrl+P and entering command `ext install <extension ID>` for each
extension. The recommended extensions have the following `<extension ID>`s:

- `connor4312.esbuild-problem-matchers`
- `dbaeumer.vscode-eslint`
- `ms-vscode.extension-test-runner`

[pnpm]: https://pnpm.io/
[pnpm-installation]: https://pnpm.io/installation
[vscode-extensions-json]: ./.vscode/extensions.json
