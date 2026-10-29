import { randomUUID } from 'node:crypto';
import type { Env } from '../../config/env.js';
import { audit } from '../../lib/audit.js';
import type { Clock } from '../../lib/clock.js';
import type { PrismaClient } from '../../lib/prisma.js';

export const versionsTag = (env: Env) => `${env.TERMS_VERSION}|${env.PRIVACY_VERSION}`;

/** Aceite em dia = versões vigentes + maioridade, com prova no banco (SPEC-03 §3, S-09). */
export async function termsUpToDate(
  prisma: PrismaClient,
  env: Env,
  userId: number,
): Promise<boolean> {
  const found = await prisma.termsAcceptance.findFirst({
    where: {
      userId,
      termsVersion: env.TERMS_VERSION,
      privacyVersion: env.PRIVACY_VERSION,
      ageConfirmed: true,
    },
    select: { id: true },
  });
  return found !== null;
}

export async function acceptTerms(
  prisma: PrismaClient,
  env: Env,
  clock: Clock,
  userId: number,
  researchConsent: boolean,
): Promise<{ tokenId: string }> {
  const at = clock.now();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.termsAcceptance.findFirst({
      where: {
        userId,
        termsVersion: env.TERMS_VERSION,
        privacyVersion: env.PRIVACY_VERSION,
        ageConfirmed: true,
      },
    });
    const tokenId = existing?.tokenId ?? randomUUID();
    if (!existing) {
      await tx.termsAcceptance.create({
        data: {
          userId,
          termsVersion: env.TERMS_VERSION,
          privacyVersion: env.PRIVACY_VERSION,
          ageConfirmed: true,
          acceptedAt: at,
          tokenId,
        },
      });
      await audit(tx, { userId, operation: 'TERMS_ACCEPT', entity: 'aceitacao_termos', at });
    }
    if (researchConsent) await grantResearch(tx, env, userId, at);
    return { tokenId };
  });
}

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

async function grantResearch(tx: Tx, env: Env, userId: number, at: Date): Promise<void> {
  const active = await tx.researchConsent.findFirst({ where: { userId, revokedAt: null } });
  if (active) return;
  await tx.researchConsent.create({
    data: { userId, grantedAt: at, textVersion: env.TERMS_VERSION },
  });
  await audit(tx, {
    userId,
    operation: 'RESEARCH_CONSENT_GRANT',
    entity: 'consentimento_pesquisa',
    at,
  });
}

export async function getResearchConsent(prisma: PrismaClient, userId: number) {
  const active = await prisma.researchConsent.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { grantedAt: 'desc' },
  });
  return { granted: active !== null, grantedAt: active?.grantedAt.toISOString() ?? null };
}

/** Dar cria um registro novo; revogar preenche revoked_at (art. 8º §5). */
export async function setResearchConsent(
  prisma: PrismaClient,
  env: Env,
  clock: Clock,
  userId: number,
  granted: boolean,
): Promise<void> {
  const at = clock.now();
  await prisma.$transaction(async (tx) => {
    if (granted) return grantResearch(tx, env, userId, at);
    const { count } = await tx.researchConsent.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
    if (count > 0) {
      await audit(tx, {
        userId,
        operation: 'RESEARCH_CONSENT_REVOKE',
        entity: 'consentimento_pesquisa',
        at,
      });
    }
  });
}
