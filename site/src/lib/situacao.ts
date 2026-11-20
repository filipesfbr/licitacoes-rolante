import type { Licitacao } from '../../../coletor/src/tipos.ts';

export type Situacao = { rotulo: string; aberta: boolean; recebendo: boolean };

const EM_ANDAMENTO = 'Em Andamento';

/** Fim do prazo de propostas em ms. Sem hora, vale até o fim do dia (horário de Brasília). */
export function fimDoPrazo(l: Pick<Licitacao, 'fechamento_propostas'>): number | null {
  const f = l.fechamento_propostas;
  if (!f) return null;
  return new Date(f.length > 10 ? `${f}:59-03:00` : `${f}T23:59:59-03:00`).getTime();
}

/** Seção 5 do plano (D4): rótulo da tela; o status do portal sempre aparece ao lado. */
export function situacao(l: Pick<Licitacao, 'status' | 'fechamento_propostas'>, agora: number): Situacao {
  const s = l.status;
  if (s === EM_ANDAMENTO) {
    const fim = fimDoPrazo(l);
    if (fim === null) return { rotulo: 'Em andamento', aberta: true, recebendo: false };
    return fim >= agora
      ? { rotulo: 'Recebendo propostas', aberta: true, recebendo: true }
      : { rotulo: 'Prazo de propostas encerrado', aberta: true, recebendo: false };
  }
  const fechada = (rotulo: string) => ({ rotulo, aberta: false, recebendo: false });
  if (s === 'Encerramento') return fechada('Encerrada');
  if (s.startsWith('Encerramento por falta')) return fechada('Sem vencedor');
  if (s === 'Anulação de ofício') return fechada('Anulada');
  if (s === 'Revogação de ofício') return fechada('Revogada');
  // Qualquer outro status ("Alteração do edital"…) aparece exatamente como vem do portal.
  return fechada(s);
}

/** Recebendo propostas primeiro, pelo prazo mais próximo; depois o resto, da emissão mais recente. */
export function ordenar(lista: Licitacao[], agora: number): Licitacao[] {
  const chave = (l: Licitacao) => (situacao(l, agora).recebendo ? 0 : 1);
  return [...lista].sort(
    (a, b) =>
      chave(a) - chave(b) ||
      (chave(a) === 0 ? fimDoPrazo(a)! - fimDoPrazo(b)! : b.emissao.localeCompare(a.emissao) || b.numero - a.numero),
  );
}

export const contratacaoDireta = (modalidade: string) => /dispensa|inexigibilidade/i.test(modalidade);
export const leilao = (modalidade: string) => /leil[aã]o/i.test(modalidade);

const sem = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Busca sem acento nem caixa, em objeto, modalidade, número e processo. */
export function buscar(lista: Licitacao[], termo: string): Licitacao[] {
  const t = sem(termo.trim());
  if (!t) return lista;
  return lista.filter((l) =>
    sem(`${l.finalidade} ${l.modalidade} ${l.numero}/${l.ano} processo ${l.processo ?? ''}`).includes(t),
  );
}
