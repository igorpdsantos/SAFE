import { OidcError, type OidcProvider } from '../../src/modules/auth/oidc.js';

/**
 * Provedor falso. O `code` do callback diz o que o "Google" responde:
 * `ok:<sub>:<email>`, `unverified:<sub>:<email>`, `down` (indisponível) ou qualquer outra coisa (inválido).
 */
export class FakeOidc implements OidcProvider {
  available = true;
  private n = 0;

  async start() {
    if (!this.available) throw new OidcError('unavailable');
    this.n++;
    const state = `state-${this.n}`;
    return {
      url: `https://accounts.example/auth?state=${state}`,
      state,
      nonce: `nonce-${this.n}`,
      verifier: `verifier-${this.n}`,
    };
  }

  async finish(callbackUrl: URL, checks: { state: string; nonce: string; verifier: string }) {
    if (callbackUrl.searchParams.get('state') !== checks.state) throw new OidcError('invalid');
    const code = callbackUrl.searchParams.get('code') ?? '';
    if (code === 'down') throw new OidcError('unavailable');
    const [kind, sub, email] = code.split(':');
    if ((kind !== 'ok' && kind !== 'unverified') || !sub || !email) throw new OidcError('invalid');
    return { sub, email, emailVerified: kind === 'ok' };
  }
}
