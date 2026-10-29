// npm run eval:agreement — concordância IRE × especialistas (PA1).
// Entrada: evaluation/especialistas-respostas.csv com colunas id,avaliador,faixa (1–5).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { diagnose } from '../../backend/src/engine/diagnose.js';
import { EVAL_DIR, parseCsv, readPersonas, snapshotOf, writeResult } from './lib.js';
import { median, spearman, weightedKappa } from './stats.js';

const answersFile = join(EVAL_DIR, 'especialistas-respostas.csv');
if (!existsSync(answersFile)) {
  console.error(
    'Falta evaluation/especialistas-respostas.csv (colunas: id,avaliador,faixa). Rode de novo quando as respostas chegarem.',
  );
  process.exit(1);
}

const ire = new Map(readPersonas().map((p) => [p.id, diagnose(snapshotOf(p))]));
const answers = parseCsv(readFileSync(answersFile, 'utf8')).map((r) => ({
  id: r.id!,
  avaliador: r.avaliador!,
  faixa: Number(r.faixa),
}));
const ids = [...ire.keys()].filter((id) => answers.some((a) => a.id === id));
const medians = ids.map((id) => median(answers.filter((a) => a.id === id).map((a) => a.faixa)));
const rho = spearman(
  ids.map((id) => Number(ire.get(id)!.ire.raw)),
  medians,
);

const raters = [...new Set(answers.map((a) => a.avaliador))];
const kappas = raters.map((rater) => {
  const own = answers.filter((a) => a.avaliador === rater && ire.has(a.id));
  return {
    avaliador: rater,
    n: own.length,
    kappa: weightedKappa(
      own.map((a) => ire.get(a.id)!.ire.band),
      own.map((a) => a.faixa),
    ).toFixed(3),
  };
});

const confusion = Array.from({ length: 5 }, () => new Array<number>(5).fill(0));
const disagreements: Record<string, unknown>[] = [];
ids.forEach((id, i) => {
  const band = ire.get(id)!.ire.band;
  const expert = Math.round(medians[i]!);
  confusion[band - 1]![expert - 1]!++;
  if (Math.abs(band - expert) >= 2)
    disagreements.push({ id, faixa_ire: band, mediana_especialistas: medians[i] });
});

writeResult('agreement-kappa', kappas, ['avaliador', 'n', 'kappa']);
writeResult(
  'agreement-confusao',
  confusion.map((row, i) => ({
    faixa_ire: i + 1,
    e1: row[0],
    e2: row[1],
    e3: row[2],
    e4: row[3],
    e5: row[4],
  })),
  ['faixa_ire', 'e1', 'e2', 'e3', 'e4', 'e5'],
);
writeResult('agreement-discordancias', disagreements, ['id', 'faixa_ire', 'mediana_especialistas']);
console.log(`Spearman ρ (IRE × mediana): ${rho.toFixed(3)} com ${ids.length} personas`);
for (const k of kappas) console.log(`Kappa ponderado ${k.avaliador}: ${k.kappa} (n=${k.n})`);
console.log(`Discordâncias de 2 faixas ou mais: ${disagreements.length}`);
