import type { Db } from './prisma.js';

export type AuditOperation =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGOUT_ALL'
  | 'TERMS_ACCEPT'
  | 'RESEARCH_CONSENT_GRANT'
  | 'RESEARCH_CONSENT_REVOKE'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'ACCOUNT_DELETED';

export interface AuditEntry {
  userId: number | null;
  operation: AuditOperation;
  entity: string;
  entityId?: number | null;
  /** Só NOMES de campos alterados, nunca valores (SEGURANCA_LGPD §9). */
  fields?: string[];
  at: Date;
}

/** Grava no log_auditoria; chame dentro da mesma transação da escrita (SPEC-04 §4). */
export async function audit(db: Db, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: entry.userId,
      operation: entry.operation,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      occurredAt: entry.at,
      details: entry.fields ? { fields: entry.fields } : undefined,
    },
  });
}
