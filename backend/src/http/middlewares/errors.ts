import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, notFound, type ErrorBody } from '../../lib/errors.js';
import type { Logger } from '../../lib/logger.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound('Este endereço não existe.'));
};

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    return new AppError('VALIDATION_ERROR', 400, 'Confira os campos destacados.', fields);
  }
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.too.large') {
    return new AppError('PAYLOAD_TOO_LARGE', 413, 'Os dados enviados são grandes demais.');
  }
  if (type === 'entity.parse.failed') {
    return new AppError('VALIDATION_ERROR', 400, 'Não conseguimos ler os dados enviados.', {});
  }
  return new AppError(
    'INTERNAL_ERROR',
    500,
    'Algo deu errado do nosso lado. Tente de novo em alguns minutos.',
  );
}

/** Converte qualquer erro no formato da SPEC-01 §4.2; a stack só vai para o log. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    const appError = toAppError(err);
    const requestId: string = res.locals.requestId ?? 'desconhecido';
    if (appError.httpStatus >= 500) {
      // Só o nome e as linhas "at …" da pilha: a mensagem (às vezes em várias linhas) pode trazer valores.
      const stack = (err as Error)?.stack
        ?.split('\n')
        .filter((line) => /^\s+at /.test(line))
        .join('\n');
      logger.error({ requestId, err: { name: (err as Error)?.name, stack } }, 'erro interno');
    }
    const body: ErrorBody = {
      error: { code: appError.code, message: appError.message, requestId },
    };
    if (appError.fields) body.error.fields = appError.fields;
    res.status(appError.httpStatus).json(body);
  };
}
