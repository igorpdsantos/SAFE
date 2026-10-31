import type { ReactNode, SVGProps } from 'react';

/*
 * Ilustrações próprias do SAFE (T-11.8): traço de 2 px na cor da marca, fundos suaves e um
 * toque dourado. São decorativas (aria-hidden) e seguem o tema claro/escuro pelas variáveis CSS.
 */

const SOFT = { fill: 'var(--brand-soft)' };
const PAPER = { fill: 'var(--surface)' };
const GOLD = { stroke: 'var(--gold)' };
const GOLD_FILL = { fill: 'var(--gold-soft)', stroke: 'var(--gold)' };

function Svg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Marca: escudo com um mostrador dentro (proteção + medida). */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" style={{ fill: 'var(--mint)' }} opacity="0.18" />
      <path
        d="M16 5.5 7.5 9v6.4c0 5.3 3.6 9.8 8.5 11.1 4.9-1.3 8.5-5.8 8.5-11.1V9L16 5.5Z"
        fill="currentColor"
      />
      <path
        d="M11 18a5 5 0 0 1 10 0"
        fill="none"
        style={{ stroke: 'var(--pine)' }}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 18l2.6-3.4"
        style={{ stroke: 'var(--gold)' }}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="18" r="1.6" style={{ fill: 'var(--pine)' }} />
    </svg>
  );
}

/** Tela de entrada: mostrador grande, moedas e um cartão de simulação flutuando. */
export function AuthArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx="190" cy="190" r="128" opacity="0.12" />
      <circle cx="190" cy="190" r="98" opacity="0.18" />
      <path d="M92 190a98 98 0 0 1 22-62" style={{ stroke: 'var(--dial-1)' }} strokeWidth="14" />
      <path d="M120 121a98 98 0 0 1 52-27" style={{ stroke: 'var(--dial-2)' }} strokeWidth="14" />
      <path d="M181 92a98 98 0 0 1 56 12" style={{ stroke: 'var(--dial-3)' }} strokeWidth="14" />
      <path d="M245 110a98 98 0 0 1 32 46" style={{ stroke: 'var(--dial-4)' }} strokeWidth="14" />
      <path d="M280 165a98 98 0 0 1 8 25" style={{ stroke: 'var(--dial-5)' }} strokeWidth="14" />
      <path d="M190 190 140 136" strokeWidth="5" style={{ stroke: 'var(--on-pine)' }} />
      <circle cx="190" cy="190" r="11" style={{ fill: 'var(--on-pine)', stroke: 'none' }} />
      <g opacity="0.9">
        <ellipse cx="66" cy="252" rx="34" ry="9" style={GOLD_FILL} />
        <path d="M32 252v-12M100 252v-12" style={GOLD} />
        <ellipse cx="66" cy="240" rx="34" ry="9" style={GOLD_FILL} />
        <path d="M32 240v-12M100 240v-12" style={GOLD} />
        <ellipse cx="66" cy="228" rx="34" ry="9" style={GOLD_FILL} />
      </g>
      <g transform="translate(278 34)">
        <rect width="124" height="78" rx="14" style={{ fill: 'var(--pine-2)' }} opacity="0.95" />
        <rect width="124" height="78" rx="14" opacity="0.5" />
        <path d="M16 22h46" strokeWidth="3" opacity="0.8" />
        <path d="M16 36h28" opacity="0.5" />
        <path d="M16 58h18l10-10 12 6 14-16" strokeWidth="2.5" style={{ stroke: 'var(--mint)' }} />
        <circle cx="100" cy="30" r="12" style={{ stroke: 'var(--mint)' }} />
        <path d="m95 30 4 4 7-8" style={{ stroke: 'var(--mint)' }} strokeWidth="2.5" />
      </g>
      <g transform="translate(300 214)" opacity="0.85">
        <path
          d="M28 0 0 11v20c0 17 12 31 28 35 16-4 28-18 28-35V11L28 0Z"
          style={{ fill: 'var(--pine-2)' }}
        />
        <path d="m17 33 8 8 15-17" style={{ stroke: 'var(--mint)' }} strokeWidth="3" />
      </g>
    </svg>
  );
}

/** Passo 1 do primeiro acesso: conte sua situação (carteira com lista). */
export function StepBudgetArt(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <ellipse cx="80" cy="108" rx="52" ry="6" style={SOFT} stroke="none" />
      <rect x="42" y="18" width="62" height="78" rx="8" style={PAPER} />
      <path d="M54 36h28M54 50h38M54 64h22M54 78h32" />
      <circle cx="96" cy="36" r="3" style={{ fill: 'currentColor' }} />
      <rect x="70" y="52" width="58" height="44" rx="10" style={SOFT} />
      <path d="M70 66h58" />
      <circle cx="114" cy="80" r="5" style={GOLD_FILL} />
    </Svg>
  );
}

