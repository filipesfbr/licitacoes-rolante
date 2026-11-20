import { describe, expect, it } from 'vitest';
import { criarApi } from '../src/api.ts';
import { alteracoes } from '../src/historico.ts';
import { anexo, dataHora, item, licitacao, mascararCpf, vencedor } from '../src/normalizar.ts';
import type { Fonte, Licitacao, LicitacaoPortal, VencedorPortal } from '../src/tipos.ts';
import { consultar, extrair, paraConsultar } from '../src/receita.ts';
import { escalar, somaCentavos, validarLicitacao } from '../src/validar.ts';

// Dados sintéticos: nenhum nome, CPF ou CNPJ real.
const pj = (o: Partial<VencedorPortal> = {}): VencedorPortal => ({
  lote: 0,
  sequenciaitem: 1,
  fornecedor: 'EMPRESA FICTICIA LTDA',
  documento_fornecedor: '11.222.333/0001-81',
  prd_descricao: 'ITEM DE TESTE',
  descricao_adicional: '',
  unidademedida: 'UN',
  valor_referencia: 10,
  valor_vencedor: 9.5,
  quantidade_item: 2,
  ...o,
});
const pf = (o: Partial<VencedorPortal> = {}) =>
  pj({ fornecedor: 'NOME FICTICIO DE PESSOA', documento_fornecedor: '***.***.***-72', ...o });

describe('decimal exato', () => {
  it('não passa por float', () => {
    expect(somaCentavos([{ quantidade_item: 3, valor_vencedor: 0.1 }])).toBe(30n);
    expect(escalar(0.1) + escalar(0.2)).toBe(escalar(0.3));
  });
  it('arredonda só no fim, meio para cima', () => {
    // 62123,185 → 62123,19 (caso visto no portal)
    expect(somaCentavos([{ quantidade_item: 1, valor_vencedor: 62123.185 }])).toBe(6212319n);
    expect(somaCentavos([{ quantidade_item: 25, valor_vencedor: 21.038 }])).toBe(52595n);
  });
});

describe('validar (R2)', () => {
  const lic = (total: number | null) => ({ codigoLicitacao: 1, total });

  it('confere quando a soma bate com o total', () => {
    expect(validarLicitacao(lic(19 + 3), [pj(), pf({ quantidade_item: 1, valor_vencedor: 3 })])).toEqual([]);
  });
  it('1 centavo de diferença falha', () => {
    expect(validarLicitacao(lic(19.01), [pj()])).toHaveLength(1);
  });
  it('linhas repetidas não são deduplicadas', () => {
    expect(validarLicitacao(lic(38), [pf(), pf()])).toEqual([]);
  });
  it('sem total e sem vencedor confere; total sem vencedor falha', () => {
    expect(validarLicitacao(lic(null), [])).toEqual([]);
    expect(validarLicitacao(lic(0), [])).toEqual([]);
    expect(validarLicitacao(lic(10), [])).toHaveLength(1);
  });
  it.each([
    ['quantidade nula', { quantidade_item: null }],
    ['quantidade zero', { quantidade_item: 0 }],
    ['valor negativo', { valor_vencedor: -1 }],
    ['documento vazio', { documento_fornecedor: '' }],
    ['CPF sem máscara', { documento_fornecedor: '123.456.789-09' }],
    ['CNPJ sem formato', { documento_fornecedor: '11222333000181' }],
  ])('%s falha', (_, o) => {
    expect(validarLicitacao(lic(19), [pj(o)]).length).toBeGreaterThan(0);
  });
  describe('quantidade zero', () => {
    const zero = pj({ sequenciaitem: 7, quantidade_item: 0 });
    const item = (o: { lote?: number; sequenciaitem?: number; qtdademax: number | null }) => ({ lote: 0, sequenciaitem: 7, ...o });
    it('passa quando o item do portal tem quantidade máxima 0', () => {
      expect(validarLicitacao(lic(19), [pj(), zero], [item({ qtdademax: 0 })])).toEqual([]);
    });
    it('falha quando o item tem quantidade máxima maior que 0', () => {
      expect(validarLicitacao(lic(19), [pj(), zero], [item({ qtdademax: 5 })])).toHaveLength(1);
    });
    it('falha quando a quantidade máxima do item é nula', () => {
      expect(validarLicitacao(lic(19), [pj(), zero], [item({ qtdademax: null })])).toHaveLength(1);
    });
    it('falha quando o item é de outro lote ou outra sequência', () => {
      expect(validarLicitacao(lic(19), [pj(), zero], [item({ lote: 1, qtdademax: 0 }), item({ sequenciaitem: 8, qtdademax: 0 })])).toHaveLength(1);
    });
    it('quantidade nula ou negativa falha mesmo com o item em 0', () => {
      expect(validarLicitacao(lic(19), [pj(), pj({ sequenciaitem: 7, quantidade_item: -1 })], [item({ qtdademax: 0 })])).toHaveLength(1);
      expect(validarLicitacao(lic(19), [pj(), pj({ sequenciaitem: 7, quantidade_item: null })], [item({ qtdademax: 0 })])).toHaveLength(1);
    });
  });
  it('a mensagem de erro nunca traz o documento', () => {
    const [erro] = validarLicitacao(lic(19), [pj({ documento_fornecedor: '123.456.789-09' })]);
    expect(erro).not.toContain('789');
  });
});

