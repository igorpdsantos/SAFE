import type { Logger } from './logger.js';

type Listener = (userId: number) => Promise<void> | void;

/**
 * Evento interno `budgetChanged` (SPEC-04 §4). O emit espera os ouvintes terminarem:
 * a resposta só sai com o indicador e o histórico atualizados, e os testes ficam determinísticos.
 */
export class BudgetEvents {
  private readonly listeners: Listener[] = [];

  constructor(private readonly logger: Logger) {}

  onBudgetChanged(listener: Listener): void {
    this.listeners.push(listener);
  }

  async budgetChanged(userId: number): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(userId);
      } catch (err) {
        // O orçamento já foi salvo; um ouvinte com erro não pode desfazer isso.
        this.logger.error({ userId, err: { name: (err as Error).name } }, 'falha em budgetChanged');
      }
    }
  }
}
