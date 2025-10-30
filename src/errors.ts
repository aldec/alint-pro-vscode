export class AlintProError extends Error {}

export class NoConfigKeyError extends AlintProError {
  constructor(public readonly key: string) {
    super(`Config key ${key} doesn't exist`);
  }
}

export class NonZeroExitStatusError extends AlintProError {
  constructor(public readonly code: number | null) {
    super(`Non-zero exit code: ${code}`);
  }
}

export class UnsupportedLanguageIdError extends AlintProError {
  constructor(public readonly languageId: string) {
    super(`Unsupported language ID: ${languageId}`);
  }
}

export class OrphanedDiagnosticDetailsError extends AlintProError {
  constructor() {
    super("Found diagnostic details without the diagnostic itself");
  }
}