describe('privacidade (R8)', () => {
  it('pessoa física fica sem nome e sem documento', () => {
    const v = vencedor(pf());
    expect(v.pessoa_fisica).toBe(true);
    const saida = JSON.stringify(v);
    expect(saida).not.toContain('NOME FICTICIO');
    expect(saida).not.toContain('-72');
    expect(Object.keys(v)).not.toContain('fornecedor');
  });
  it('empresa mantém nome e CNPJ, com CPF do nome mascarado', () => {
    const v = vencedor(pj({ fornecedor: 'FULANO MEI 12345678909' }));
    expect(v).toMatchObject({ pessoa_fisica: false, fornecedor: 'FULANO MEI ***.***.***-**', documento: '11.222.333/0001-81' });
  });
  it.each([
    ['123.456.789-09', '***.***.***-**'],
    ['ABC 12345678909 LTDA', 'ABC ***.***.***-** LTDA'],
    ['CNPJ 11.222.333/0001-81', 'CNPJ 11.222.333/0001-81'],
    ['PROCESSO 2026/123456789012', 'PROCESSO 2026/123456789012'],
  ])('mascararCpf(%s)', (entrada, saida) => {
    expect(mascararCpf(entrada)).toBe(saida);
  });
  it('CPF em descrição de item e de vencedor é mascarado', () => {
    const portal = pj({ prd_descricao: 'ENTREGAR A JOAO CPF 123.456.789-09', descricao_adicional: 'RETIRAR COM 12345678909' });
    expect(vencedor(portal)).toMatchObject({ descricao: 'ENTREGAR A JOAO CPF ***.***.***-**', descricao_adicional: 'RETIRAR COM ***.***.***-**' });
    const i = item({ ...portal, qtdademin: 1, qtdademax: 1 } as never);
    expect(JSON.stringify(i)).not.toMatch(/789/);
  });
  it('anexo sem nome de arquivo nem base64', () => {
    const a = anexo({ sequencia: 1, dataEvento: '2026-06-12T00:00:00', tipoDocumento: 'ETP', fase: 'Fase Interna', linkPublico: 'x', nomeDoc: 'NOME.pdf', doc: 'AAAA' } as never);
    expect(a).toEqual({ sequencia: 1, data: '2026-06-12', tipo: 'ETP', fase: 'Fase Interna', link_publico: 'x' });
  });
});

describe('datas do portal', () => {
  it('dias desde 28/12/1800 e hora em centésimos de segundo', () => {
    expect(dataHora(82498, 3234000)).toBe('2026-11-11T08:59');
    expect(dataHora(82498, null)).toBe('2026-11-11');
    expect(dataHora(0, 2880000)).toBeNull();
  });
  it('licitação: só campos permitidos, texto como vem', () => {
    const bruta = {
      codigoLicitacao: 9, anoLicitacao: 2026, numeroLicitacao: 50, numeroProcesso: '175',
      descricaoModalidade: '(PCE) Pregão Eletrônico', finalidade: 'Aquisição de  ARAME', status: 'Em Andamento',
      dataEmissao: '2026-10-29T00:00:00', valorReferencia: 100, total: null, orcamentoSigiloso: 'N',
      dataAberturaPropostas: 82483, dataFechamentoPropostas: 82498, horaAberturaPropostas: 2880000,
      horaFechamentoPropostas: 3234000, dataAberturaDocumentacao: '11/11/2026 09:00:00', nomeGanhador: 'X',
    } as LicitacaoPortal;
    const l = licitacao(bruta);
    expect(l).toMatchObject({ finalidade: 'Aquisição de  ARAME', emissao: '2026-10-29', fechamento_propostas: '2026-11-11T08:59', abertura_documentacao: '2026-11-11T09:00' });
    expect(JSON.stringify(l)).not.toContain('nomeGanhador');
  });
});

describe('histórico (R5)', () => {
  const base = { codigo: 1, ano: 2026, status: 'Em Andamento', total: null, valor_referencia: 100 } as Licitacao;
  it('registra status, valor e licitação removida', () => {
    const outra = { ...base, codigo: 2 };
    expect(alteracoes([base, outra], [{ ...base, status: 'Encerramento', total: 90 }], '2026-11-03')).toEqual([
      { detectado_em: '2026-11-03', codigo: 1, ano: 2026, campo: 'status', antes: 'Em Andamento', depois: 'Encerramento' },
      { detectado_em: '2026-11-03', codigo: 1, ano: 2026, campo: 'total', antes: null, depois: 90 },
      { detectado_em: '2026-11-03', codigo: 2, ano: 2026, campo: 'licitacao', antes: 'presente', depois: null },
    ]);
  });
  it('sem mudança, sem entrada', () => {
    expect(alteracoes([base], [base], '2026-11-03')).toEqual([]);
  });
});

