import { queryClient } from './queryClient';
import { purgeBrowserStorage } from './storage';

export type SessionEndReason = 'expired' | 'logout' | 'deleted';

const CHANNEL = 'safe-auth';
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}

function cleanup(): void {
  queryClient.clear();
  purgeBrowserStorage();
}

function target(reason: SessionEndReason): string {
  return reason === 'deleted' ? '/conta-excluida' : `/login?motivo=${reason}`;
}

/**
 * Fim da sessão: limpa cache e estado, avisa as outras abas e troca de página com
 * `location.replace` (o "voltar" não mostra dados; as respostas são no-store).
 */
export function handleSessionEnd(reason: SessionEndReason): void {
  cleanup();
  getChannel()?.postMessage({ type: 'logout', reason });
  window.location.replace(target(reason));
}

/** Todas as abas ouvem o canal e fazem a mesma limpeza (SPEC-11 §4). */
export function listenForSessionEnd(): () => void {
  const ch = getChannel();
  if (!ch) return () => undefined;
  const onMessage = (event: MessageEvent<{ type?: string; reason?: SessionEndReason }>) => {
    if (event.data?.type !== 'logout') return;
    cleanup();
    window.location.replace(target(event.data.reason ?? 'logout'));
  };
  ch.addEventListener('message', onMessage);
  return () => ch.removeEventListener('message', onMessage);
}
