import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Alteracao, DadosCnpj, Detalhe as DetalheDados, Licitacao, Vencedor } from '../../../coletor/src/tipos.ts';
import type { Dados } from '../App.tsx';
import { formatBRL, formatDataHora, formatDate, formatPreco, formatQtd, intervalo } from '../lib/format.ts';
import { contratacaoDireta, leilao, situacao } from '../lib/situacao.ts';
import { Coletado, IcoVoltar, LinkExterno, PilulaSituacao, textoDeHtml } from './ui.tsx';

// Abre o visualizador de PDF do portal (testado no navegador em 03/11/2026).
const linkDocumento = (guid: string) => `https://gedapi.abase.com.br/Ged/docPublico?RowGuid=${encodeURIComponent(guid)}`;

// A tela de licitações lê os filtros da URL (testado em 03/11/2026). O número se repete entre
// modalidades, então o portal mostra todas as licitações com esse número no ano.
const linkPortal = (base: string, l: Licitacao) =>
  `${base}?${new URLSearchParams({ ano: String(l.ano), 'numero-licitacao': String(l.numero), entidade: '0' })}`;

type Grupo = { chave: string; nome: string; documento?: string; linhas: Vencedor[] };

/** Empresas agrupadas pelo CNPJ. Pessoas físicas não são identificadas (D1): ficam todas num grupo só. */
function agrupar(vencedores: Vencedor[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const v of vencedores) {
    const chave = v.pessoa_fisica ? 'pf' : v.documento!;
    const g = grupos.get(chave) ?? {
      chave,
      nome: v.pessoa_fisica ? 'Pessoa física' : v.fornecedor!,
      ...(v.pessoa_fisica ? {} : { documento: v.documento! }),
      linhas: [],
    };
    g.linhas.push(v);
    grupos.set(chave, g);
  }
  return [...grupos.values()];
}

function Descricao({ texto, extra }: { texto: string; extra: string | null }) {
  const adicional = textoDeHtml(extra);
  return (
    <>
      <span className="it-d">{texto}</span>
      {adicional && <span className="it-a">{adicional}</span>}
    </>
  );
}

const POR_PAGINA = 10;

/** Lista de itens que mostra 10 por vez, para o cartão não virar uma parede (Chamada Pública passa de 50). */
function ItensPaginados<T>({ itens, linha }: { itens: T[]; linha: (x: T) => ReactNode }) {
  const [limite, setLimite] = useState(POR_PAGINA);
  const resto = itens.length - limite;
  return (
    <>
      <ul className="itens">
        {itens.slice(0, limite).map((x, i) => (
          <li key={i}>{linha(x)}</li>
        ))}
      </ul>
      {resto > 0 && (
        <p className="mais-itens">
          <button type="button" className="btn2" onClick={() => setLimite(limite + POR_PAGINA)}>
            Mostrar mais {Math.min(POR_PAGINA, resto)}
          </button>
          <span className="d">
            {limite} de {itens.length} itens
          </span>
        </p>
      )}
    </>
  );
}

/** D2 e D6: outra fonte, sempre rotulada e separada do portal. Só o fato, sem selo nem alerta. */
function Receita({ dados, emissao }: { dados: DadosCnpj | undefined; emissao: string }) {
  if (!dados?.abertura) return null;
  const t = intervalo(dados.abertura, emissao);
  return (
    <p className="receita d" style={{ marginBottom: 12 }}>
      <span className="rot">Receita Federal · consultado em {formatDate(dados.consultado_em)}</span>
      Aberta em {formatDate(dados.abertura)}
      {t.texto === 'no mesmo dia' ? ', no dia da emissão da licitação' : `, ${t.texto} ${t.depois ? 'depois' : 'antes'} da emissão da licitação`}
      {dados.situacao && <> · {dados.situacao}</>}
      {dados.matriz_filial && <> · {dados.matriz_filial}</>}
    </p>
  );
}

const nItens = (n: number) => `${n} ${n === 1 ? 'item' : 'itens'}`;

/** Uma empresa: linha compacta com «Ver itens»; os itens só entram na página quando abre. */
function Empresa({ g, l, cnpj, unico }: { g: Grupo; l: Licitacao; cnpj: Record<string, DadosCnpj> | null; unico: boolean }) {
  const [aberto, setAberto] = useState(unico);
  const nome = g.chave === 'pf' && g.linhas.length > 1 ? 'Pessoas físicas' : g.nome;
  return (
    <details className="panel mais grupo" open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary>
        <span className="grupo-id">
          <span className="grupo-n">{nome}</span>
          <span className="d num">
            {g.documento && <>CNPJ {g.documento} · </>}
            {nItens(g.linhas.length)}
          </span>
        </span>
        <span className="grupo-fim">
          {/* Com um só vencedor, o total do portal é o valor dele; com vários, não há subtotal calculado. */}
          {unico && l.total ? <span className="grupo-v num">{formatBRL(l.total)}</span> : null}
          <span className="ver">{aberto ? 'Ocultar itens' : 'Ver itens'}</span>
        </span>
      </summary>
      {aberto && (
        <div className="grupo-c">
          {g.documento && cnpj && <Receita dados={cnpj[g.documento]} emissao={l.emissao} />}
          <ItensPaginados
            itens={g.linhas}
            linha={(v) => (
              <>
                <span className="it-n num">
                  {v.lote ? `Lote ${v.lote} · ` : ''}Item {v.item}
                </span>
                <Descricao texto={v.descricao} extra={v.descricao_adicional} />
                <span className="it-q num">
                  {formatQtd(v.quantidade)} {v.unidade ?? ''} × {formatPreco(v.valor_vencedor)}
                  {v.valor_referencia ? <span className="d"> · referência {formatPreco(v.valor_referencia)}</span> : null}
                </span>
              </>
            )}
          />
        </div>
      )}
    </details>
  );
}

