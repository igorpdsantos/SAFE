// Dados por requisição em res.locals (preenchidos pelos middlewares).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      requestId: string;
      session?: {
        id: string;
        key: string;
        userId: number;
        createdAt: number;
        lastSeenAt: number;
        csrf: string;
        termsOk?: string;
      };
    }
  }
}

export {};
