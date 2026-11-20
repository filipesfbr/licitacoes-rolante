import type { ItemPortal, LicitacaoPortal, VencedorPortal } from './tipos.ts';

// Escala fixa de 6 casas por fator: o produto fica com 12 e cabe qualquer valor do portal.
const CASAS = 6;

/** Número do JSON → inteiro em 10^-casas, sem passar por float (0,1 + 0,2 fica exato). */
export function escalar(v: number, casas = CASAS): bigint {
  const s = String(v);
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) throw new Error(`número fora do formato esperado: ${s}`);
  const frac = m[3] ?? '';
  if (frac.length > casas) throw new Error(`número com mais de ${casas} casas: ${s}`);
  const n = BigInt(m[2] + frac.padEnd(casas, '0'));
  return m[1] ? -n : n;
}

/** Soma de quantidade × valor em decimal exato, arredondada só no fim para centavos (meio para cima). */
export function somaCentavos(vencedores: Pick<VencedorPortal, 'quantidade_item' | 'valor_vencedor'>[]): bigint {
  let soma = 0n;
  for (const v of vencedores) soma += escalar(v.quantidade_item ?? 0) * escalar(v.valor_vencedor ?? 0);
  const divisor = 10n ** BigInt(2 * CASAS - 2);
  // shortcut: meio para cima só vale para soma positiva, que é o único caso que passa no item 3 da R2.
  return (soma + divisor / 2n) / divisor;
}

export const CNPJ = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
export const CPF_MASCARADO = /^\*{3}\.\*{3}\.\*{3}-\d{2}$/;

const positivo = (v: number | null) => typeof v === 'number' && v > 0;

/**
 * R2: a licitação só entra na coleta se os vencedores fecharem com o `total` do portal. O item 1
 * (linhas == `recordsTotal`) é conferido na API. Devolve a lista de problemas (vazia = confere).
 */
export function validarLicitacao(
  lic: Pick<LicitacaoPortal, 'codigoLicitacao' | 'total'>,
  vencedores: VencedorPortal[],
  itens: Pick<ItemPortal, 'lote' | 'sequenciaitem' | 'qtdademax'>[] = [],
): string[] {
  const erros: string[] = [];
  const id = `licitação ${lic.codigoLicitacao}`;
  // Quantidade 0 só passa quando o próprio portal cadastra o item com quantidade máxima 0.
  const semQuantidade = new Set(itens.filter((i) => i.qtdademax === 0).map((i) => `${i.lote}/${i.sequenciaitem}`));

  vencedores.forEach((v, i) => {
    const linha = `${id}, vencedor ${i + 1} (lote ${v.lote}, item ${v.sequenciaitem})`;
    const zeroDoPortal = v.quantidade_item === 0 && semQuantidade.has(`${v.lote}/${v.sequenciaitem}`);
    if (!positivo(v.quantidade_item) && !zeroDoPortal) erros.push(`${linha}: quantidade ${v.quantidade_item}`);
    if (!positivo(v.valor_vencedor)) erros.push(`${linha}: valor ${v.valor_vencedor}`);
    const doc = v.documento_fornecedor ?? '';
    if (!CNPJ.test(doc) && !CPF_MASCARADO.test(doc)) erros.push(`${linha}: documento fora do formato (${doc ? 'preenchido' : 'vazio'})`);
  });
  if (erros.length) return erros;

  const total = lic.total ?? 0;
  if (!vencedores.length) {
    if (total !== 0) erros.push(`${id}: total ${total} sem nenhum vencedor`);
    return erros;
  }
  let totalCentavos: bigint;
  try {
    totalCentavos = escalar(total, 2);
  } catch {
    return [`${id}: total ${total} com mais de 2 casas`];
  }
  const soma = somaCentavos(vencedores);
  if (soma !== totalCentavos) erros.push(`${id}: soma dos vencedores ${soma} centavos ≠ total ${totalCentavos} centavos`);
  return erros;
}
