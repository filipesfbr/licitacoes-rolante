import type {
  Anexo,
  AnexoPortal,
  Item,
  ItemPortal,
  Licitacao,
  LicitacaoPortal,
  Vencedor,
  VencedorPortal,
} from './tipos.ts';
import { CPF_MASCARADO } from './validar.ts';

// Os campos do portal são copiados um a um (lista de permitidos): campo novo na API nunca chega ao repositório.

// CPF solto, formatado ou só dígitos. Os vizinhos não podem ser dígito, ponto, barra ou hífen,
// para não pegar pedaço de CNPJ formatado ("12.345.678/0001-90") nem de número maior.
const CPF_SOLTO = /(?<![\d./-])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?![\d./-])/g;

/** R8: número de CPF dentro de um texto é mascarado inteiro, sem dígitos (D1, D5). */
export const mascararCpf = (s: string) => s.replace(CPF_SOLTO, '***.***.***-**');

/** Todo texto livre do portal passa por aqui: descrição de item pode trazer CPF digitado à mão. */
const texto = (s: string | null) => (s === null ? null : mascararCpf(s));

// O portal conta datas em dias desde 28/12/1800 e horas em centésimos de segundo; 0 = sem data.
const EPOCA = Date.UTC(1800, 11, 28);

export function dataHora(dias: number | null, centesimos: number | null): string | null {
  if (!dias) return null;
  const data = new Date(EPOCA + dias * 86_400_000).toISOString().slice(0, 10);
  if (!centesimos) return data;
  const min = Math.floor(centesimos / 6000);
  return `${data}T${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** "30/10/2026 09:00:00" → "2026-10-30T09:00". */
function dataBr(s: string | null): string | null {
  const m = s && /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}` : null;
}

export const licitacao = (x: LicitacaoPortal): Licitacao => ({
  codigo: x.codigoLicitacao,
  ano: x.anoLicitacao,
  numero: x.numeroLicitacao,
  processo: texto(x.numeroProcesso),
  modalidade: mascararCpf(x.descricaoModalidade),
  finalidade: mascararCpf(x.finalidade),
  status: x.status,
  emissao: x.dataEmissao.slice(0, 10),
  valor_referencia: x.valorReferencia,
  total: x.total,
  orcamento_sigiloso: x.orcamentoSigiloso === 'S',
  abertura_propostas: dataHora(x.dataAberturaPropostas, x.horaAberturaPropostas),
  fechamento_propostas: dataHora(x.dataFechamentoPropostas, x.horaFechamentoPropostas),
  abertura_documentacao: dataBr(x.dataAberturaDocumentacao),
});

/** Só depois da R2 (quantidade, valor e documento já conferidos). Pessoa física: sem nome e sem documento (D1). */
export function vencedor(x: VencedorPortal): Vencedor {
  const pessoaFisica = CPF_MASCARADO.test(x.documento_fornecedor ?? '');
  return {
    lote: x.lote,
    item: x.sequenciaitem,
    pessoa_fisica: pessoaFisica,
    ...(pessoaFisica ? {} : { fornecedor: mascararCpf(x.fornecedor ?? ''), documento: x.documento_fornecedor! }),
    descricao: mascararCpf(x.prd_descricao),
    descricao_adicional: texto(x.descricao_adicional),
    unidade: texto(x.unidademedida),
    valor_referencia: x.valor_referencia,
    valor_vencedor: x.valor_vencedor!,
    quantidade: x.quantidade_item!,
  };
}

export const item = (x: ItemPortal): Item => ({
  lote: x.lote,
  item: x.sequenciaitem,
  descricao: mascararCpf(x.prd_descricao),
  descricao_adicional: texto(x.descricao_adicional),
  unidade: texto(x.unidademedida),
  quantidade_min: x.qtdademin,
  quantidade_max: x.qtdademax,
  valor_referencia: x.valor_referencia,
});

/** Sem o nome do arquivo (pode trazer nome de pessoa) e sem o arquivo em base64. */
export const anexo = (x: AnexoPortal): Anexo => ({
  sequencia: x.sequencia,
  data: x.dataEvento?.slice(0, 10) ?? null,
  tipo: x.tipoDocumento,
  fase: x.fase,
  link_publico: x.linkPublico,
});
