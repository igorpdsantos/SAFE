import { Writable } from 'node:stream';
import { createLogger } from '../../src/lib/logger.js';

/** Logger que guarda as linhas em memória para os testes conferirem o que foi logado. */
export function captureLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(String(chunk));
      cb();
    },
  });
  return { logger: createLogger('info', stream), lines, text: () => lines.join('') };
}
