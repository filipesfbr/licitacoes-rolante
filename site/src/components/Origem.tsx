import type { Manifest } from '../App.tsx';
import { formatColeta, formatInt } from '../lib/format.ts';
import { LinkExterno } from './ui.tsx';

const PRINCIPIOS = [
  ['Sem resumo e sem estimativas', 'Objeto, itens, modalidade e nomes de empresa aparecem exatamente como no portal. Se não há dado, o espaço fica vazio.'],
  ['A soma tem que bater', 'Só publicamos quando a soma de quantidade × preço dos vencedores confere, ao centavo, com o total do portal.'],
  ['Sem nomes de pessoas', 'Vencedores pessoa física não são identificados: nem nome, nem documento. O nome continua no portal.'],
  ['Confira você mesmo', 'Cada licitação tem um link que abre o portal oficial filtrado pelo número dela.'],
] as const;

/** Mesmo padrão da seção «De onde vêm os números» do Impostômetro e do Gastômetro, em tamanho menor. */
export function Origem({ manifest }: { manifest: Manifest }) {
  const v = Object.values(manifest.validacao ?? {});
  const conferidas = v.reduce((n, x) => n + x.com_vencedor, 0);
  const coletadas = v.reduce((n, x) => n + x.licitacoes, 0);
  return (
    <section className="panel origem" id="de-onde-vem" aria-labelledby="t-origem">
      <h2 className="origem-h" id="t-origem">
        De onde vêm os dados
      </h2>
      <p className="origem-lead">Todos os dados vêm do Portal da Transparência da Prefeitura de Rolante. Não fazemos resumos nem estimativas.</p>
      <p className="origem-p">
        Mostramos o que a prefeitura publica, organizado de forma mais fácil de entender. Os dados são coletados todos os dias e só são
        publicados quando a soma confere exatamente com o total exibido no portal. Em cada licitação há um link para você conferir no próprio
        portal. Este site é independente e não tem vínculo com a prefeitura.
      </p>
      <p className="origem-link">
        <LinkExterno href={manifest.fonte.portalLicitacoes}>Abrir o Portal da Transparência de Rolante</LinkExterno>
      </p>

      <ol className="princ">
        {PRINCIPIOS.map(([t, d], i) => (
          <li key={t}>
            <span className="princ-n num">{String(i + 1).padStart(2, '0')}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </li>
        ))}
      </ol>

      <div className="origem-duas">
        <div>
          <h3>O que é «Valor dos vencedores»</h3>
          <p>
            É o que foi contratado na licitação, não o que já foi pago. Em registro de preços, é o teto de compra. Em leilão, é dinheiro que
            entra e não soma em nenhum total.
          </p>
        </div>
        <div>
          <h3>Situação da licitação</h3>
          <p>
            «Recebendo propostas» é calculado na hora, pelo prazo de propostas. O status original do portal aparece sempre ao lado.
          </p>
        </div>
        <div>
          <h3>Dados da Receita Federal</h3>
          <p>
            Abertura, situação cadastral e matriz ou filial de cada empresa vêm da Receita Federal. É a única informação que não vem do
            portal, e aparece sempre rotulada, como fato, sem selo nem alerta.
          </p>
        </div>
      </div>

      <div className="origem-status">
        <span className="rot">Status da última coleta</span>
        <p className="origem-data num">{formatColeta(manifest.coletado_em)}</p>
        {conferidas > 0 && (
          <p>
            {formatInt(conferidas)} licitações com vencedor conferidas ✓ · {formatInt(coletadas)} licitações coletadas
          </p>
        )}
        <p className="d">
          Todas as coletas ficam guardadas, com data e hash, na branch de dados do{' '}
          <LinkExterno href={manifest.fonte.repositorio}>repositório público</LinkExterno>.
        </p>
      </div>
    </section>
  );
}
