// npm run eval:personas — IRE de cada persona + planilha cega para os especialistas (PA1).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { diagnose } from '../../backend/src/engine/diagnose.js';
import { commit, EVAL_DIR, fmt, readPersonas, snapshotOf, toCsv, writeResult } from './lib.js';

const personas = readPersonas();
const rows = personas.map((p) => {
  const d = diagnose(snapshotOf(p));
  return {
    id: p.id,
    CR: fmt(d.indicators.cr),
    CP: fmt(d.indicators.cp, 2),
    LF: fmt(d.indicators.lf),
    NE: fmt(d.indicators.ne),
    R_cr: fmt(d.risks.cr),
    R_cp: fmt(d.risks.cp),
    R_lf: fmt(d.risks.lf),
    R_ne: fmt(d.risks.ne),
    IRE: fmt(d.ire.raw),
    IRE_arredondado: d.ire.rounded.toFixed(2),
    faixa: d.ire.band,
  };
});
const file = writeResult('personas', rows, Object.keys(rows[0]!));

// Avaliação às cegas: só o id e a descrição dos valores, sem IRE nem faixa (SPEC-12 §5).
const blind = personas.map((p) => ({ id: p.id, descricao: p.descricao }));
writeFileSync(
  join(EVAL_DIR, 'especialistas.csv'),
  `# planilha cega para especialistas · commit: ${commit()} · respostas em especialistas-respostas.csv (id,avaliador,nivel de 1 a 5)\n${toCsv(blind, ['id', 'descricao'])}`,
);

const byBand = [1, 2, 3, 4, 5]
  .map((b) => `${b}: ${rows.filter((r) => r.faixa === b).length}`)
  .join(' · ');
console.log(`${rows.length} personas avaliadas → ${file}`);
console.log(`Distribuição por faixa → ${byBand}`);
