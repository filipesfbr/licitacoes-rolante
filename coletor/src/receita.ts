import type { DadosCnpj } from './tipos.ts';

// D2: dado de apoio, sempre rotulado como Receita Federal. A BrasilAPI e a Minha Receita
// respondem sem chave e no mesmo formato (testado em 03/11/2026 com matriz e filial).
const FONTES = [
  { nome: 'BrasilAPI', url: (c: string) => `https://brasilapi.com.br/api/cnpj/v1/${c}` },
  { nome: 'Minha Receita', url: (c: string) => `https://minhareceita.org/${c}` },
] as const;

const TIMEOUT_MS = 20_000;
const VALIDADE_DIAS = 30;

type Opcoes = { fetch?: typeof fetch; userAgent: string };

/** R8: só os 3 campos decididos. Sócios (`qsa`), e-mail, telefone e endereço nunca saem daqui. */
export function extrair(x: Record<string, unknown>): Pick<DadosCnpj, 'abertura' | 'situacao' | 'matriz_filial'> {
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const data = texto(x.data_inicio_atividade);
  return {
    abertura: data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null,
    situacao: texto(x.descricao_situacao_cadastral),
    matriz_filial: texto(x.descricao_identificador_matriz_filial),
  };
}

/**
 * Tenta a BrasilAPI e depois a Minha Receita. Fora do ar nas duas: `null` (o site mostra "não consultado").
 * Fonte que responde sem data de abertura só vale se a outra também não tiver: o registro fica com
 * `abertura: null` e só volta à fila depois de 30 dias, em vez de ser consultado todo dia.
 */
export async function consultar(cnpj: string, hoje: string, op: Opcoes): Promise<DadosCnpj | null> {
  const f = op.fetch ?? fetch;
  const digitos = cnpj.replace(/\D/g, '');
  let semAbertura: DadosCnpj | null = null;
  for (const fonte of FONTES) {
    try {
      const r = await f(fonte.url(digitos), { headers: { 'User-Agent': op.userAgent }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!r.ok) continue;
      const dados = extrair((await r.json()) as Record<string, unknown>);
      const registro = { ...dados, consultado_em: hoje, fonte: fonte.nome };
      if (dados.abertura) return registro;
      semAbertura ??= registro;
    } catch {
      // próxima fonte
    }
  }
  return semAbertura;
}

/**
 * Quais CNPJs consultar nesta coleta: no máximo `limite` por execução (para a coleta caber no timeout do
 * workflow). Os novos vêm primeiro; depois os já guardados e consultados há mais de 30 dias, do mais antigo
 * para o mais novo. O que sobra fica para o dia seguinte.
 */
export function paraConsultar(cnpjs: string[], guardados: Record<string, DadosCnpj>, hoje: string, limite = 60): string[] {
  const novos = cnpjs.filter((c) => !guardados[c]);
  const corte = new Date(Date.parse(hoje) - VALIDADE_DIAS * 86_400_000).toISOString().slice(0, 10);
  const vencidos = cnpjs
    .filter((c) => guardados[c] && guardados[c].consultado_em < corte)
    .sort((a, b) => guardados[a]!.consultado_em.localeCompare(guardados[b]!.consultado_em));
  return [...novos, ...vencidos].slice(0, limite);
}
