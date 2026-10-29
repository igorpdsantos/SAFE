/** Falta dado para calcular (sem renda). A API traduz para 409 INSUFFICIENT_DATA. */
export class InsufficientDataError extends Error {
  constructor(readonly field: 'income') {
    super('Renda ausente: não é possível calcular');
    this.name = 'InsufficientDataError';
  }
}

export type SimulationErrorKind = 'VALIDATION' | 'INCONSISTENT';

/** Entrada de simulação inválida (SPEC-08 §2.1). `fields` vem em pt-BR para a interface. */
export class SimulationValidationError extends Error {
  constructor(
    readonly kind: SimulationErrorKind,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'SimulationValidationError';
  }
}
