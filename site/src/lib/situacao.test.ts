import { describe, expect, it } from 'vitest';
import type { Licitacao } from '../../../coletor/src/tipos.ts';
import { formatBRL, formatDataHora, formatPreco, intervalo } from './format.ts';
import { buscar, contratacaoDireta, ordenar, situacao } from './situacao.ts';

const agora = new Date('2026-11-03T12:00:00-03:00').getTime();
const lic = (o: Partial<Licitacao>) =>
  ({ codigo: 1, ano: 2026, numero: 1, status: 'Em Andamento', emissao: '2026-10-01', fechamento_propostas: null, finalidade: '', modalidade: '', processo: null, ...o }) as Licitacao;

describe('situação (seção 5)', () => {
  it.each([
    ['2026-11-03T12:00', 'Recebendo propostas'],
    ['2026-11-03', 'Recebendo propostas'],
    ['2026-11-03T11:58', 'Prazo de propostas encerrado'],
    ['2026-11-02', 'Prazo de propostas encerrado'],
    [null, 'Em andamento'],
  ])('Em Andamento com prazo %s → %s', (f, rotulo) => {
    expect(situacao(lic({ fechamento_propostas: f }), agora).rotulo).toBe(rotulo);
  });
  it.each([
    ['Encerramento', 'Encerrada'],
    ['Encerramento por falta de interessados', 'Sem vencedor'],
    ['Anulação de ofício', 'Anulada'],
    ['Revogação de ofício', 'Revogada'],
    ['Alteração do edital', 'Alteração do edital'],
  ])('%s → %s', (status, rotulo) => {
    expect(situacao(lic({ status }), agora)).toMatchObject({ rotulo, aberta: false });
  });
});

describe('ordem', () => {
  it('recebendo pelo prazo mais próximo, depois emissão mais recente', () => {
    const l = [
      lic({ codigo: 1, status: 'Encerramento', emissao: '2026-01-01' }),
      lic({ codigo: 2, fechamento_propostas: '2026-11-20' }),
      lic({ codigo: 3, status: 'Encerramento', emissao: '2026-09-01' }),
      lic({ codigo: 4, fechamento_propostas: '2026-11-05T08:59' }),
      lic({ codigo: 5, fechamento_propostas: '2026-10-01', emissao: '2026-08-01' }),
    ];
    expect(ordenar(l, agora).map((x) => x.codigo)).toEqual([4, 2, 3, 5, 1]);
  });
});

describe('busca e modalidade', () => {
  it('sem acento e sem caixa', () => {
    const l = [lic({ codigo: 1, finalidade: 'Aquisição de ARAME' }), lic({ codigo: 2, numero: 50 })];
    expect(buscar(l, 'aquisicao').map((x) => x.codigo)).toEqual([1]);
    expect(buscar(l, '50/2026').map((x) => x.codigo)).toEqual([2]);
    expect(buscar(l, '  ')).toHaveLength(2);
  });
  it('contratação direta', () => {
    expect(contratacaoDireta('(PRD) Dispensa Presencial - Lei 14.133/2021')).toBe(true);
    expect(contratacaoDireta('(PRI) INEXIGIBILIDADE - LEI 13.019')).toBe(true);
    expect(contratacaoDireta('(PCE) Pregão Eletrônico')).toBe(false);
  });
});

describe('formato', () => {
  it('reais e datas', () => {
    expect(formatBRL(1480190.36)).toBe('R$ 1.480.190,36');
    expect(formatPreco(21.038)).toBe('R$ 21,038');
    expect(formatPreco(15)).toBe('R$ 15,00');
    expect(formatDataHora('2026-11-11T08:59')).toBe('11/11/2026 às 08:59');
  });
});

describe('intervalo (D6)', () => {
  it.each([
    ['2024-08-12', '2026-10-29', '2 anos e 2 meses', false],
    ['2026-05-30', '2026-10-29', '4 meses', false],
    ['2025-10-29', '2026-10-29', '1 ano', false],
    ['2026-10-20', '2026-10-29', '9 dias', false],
    ['2026-10-29', '2026-10-29', 'no mesmo dia', false],
    ['2026-11-02', '2026-10-01', '1 mês', true],
  ])('%s → %s', (de, ate, texto, depois) => {
    expect(intervalo(de, ate)).toEqual({ texto, depois });
  });
});
