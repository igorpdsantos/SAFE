export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INCONSISTENT_SIMULATION'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'CSRF_FAILED'
  | 'TERMS_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_DATA'
  | 'TERMS_OUTDATED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

/** Erro de aplicação no formato único da SPEC-01 §4.2. A mensagem é para o usuário (pt-BR). */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly httpStatus: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (message = 'Não encontramos o que você procurou.') =>
  new AppError('NOT_FOUND', 404, message);

export const validationError = (
  fields: Record<string, string>,
  message = 'Confira os campos destacados.',
) => new AppError('VALIDATION_ERROR', 400, message, fields);

export const insufficientData = () =>
  new AppError(
    'INSUFFICIENT_DATA',
    409,
    'Cadastre sua renda para calcularmos seu índice de risco.',
  );

export interface ErrorBody {
  error: { code: ErrorCode; message: string; requestId: string; fields?: Record<string, string> };
}
