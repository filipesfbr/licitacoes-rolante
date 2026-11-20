import { useEffect, useState } from 'react';
import type { Licitacao } from '../../coletor/src/tipos.ts';
import { BrandLockup } from './components/brand/BrandLockup.tsx';
import { BrandMark } from './components/brand/BrandMark.tsx';
import { Detalhe } from './components/Detalhe.tsx';
import { Lista } from './components/Lista.tsx';

export type Manifest = {
  coletado_em: string;
  fonte: { portal: string; portalLicitacoes: string; entidade: number; repositorio: string };
  anos: number[];
  validacao?: Record<string, { licitacoes: number; com_vencedor: number }>;
};
export type Dados = { manifest: Manifest; listas: Record<number, Licitacao[]> };

const IMPOSTOMETRO = 'https://impostometro.rolanters.com.br/';
const GASTOMETRO = 'https://gastometro.rolanters.com.br/';

const pegar = <T,>(caminho: string): Promise<T> =>
  fetch(`dados/${caminho}`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${caminho}: ${r.status}`))));

/** D3: `#/licitacao/{codigo}` abre o detalhe; qualquer outra coisa é a lista. */
const rota = () => Number(/^#\/licitacao\/(\d+)$/.exec(location.hash)?.[1]) || null;

function Carregando() {
  return (
    <div style={{ padding: '44px 0', display: 'flex', flexDirection: 'column', gap: 14 }} aria-busy="true" aria-label="Carregando os dados">
      <div className="sk" style={{ width: '60%', height: 18 }} />
      <div className="sk" style={{ width: '100%', height: 72 }} />
      <div className="sk" style={{ height: 120 }} />
      <div className="sk" style={{ height: 120 }} />
    </div>
  );
}

export function App() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [codigo, setCodigo] = useState(rota);

  useEffect(() => {
    pegar<Manifest>('manifest.json')
      .then(async (manifest) => {
        const listas = await Promise.all(manifest.anos.map((a) => pegar<Licitacao[]>(`licitacoes/${a}.json`)));
        setDados({ manifest, listas: Object.fromEntries(manifest.anos.map((a, i) => [a, listas[i]!])) });
      })
      .catch(() => setErro(true));
  }, []);

  useEffect(() => {
    if (dados && location.hash === '#de-onde-vem') document.getElementById('de-onde-vem')?.scrollIntoView();
  }, [dados]);

  useEffect(() => {
    const mudou = () => {
      setCodigo(rota());
      // #de-onde-vem é âncora (como no Impostômetro e no Gastômetro): rola até a seção em vez de ir ao topo.
      if (location.hash === '#de-onde-vem') setTimeout(() => document.getElementById('de-onde-vem')?.scrollIntoView(), 50);
      else window.scrollTo(0, 0);
    };
    addEventListener('hashchange', mudou);
    return () => removeEventListener('hashchange', mudou);
  }, []);

  return (
    <div className="pg">
      <div className="wrap">
        <header className="hdr">
          <a className="logo" href="#/" aria-label="Licitações Rolante: início">
            <BrandLockup />
          </a>
        </header>
        {erro && (
          <div className="msg err" role="alert">
            <BrandMark height={52} />
            <p>Não conseguimos carregar os dados deste site agora. Tente recarregar a página.</p>
          </div>
        )}
        {!dados && !erro && <Carregando />}
        {dados && (
          <>
            <main>{codigo ? <Detalhe dados={dados} codigo={codigo} /> : <Lista dados={dados} />}</main>
          </>
        )}
        <footer className="ftr">
          <p style={{ marginBottom: 12 }}>
            <BrandLockup markHeight={22} />
          </p>
          <p className="ftr-l">
            <a href={IMPOSTOMETRO}>Impostômetro Rolante: quanto a prefeitura arrecada</a>
            <a href={GASTOMETRO}>Gastômetro Rolante: quanto a prefeitura gasta</a>
          </p>
          <p className="ftr-l" style={{ marginTop: 8 }}>
            <a href="#de-onde-vem">De onde vêm os dados</a>
            {dados && (
              <a href={dados.manifest.fonte.repositorio} target="_blank" rel="noopener">
                Repositório público
              </a>
            )}
          </p>
        </footer>
      </div>
    </div>
  );
}