function Vencedores({ l, vencedores, cnpj }: { l: Licitacao; vencedores: Vencedor[]; cnpj: Record<string, DadosCnpj> | null }) {
  const grupos = agrupar(vencedores);
  const pfs = grupos.find((g) => g.chave === 'pf');
  const unico = grupos.length === 1 && !pfs;
  return (
    <section className="bloco-d" aria-labelledby="t-venc">
      <h2 className="h3" id="t-venc">
        {unico ? 'Vencedor' : 'Vencedores'} <span className="n d">({grupos.length})</span>
      </h2>
      {pfs && (
        <p className="d" style={{ marginBottom: 16 }}>
          Vencedores pessoa física não são identificados neste site. O nome está no portal.
        </p>
      )}
      <div className="grupos">
        {grupos.map((g) => (
          <Empresa key={g.chave} g={g} l={l} cnpj={cnpj} unico={unico} />
        ))}
      </div>
    </section>
  );
}

/** Seção que abre e fecha: a linha toda é o botão, com a contagem no título. */
function Secao({ titulo, n, aberta, id, children }: { titulo: string; n: number; aberta?: boolean; id?: string; children: ReactNode }) {
  return (
    <section className="bloco-d" aria-labelledby={id}>
      <details className="panel mais sec" open={aberta}>
        <summary id={id}>
          <span>
            {titulo} <span className="n">({n})</span>
          </span>
        </summary>
        <div>{children}</div>
      </details>
    </section>
  );
}

function Itens({ itens, aberto }: { itens: DetalheDados['itens']; aberto: boolean }) {
  if (!itens.length) return null;
  const lista = (
    <ItensPaginados
      itens={itens}
      linha={(it) => (
        <>
          <span className="it-n num">
            {it.lote ? `Lote ${it.lote} · ` : ''}Item {it.item}
          </span>
          <Descricao texto={it.descricao} extra={it.descricao_adicional} />
          <span className="it-q num">
            {it.quantidade_max !== null && (
              <>
                {formatQtd(it.quantidade_max)} {it.unidade ?? ''}
              </>
            )}
            {it.valor_referencia ? <span className="d"> · referência {formatPreco(it.valor_referencia)}</span> : null}
          </span>
        </>
      )}
    />
  );
  return (
    <Secao titulo="Itens pedidos" n={itens.length} aberta={aberto}>
      {lista}
    </Secao>
  );
}

const CAMPO: Record<Alteracao['campo'], string> = {
  status: 'Status',
  total: 'Valor dos vencedores',
  valor_referencia: 'Valor de referência',
  licitacao: 'Licitação',
};
const valorAlterado = (campo: Alteracao['campo'], v: string | number | null) =>
  v === null ? (campo === 'licitacao' ? 'removida do portal' : 'vazio') : typeof v === 'number' ? formatBRL(v) : v;

