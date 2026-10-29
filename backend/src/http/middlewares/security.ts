import helmet from 'helmet';
import type { RequestHandler } from 'express';

/** Cabeçalhos da SEGURANCA_LGPD §6.2. HSTS só em produção (em localhost atrapalharia o http). */
export function securityHeaders(production: boolean): RequestHandler[] {
  return [
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
      strictTransportSecurity: production ? { maxAge: 31536000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
    }),
    (_req, res, next) => {
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
      next();
    },
  ];
}

/** Em produção, atrás do proxy: http → https. */
export const httpsRedirect: RequestHandler = (req, res, next) => {
  if (req.secure) return next();
  res.redirect(308, `https://${req.headers.host ?? ''}${req.originalUrl}`);
};