describe('api', () => {
  const fonte = { api: 'https://exemplo.invalid/', token: 't', entidade: 0, userAgent: 'teste', intervaloMs: 0 } as Fonte;
  const resposta = (corpo: unknown) => async () => new Response(JSON.stringify(corpo));

  it('falha se vierem menos linhas que recordsTotal (R2, item 1)', async () => {
    const api = criarApi(fonte, { fetch: resposta({ status: 'success', data: [{}], recordsTotal: 2 }), esperar: async () => {} });
    await expect(api.vencedores(1)).rejects.toThrow('vieram 1 de 2');
  });
  it('corpo não JSON tenta de novo e depois falha com o nome da chamada', async () => {
    let chamadas = 0;
    const html = (async () => (chamadas++, new Response('<html>manutenção</html>'))) as typeof fetch;
    const api = criarApi(fonte, { fetch: html, esperar: async () => {} });
    await expect(api.itens(1)).rejects.toThrow('ListaItensDetalhesLicitacao: resposta não é JSON');
    expect(chamadas).toBe(3);

    let n = 0;
    const depois = (async () => new Response(n++ ? JSON.stringify({ status: true, data: [], recordsTotal: 0 }) : '<html>')) as typeof fetch;
    await expect(criarApi(fonte, { fetch: depois, esperar: async () => {} }).itens(1)).resolves.toEqual([]);
  });
  it('data nula com recordsTotal 0 é lista vazia', async () => {
    const api = criarApi(fonte, { fetch: resposta({ status: true, data: null, recordsTotal: 0 }), esperar: async () => {} });
    await expect(api.itens(1)).resolves.toEqual([]);
  });
});

describe('Receita (D2)', () => {
  const resposta = {
    data_inicio_atividade: '2024-08-12',
    descricao_situacao_cadastral: 'ATIVA',
    descricao_identificador_matriz_filial: 'FILIAL',
    qsa: [{ nome_socio: 'NOME FICTICIO' }],
    email: 'x@exemplo.invalid',
    ddd_telefone_1: '5100000000',
    logradouro: 'RUA FICTICIA',
  };

  it('guarda só abertura, situação e matriz/filial (R8)', () => {
    expect(extrair(resposta)).toEqual({ abertura: '2024-08-12', situacao: 'ATIVA', matriz_filial: 'FILIAL' });
    expect(JSON.stringify(extrair(resposta))).not.toMatch(/FICTICI|exemplo|5100/);
  });
  it('cai para a Minha Receita quando a BrasilAPI falha; as duas fora do ar dão null', async () => {
    const urls: string[] = [];
    const f = (async (url: string) => {
      urls.push(String(url));
      return String(url).includes('brasilapi') ? new Response('', { status: 503 }) : new Response(JSON.stringify(resposta));
    }) as typeof fetch;
    expect(await consultar('11.222.333/0001-81', '2026-11-03', { fetch: f, userAgent: 't' })).toMatchObject({ fonte: 'Minha Receita', abertura: '2024-08-12' });
    expect(urls[1]).toBe('https://minhareceita.org/11222333000181');
    const fora = (async () => new Response('', { status: 500 })) as typeof fetch;
    expect(await consultar('11.222.333/0001-81', '2026-11-03', { fetch: fora, userAgent: 't' })).toBeNull();
  });
  it('resposta sem data de abertura vira registro com abertura nula, se nenhuma fonte tiver a data', async () => {
    const sem = (async () => new Response(JSON.stringify({ descricao_situacao_cadastral: 'ATIVA' }))) as typeof fetch;
    expect(await consultar('11.222.333/0001-81', '2026-11-03', { fetch: sem, userAgent: 't' })).toMatchObject({
      abertura: null,
      situacao: 'ATIVA',
      fonte: 'BrasilAPI',
    });
    const segunda = (async (url: string) =>
      new Response(JSON.stringify(String(url).includes('brasilapi') ? {} : resposta))) as typeof fetch;
    expect(await consultar('11.222.333/0001-81', '2026-11-03', { fetch: segunda, userAgent: 't' })).toMatchObject({
      fonte: 'Minha Receita',
      abertura: '2024-08-12',
    });
  });
  it('consulta os novos primeiro e depois os vencidos mais antigos, no máximo `limite` no total', () => {
    const g = (consultado_em: string) => ({ abertura: '2020-01-01', situacao: 'ATIVA', matriz_filial: 'MATRIZ', consultado_em, fonte: 'BrasilAPI' as const });
    const guardados = { a: g('2026-11-01'), b: g('2026-09-01'), c: g('2026-08-01') };
    expect(paraConsultar(['a', 'b', 'c', 'd'], guardados, '2026-11-03', 1)).toEqual(['d']);
    expect(paraConsultar(['a', 'b', 'c', 'd'], guardados, '2026-11-03', 3)).toEqual(['d', 'c', 'b']);
  });
});