/** Passo 2: veja seu risco (mostrador). */
export function StepDialArt(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <ellipse cx="80" cy="108" rx="52" ry="6" style={SOFT} stroke="none" />
      <path d="M30 92a50 50 0 0 1 100 0" style={SOFT} />
      <path d="M30 92a50 50 0 0 1 14-35" style={{ stroke: 'var(--dial-1)' }} strokeWidth="8" />
      <path d="M50 51a50 50 0 0 1 30-9" style={{ stroke: 'var(--dial-2)' }} strokeWidth="8" />
      <path d="M86 42a50 50 0 0 1 28 12" style={{ stroke: 'var(--dial-3)' }} strokeWidth="8" />
      <path d="M118 59a50 50 0 0 1 12 33" style={{ stroke: 'var(--dial-4)' }} strokeWidth="8" />
      <path d="M80 92 56 66" strokeWidth="4" />
      <circle cx="80" cy="92" r="6" style={{ fill: 'currentColor' }} />
    </Svg>
  );
}

/** Passo 3: antes de comprar, simule (sacola + balança de antes/depois). */
export function StepSimulateArt(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <ellipse cx="80" cy="108" rx="52" ry="6" style={SOFT} stroke="none" />
      <path d="M44 46h40l-4 50H48z" style={PAPER} />
      <path d="M54 46v-6a10 10 0 0 1 20 0v6" />
      <path d="M58 70h12M64 64v12" style={GOLD} strokeWidth="2.5" />
      <rect x="92" y="30" width="44" height="66" rx="8" style={SOFT} />
      <path d="M100 82l9-12 8 6 11-16" strokeWidth="2.5" />
      <path d="M123 60h5v5" strokeWidth="2.5" />
      <path d="M100 42h18" opacity="0.6" />
    </Svg>
  );
}

/** Estado vazio de cada parte do orçamento. */
export function EmptyArt({ kind, ...props }: SVGProps<SVGSVGElement> & { kind: string }) {
  switch (kind) {
    case 'incomes':
      return (
        <Svg {...props}>
          <ellipse cx="80" cy="108" rx="48" ry="6" style={SOFT} stroke="none" />
          <rect x="34" y="40" width="92" height="56" rx="10" style={PAPER} />
          <circle cx="80" cy="68" r="14" style={GOLD_FILL} />
          <path d="M80 61v14M75 65h8a3 3 0 0 1 0 6h-6a3 3 0 0 0 0 6h8" style={GOLD} />
          <path d="M80 12v20m-8-8 8 8 8-8" strokeWidth="2.5" />
          <path d="M44 52h10M106 84h10" opacity="0.5" />
        </Svg>
      );
    case 'expenses':
      return (
        <Svg {...props}>
          <ellipse cx="80" cy="108" rx="48" ry="6" style={SOFT} stroke="none" />
          <path d="M50 16h60v84l-10-6-10 6-10-6-10 6-10-6-10 6z" style={PAPER} />
          <path d="M62 36h36M62 50h28M62 64h32" />
          <path d="M62 80h14" style={GOLD} strokeWidth="2.5" />
          <path d="M86 80h12" strokeWidth="2.5" />
        </Svg>
      );
    case 'debts':
      return (
        <Svg {...props}>
          <ellipse cx="80" cy="108" rx="48" ry="6" style={SOFT} stroke="none" />
          <rect x="36" y="24" width="88" height="74" rx="10" style={PAPER} />
          <path d="M36 44h88M58 16v14M102 16v14" />
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={48 + i * 18}
              y="56"
              width="12"
              height="12"
              rx="3"
              style={i < 2 ? { fill: 'currentColor' } : SOFT}
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <rect key={`b${i}`} x={48 + i * 18} y="76" width="12" height="12" rx="3" style={SOFT} />
          ))}
        </Svg>
      );
    case 'reserves':
      return (
        <Svg {...props}>
          <ellipse cx="80" cy="108" rx="48" ry="6" style={SOFT} stroke="none" />
          <path d="M52 34h56v10a6 6 0 0 1-6 6H58a6 6 0 0 1-6-6z" style={SOFT} />
          <path d="M56 50h48l-4 46a6 6 0 0 1-6 5H66a6 6 0 0 1-6-5z" style={PAPER} />
          <circle cx="80" cy="76" r="12" style={GOLD_FILL} />
          <circle cx="98" cy="18" r="8" style={GOLD_FILL} />
          <path d="M98 30v-2" style={GOLD} />
        </Svg>
      );
    default:
      return (
        <Svg {...props}>
          <ellipse cx="80" cy="108" rx="48" ry="6" style={SOFT} stroke="none" />
          <path d="M30 90h100" />
          <path d="M38 80l22-20 18 10 28-30 16 12" strokeWidth="2.5" />
          <circle cx="122" cy="52" r="5" style={GOLD_FILL} />
        </Svg>
      );
  }
}

/** Simulação ainda sem resultado: balança de "hoje" e "com a compra". */
export function ScaleArt(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <ellipse cx="80" cy="110" rx="50" ry="6" style={SOFT} stroke="none" />
      <path d="M80 22v80M60 102h40" />
      <path d="M36 40h88" strokeWidth="2.5" />
      <circle cx="80" cy="22" r="5" style={GOLD_FILL} />
      <path d="M36 40 22 72h28z" />
      <path d="M18 72a18 8 0 0 0 36 0z" style={SOFT} />
      <path d="M124 40l-14 26h28z" />
      <path d="M106 66a18 8 0 0 0 36 0z" style={GOLD_FILL} />
    </Svg>
  );
}