export function Detalhe({ dados, codigo }: { dados: Dados; codigo: number }) {
  const { manifest, listas } = dados;
  const l = useMemo(() => Object.values(listas).flat().find((x) => x.codigo === codigo), [listas, codigo]);
  const [det, setDet] = useState<DetalheDados | null>(null);
  const [hist, setHist] = useState<Alteracao[]>([]);
  const [cnpj, setCnpj] = useState<Record<string, DadosCnpj> | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!l) return;
    setDet(null);
    setErro(false);
    fetch(`dados/detalhes/${codigo}.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setDet)
      .catch(() => setErro(true));
    fetch('dados/historico-alteracoes.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : []))
      .then((h: Alteracao[]) => setHist(h.filter((a) => a.codigo === codigo)))
      .catch(() => setHist([]));
    // Sem o arquivo (coleta antiga ou falha), cada empresa mostra "não consultados".
    fetch('dados/cnpj.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .then(setCnpj)
      .catch(() => setCnpj({}));
  }, [l, codigo]);

  useEffect(() => {
    if (l) document.title = `Licitação nº ${l.numero}/${l.ano} · Licitações Rolante`;
    return () => {
      document.title = 'Licitações Rolante';
    };
  }, [l]);

  const voltar = (
    <a className="voltar" href="#/">
      <IcoVoltar /> Todas as licitações
    </a>
  );

  if (!l) {
    return (
      <section className="hero">
        {voltar}
        <div className="msg info" style={{ marginTop: 20 }}>
          <p>
            Esta licitação não está entre as de {manifest.anos.join(' e ')} coletadas do portal. O endereço pode estar errado, ou a licitação
            ser de outro ano ou ter sido retirada do portal.
          </p>
        </div>
      </section>
    );
  }

  const s = situacao(l, Date.now());
  const valorReferencia = l.valor_referencia ? formatBRL(l.valor_referencia) : l.orcamento_sigiloso ? 'Sigiloso' : 'Não informado';
  const semVencedor = det && !det.vencedores.length && !s.aberta && l.status === 'Encerramento';

  return (
    <article className="hero">
      {voltar}
      <span className="eyebrow" style={{ display: 'flex', marginTop: 24 }}>
        {l.modalidade}
      </span>
      <h1 className="h1 num">
        Licitação nº {l.numero}/{l.ano}
      </h1>
      <PilulaSituacao s={s} status={l.status} />
      {contratacaoDireta(l.modalidade) && <p className="d" style={{ marginTop: 12 }}>Contratação direta, sem licitação.</p>}

      <section className="bloco-d" aria-labelledby="t-obj">
        <h2 className="rot" id="t-obj">
          Objeto
        </h2>
        <p className="objeto">{textoDeHtml(l.finalidade)}</p>
      </section>

      <dl className="dados">
        <div>
          <dt>{l.total ? (leilao(l.modalidade) ? 'Valor dos vencedores (leilão)' : 'Valor dos vencedores') : 'Valor de referência'}</dt>
          <dd className="num">{l.total ? formatBRL(l.total) : valorReferencia}</dd>
        </div>
        <div>
          <dt>Emissão</dt>
          <dd className="num">{formatDate(l.emissao)}</dd>
        </div>
        {l.fechamento_propostas && (
          <div>
            <dt>Propostas até</dt>
            <dd className="num">{formatDataHora(l.fechamento_propostas)}</dd>
          </div>
        )}
      </dl>
      {(l.total || l.abertura_propostas || l.abertura_documentacao || l.processo) && (
        <details className="panel mais sec" style={{ marginTop: 20 }}>
          <summary>Mais detalhes</summary>
          <dl className="dados" style={{ margin: 0, padding: '16px 20px 20px', border: 0 }}>
            {l.total ? (
              <div>
                <dt>Valor de referência</dt>
                <dd className="num">{valorReferencia}</dd>
              </div>
            ) : null}
            {l.abertura_propostas && (
              <div>
                <dt>Propostas a partir de</dt>
                <dd className="num">{formatDataHora(l.abertura_propostas)}</dd>
              </div>
            )}
            {l.abertura_documentacao && (
              <div>
                <dt>Abertura da documentação</dt>
                <dd className="num">{formatDataHora(l.abertura_documentacao)}</dd>
              </div>
            )}
            {l.processo && (
              <div>
                <dt>Processo</dt>
                <dd className="num">{l.processo}</dd>
              </div>
            )}
          </dl>
        </details>
      )}

      {erro && (
        <div className="msg err" role="alert" style={{ marginTop: 32 }}>
          <p>Não conseguimos carregar os vencedores, itens e documentos desta licitação. Tente recarregar a página.</p>
        </div>
      )}
      {!det && !erro && <div className="sk" style={{ height: 160, marginTop: 32 }} aria-busy="true" aria-label="Carregando o detalhe" />}
      {det && (
        <>
          {det.vencedores.length > 0 && <Vencedores l={l} vencedores={det.vencedores} cnpj={cnpj} />}
          {semVencedor && (
            <div className="msg info" style={{ marginTop: 32 }}>
              <p>Encerrada sem vencedor informado no portal.</p>
            </div>
          )}
          <Itens itens={det.itens} aberto={!det.vencedores.length} />
          {det.anexos.length > 0 && (
            <Secao titulo="Documentos" n={det.anexos.length} id="t-docs">
              <ul className="docs">
                {det.anexos.map((a) => (
                  <li key={a.sequencia}>
                    <span>
                      <span className="doc-t">{a.tipo ?? 'Documento'}</span>
                      <span className="d">{[a.fase, a.data && formatDate(a.data)].filter(Boolean).join(' · ')}</span>
                    </span>
                    {a.link_publico && <LinkExterno href={linkDocumento(a.link_publico)}>abrir</LinkExterno>}
                  </li>
                ))}
              </ul>
            </Secao>
          )}
        </>
      )}

      {hist.length > 0 && (
        <Secao titulo="Alterações no portal" n={hist.length} id="t-hist">
          <ul className="hist">
            {hist.map((a, i) => (
              <li key={i}>
                <span className="num">{formatDate(a.detectado_em)}</span> · {CAMPO[a.campo]}: {valorAlterado(a.campo, a.antes)} →{' '}
                {valorAlterado(a.campo, a.depois)}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <div className="src" style={{ marginTop: 32 }}>
        <span>Fonte: Portal da Transparência de Rolante ·</span>
        <Coletado em={manifest.coletado_em} />
        <span>·</span>
        <LinkExterno href={linkPortal(manifest.fonte.portalLicitacoes, l)}>
          conferir no portal (nº {l.numero}/{l.ano})
        </LinkExterno>
      </div>
    </article>
  );
}
