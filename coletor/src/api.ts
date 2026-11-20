import type { AnexoPortal, Fonte, ItemPortal, LicitacaoPortal, VencedorPortal } from './tipos.ts';

type Opcoes = {
  fetch?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
};

const TENTATIVAS = 3;
// Anexos chegam com o PDF em base64: uma licitação já passou de 90 MB.
const TIMEOUT_MS = 180_000;

type Envelope<T> = { status: string | boolean; data: T | null; recordsTotal?: number };

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Filtros da tela de licitações: todos precisam ir, vazios, como string vazia (nunca o texto "null").
const FILTROS_VAZIOS = [
  'mes',
  'modalidade',
  'status',
  'finalidade',
  'licitacao',
  'fundamentolegal',
  'dispensalicitacao',
  'tipoLicitacao',
  'solicitante',
  'covid',
];

/**
 * Cliente da API Abase. Uma chamada a cada `intervaloMs` (o portal responde
 * 429/403 com reCAPTCHA quando passa disso); nesses casos espera 30 s, 60 s, 90 s.
 */
export function criarApi(fonte: Fonte, op: Opcoes = {}) {
  const f = op.fetch ?? fetch;
  const esperar = op.esperar ?? dormir;
  let primeira = true;

  async function chamar<T>(caminho: string, params: Record<string, string | number>): Promise<Envelope<T>> {
    const corpo = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    const url = new URL(caminho, fonte.api);

    for (let tentativa = 1; ; tentativa++) {
      if (!primeira) await esperar(fonte.intervaloMs);
      primeira = false;

      let resp: Response;
      let texto: string;
      try {
        resp = await f(url, {
          method: 'POST',
          headers: { 'User-Agent': fonte.userAgent, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: corpo,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        // O portal já derrubou a conexão no meio do corpo: ler aqui para o retry cobrir.
        texto = await resp.text();
      } catch (erro) {
        if (tentativa >= TENTATIVAS) throw new Error(`${caminho}: falha de rede`, { cause: erro });
        await esperar(5000 * tentativa);
        continue;
      }

      if (resp.status === 429 || resp.status === 403) {
        if (tentativa > TENTATIVAS) throw new Error(`${caminho}: portal pediu verificação (${resp.status})`);
        await esperar(30000 * tentativa);
        continue;
      }
      if (resp.status >= 500 && tentativa < TENTATIVAS) {
        await esperar(5000 * tentativa);
        continue;
      }
      if (!resp.ok) throw new Error(`${caminho}: HTTP ${resp.status}`);

      // 200 com HTML (captcha, manutenção) ou corpo truncado: mesmo retry da rede.
      let json: Envelope<T>;
      try {
        json = JSON.parse(texto) as Envelope<T>;
      } catch (erro) {
        if (tentativa >= TENTATIVAS) throw new Error(`${caminho}: resposta não é JSON`, { cause: erro });
        await esperar(5000 * tentativa);
        continue;
      }
      if (json.status !== 'success' && json.status !== true) {
        throw new Error(`${caminho}: status ${JSON.stringify(json.status)}`);
      }
      return json;
    }
  }

  /** Lista inteira numa chamada só (R2, item 1: linhas recebidas == `recordsTotal`). */
  async function lista<T>(caminho: string, params: Record<string, string | number>, rotulo: string): Promise<T[]> {
    const r = await chamar<T[]>(caminho, { token: fonte.token, draw: 1, start: 0, length: 20000, ...params });
    const linhas = r.data ?? [];
    if (linhas.length !== (r.recordsTotal ?? 0)) {
      throw new Error(`${rotulo}: vieram ${linhas.length} de ${r.recordsTotal} linhas`);
    }
    return linhas;
  }

  const detalhe = <T>(endpoint: string, codigo: number) =>
    lista<T>(`Usuario/Licitacao/${endpoint}`, { codigo }, `${endpoint} ${codigo}`);

  return {
    licitacoes: (ano: number) =>
      lista<LicitacaoPortal>(
        'Usuario/Licitacao/ListaLicitacoes',
        { ano, entidade: fonte.entidade, ...Object.fromEntries(FILTROS_VAZIOS.map((k) => [k, ''])) },
        `ListaLicitacoes ${ano}`,
      ),
    vencedores: (codigo: number) => detalhe<VencedorPortal>('ListaVencedoresDetalhesLicitacao', codigo),
    itens: (codigo: number) => detalhe<ItemPortal>('ListaItensDetalhesLicitacao', codigo),
    anexos: (codigo: number) => detalhe<AnexoPortal>('ListaAnexosLicitacoes', codigo),
  };
}
