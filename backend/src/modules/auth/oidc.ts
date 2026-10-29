import * as client from 'openid-client';
import type { Env } from '../../config/env.js';

export interface AuthorizationRequest {
  url: string;
  state: string;
  nonce: string;
  verifier: string;
}

export interface OidcIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
}

export type OidcFailure = 'unavailable' | 'invalid';

export class OidcError extends Error {
  constructor(readonly kind: OidcFailure) {
    super(`OIDC: ${kind}`);
    this.name = 'OidcError';
  }
}

/** Provedor de identidade. Em produção, o Google; nos testes, um falso. */
export interface OidcProvider {
  start(): Promise<AuthorizationRequest>;
  /** Troca o code e valida o id_token. Tokens do Google são descartados aqui (S-04). */
  finish(
    callbackUrl: URL,
    checks: { state: string; nonce: string; verifier: string },
  ): Promise<OidcIdentity>;
}

const NETWORK_ERRORS = new Set(['TypeError', 'AbortError', 'TimeoutError']);
const classify = (err: unknown): OidcFailure =>
  err instanceof Error && NETWORK_ERRORS.has(err.name) ? 'unavailable' : 'invalid';

/** Google OpenID Connect: Authorization Code + PKCE, escopo `openid email` (SPEC-02 §2). */
export function googleOidc(env: Env): OidcProvider {
  let config: Promise<client.Configuration> | null = null;
  const getConfig = () => {
    config ??= client
      .discovery(
        new URL('https://accounts.google.com'),
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        undefined,
        {
          timeout: 5,
        },
      )
      .catch((err: unknown) => {
        config = null;
        void err;
        throw new OidcError('unavailable');
      });
    return config;
  };

  return {
    async start() {
      const cfg = await getConfig();
      const verifier = client.randomPKCECodeVerifier();
      const state = client.randomState();
      const nonce = client.randomNonce();
      const url = client.buildAuthorizationUrl(cfg, {
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email',
        code_challenge: await client.calculatePKCECodeChallenge(verifier),
        code_challenge_method: 'S256',
        state,
        nonce,
        prompt: 'select_account',
      });
      return { url: url.href, state, nonce, verifier };
    },

    async finish(callbackUrl, checks) {
      const cfg = await getConfig();
      try {
        const tokens = await client.authorizationCodeGrant(cfg, callbackUrl, {
          pkceCodeVerifier: checks.verifier,
          expectedState: checks.state,
          expectedNonce: checks.nonce,
          idTokenExpected: true,
        });
        const claims = tokens.claims();
        if (!claims || typeof claims.email !== 'string') throw new OidcError('invalid');
        return {
          sub: claims.sub,
          email: claims.email.toLowerCase(),
          emailVerified: claims.email_verified === true,
        };
      } catch (err) {
        if (err instanceof OidcError) throw err;
        throw new OidcError(classify(err));
      }
    },
  };
}
