export type Fonte = {
  api: string;
  portal: string;
  portalLicitacoes: string;
  token: string;
  entidade: number;
  repositorio: string;
  userAgent: string;
  intervaloMs: number;
};

/** Linha de `ListaLicitacoes`, só com os campos usados (o portal manda 43). */
export type LicitacaoPortal = {
  codigoLicitacao: number;
  anoLicitacao: number;
  numeroLicitacao: number;
  numeroProcesso: string | null;
  descricaoModalidade: string;
  finalidade: string;
  status: string;
  dataEmissao: string;
  valorReferencia: number | null;
  total: number | null;
  orcamentoSigiloso: string | null;
  dataAberturaPropostas: number | null;
  dataFechamentoPropostas: number | null;
  horaAberturaPropostas: number | null;
  horaFechamentoPropostas: number | null;
  dataAberturaDocumentacao: string | null;
};

/** Linha de `ListaVencedoresDetalhesLicitacao`. `fornecedor` de pessoa física nunca é gravado (R8). */
export type VencedorPortal = {
  lote: number;
  sequenciaitem: number;
  fornecedor: string | null;
  documento_fornecedor: string | null;
  prd_descricao: string;
  descricao_adicional: string | null;
  unidademedida: string | null;
  valor_referencia: number | null;
  valor_vencedor: number | null;
  quantidade_item: number | null;
};

export type ItemPortal = {
  lote: number;
  sequenciaitem: number;
  prd_descricao: string;
  descricao_adicional: string | null;
  unidademedida: string | null;
  qtdademin: number | null;
  qtdademax: number | null;
  valor_referencia: number | null;
};

/** Linha de `ListaAnexosLicitacoes`. `doc` traz o arquivo em base64 (até dezenas de MB) e nunca é gravado. */
export type AnexoPortal = {
  sequencia: number;
  dataEvento: string | null;
  tipoDocumento: string | null;
  fase: string | null;
  linkPublico: string | null;
};

export type Licitacao = {
  codigo: number;
  ano: number;
  numero: number;
  processo: string | null;
  modalidade: string;
  finalidade: string;
  status: string;
  emissao: string;
  valor_referencia: number | null;
  total: number | null;
  orcamento_sigiloso: boolean;
  /** "AAAA-MM-DD" ou "AAAA-MM-DDTHH:MM" (hora nem sempre vem). */
  abertura_propostas: string | null;
  fechamento_propostas: string | null;
  abertura_documentacao: string | null;
};

/** Pessoa física: só `pessoa_fisica: true`, sem nome nem documento (D1). */
export type Vencedor = {
  lote: number;
  item: number;
  pessoa_fisica: boolean;
  fornecedor?: string;
  documento?: string;
  descricao: string;
  descricao_adicional: string | null;
  unidade: string | null;
  valor_referencia: number | null;
  valor_vencedor: number;
  quantidade: number;
};

export type Item = {
  lote: number;
  item: number;
  descricao: string;
  descricao_adicional: string | null;
  unidade: string | null;
  quantidade_min: number | null;
  quantidade_max: number | null;
  valor_referencia: number | null;
};

export type Anexo = {
  sequencia: number;
  data: string | null;
  tipo: string | null;
  fase: string | null;
  link_publico: string | null;
};

export type Detalhe = { codigo: number; vencedores: Vencedor[]; itens: Item[]; anexos: Anexo[] };

export type Alteracao = {
  detectado_em: string;
  codigo: number;
  ano: number;
  campo: 'status' | 'total' | 'valor_referencia' | 'licitacao';
  antes: string | number | null;
  depois: string | number | null;
};

/** D2: dados da Receita Federal por CNPJ (fonte de apoio, nunca altera dado do portal). */
export type DadosCnpj = {
  abertura: string | null;
  situacao: string | null;
  matriz_filial: string | null;
  consultado_em: string;
  fonte: 'BrasilAPI' | 'Minha Receita';
};
