import { useMemo, useState } from 'react';
import type { Licitacao } from '../../../coletor/src/tipos.ts';
import type { Dados } from '../App.tsx';
import { formatBRL, formatDataHora, formatDate, formatInt } from '../lib/format.ts';
import { buscar, ordenar, situacao, type Situacao } from '../lib/situacao.ts';
import { Origem } from './Origem.tsx';
import { Coletado, IcoBusca, PilulaSituacao, Seg, textoDeHtml } from './ui.tsx';

type Filtro = 'todas' | 'recebendo' | 'andamento' | 'encerradas' | 'outras';

// Contadores que também filtram a lista (seção 5 do plano).
const PARTES: { id: Exclude<Filtro, 'todas'>; nome: string; chip: string; tem: (s: Situacao) => boolean }[] = [
  { id: 'recebendo', nome: 'recebendo propostas', chip: 'Recebendo propostas', tem: (s) => s.recebendo },
  { id: 'andamento', nome: 'em andamento, sem receber propostas', chip: 'Em andamento', tem: (s) => s.aberta && !s.recebendo },
  { id: 'encerradas', nome: 'encerradas', chip: 'Encerradas', tem: (s) => s.rotulo === 'Encerrada' },
  { id: 'outras', nome: 'sem vencedor, anuladas, revogadas ou outro status', chip: 'Outras', tem: (s) => !s.aberta && s.rotulo !== 'Encerrada' },
];
const PAGINA = 30;

/** Valor do cartão: com vencedor, o `total` do portal (R9: nunca "gasto"); sem, a referência. */
function valorDoCartao(l: Licitacao): { curto: string; completo: string; valor: string } | null {
  if (l.total) return { curto: 'Vencedores', completo: 'Valor dos vencedores', valor: formatBRL(l.total) };
  if (l.valor_referencia) return { curto: 'Referência', completo: 'Valor de referência', valor: formatBRL(l.valor_referencia) };
  if (l.orcamento_sigiloso) return { curto: 'Referência', completo: 'Valor de referência', valor: 'Sigiloso' };
  return null;
}

function Cartao({ l, s }: { l: Licitacao; s: Situacao }) {
  const v = valorDoCartao(l);
  const prazo = s.recebendo && l.fechamento_propostas;
  return (
    <li>
      <a className="card" href={`#/licitacao/${l.codigo}`}>
        <div className="card-t">
          <span className="card-n num">
            Nº {l.numero}/{l.ano}
          </span>
          <PilulaSituacao s={s} status={l.status} curta />
        </div>
        <p className="card-m">{l.modalidade}</p>
        <p className="card-o">{textoDeHtml(l.finalidade)}</p>
        <div className="card-b">
          <span className="card-d">
            {prazo ? 'Propostas até' : 'Emissão'} <b className="num">{prazo ? formatDataHora(l.fechamento_propostas!) : formatDate(l.emissao)}</b>
          </span>
          {v && (
            <span className="card-d card-v" aria-label={`${v.completo}: ${v.valor}`}>
              <span aria-hidden="true">
                {v.curto} <b className="num">{v.valor}</b>
              </span>
            </span>
          )}
          <span className="card-seta" aria-hidden="true">
            ›
          </span>
        </div>
      </a>
    </li>
  );
}

export function Lista({ dados }: { dados: Dados }) {
  const { manifest, listas } = dados;
  const anos = [...manifest.anos].sort((a, b) => b - a);
  const [ano, setAno] = useState(anos[0]!);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [termo, setTermo] = useState('');
  const [limite, setLimite] = useState(PAGINA);
  const agora = useMemo(() => Date.now(), []);

  const doAno = useMemo(
    () => ordenar(listas[ano] ?? [], agora).map((l) => ({ l, s: situacao(l, agora) })),
    [listas, ano, agora],
  );
  const encontradas = new Set(buscar(listas[ano] ?? [], termo).map((l) => l.codigo));
  const parte = PARTES.find((p) => p.id === filtro);
  const visiveis = doAno.filter((x) => encontradas.has(x.l.codigo) && (!parte || parte.tem(x.s)));

  const mudar = <T,>(f: (v: T) => void) => (v: T) => {
    f(v);
    setLimite(PAGINA);
  };

  return (
    <>
      <section className="topo" aria-labelledby="h-topo">
        <h1 id="h-topo">
          <span className="topo-t">Acompanhe as</span>
          <span className="bignum">licitações</span>
          <span className="topo-t">da Prefeitura de Rolante/RS</span>
        </h1>
        <div className="src">
          <span>Fonte: Portal da Transparência de Rolante ·</span>
          <Coletado em={manifest.coletado_em} />
        </div>
      </section>

      <h2 className="sr">Licitações de {ano}</h2>
      <section className="filtros" aria-label="Filtros">
        {anos.length > 1 && <Seg label="Ano" valor={ano} opcoes={anos.map((a) => [a, String(a)])} onChange={mudar(setAno)} />}
        <label className="busca">
          <IcoBusca />
          <span className="sr">Buscar</span>
          <input type="search" placeholder="Buscar por objeto, número ou modalidade" value={termo} onChange={(e) => mudar(setTermo)(e.target.value)} />
        </label>
      </section>

      <div className="chips" role="group" aria-label="Filtrar por situação">
        <button type="button" className="chip" aria-pressed={filtro === 'todas'} onClick={() => mudar(setFiltro)('todas')}>
          Todas <span className="n num">{formatInt(doAno.length)}</span>
        </button>
        {PARTES.map((p) => (
          <button key={p.id} type="button" className="chip" aria-pressed={filtro === p.id} onClick={() => mudar(setFiltro)(filtro === p.id ? 'todas' : p.id)}>
            {p.chip} <span className="n num">{formatInt(doAno.filter((x) => p.tem(x.s)).length)}</span>
          </button>
        ))}
      </div>

      {/* Só para leitor de tela: avisa quantas sobraram depois de filtrar ou buscar. */}
      <p className="sr" role="status">
        {visiveis.length === 1 ? '1 licitação' : `${formatInt(visiveis.length)} licitações`}
        {parte && <> {parte.nome}</>}
      </p>

      {visiveis.length === 0 ? (
        <div className="msg info" style={{ marginTop: 12 }}>
          <p>
            Nenhuma licitação de {ano} {termo.trim() ? <>com «{termo.trim()}»</> : 'nesta situação'}. Tente outra palavra, outra situação ou
            outro ano.
          </p>
        </div>
      ) : (
        <ul className="cards">
          {visiveis.slice(0, limite).map((x) => (
            <Cartao key={x.l.codigo} {...x} />
          ))}
        </ul>
      )}
      {visiveis.length > limite && (
        <p style={{ textAlign: 'center', marginTop: 24 }}>
          <button type="button" className="btn2" onClick={() => setLimite(limite + PAGINA)}>
            Mostrar mais {Math.min(PAGINA, visiveis.length - limite)}
          </button>
        </p>
      )}

      <Origem manifest={manifest} />
    </>
  );
}
