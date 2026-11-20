import type { CSSProperties, ReactNode } from 'react';
import { formatColeta } from '../lib/format.ts';
import type { Situacao } from '../lib/situacao.ts';

// Ícones de traço único arredondado (handoff: coerentes com a gota, traço 1.8).
const Ico = ({ size = 16, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
export const IcoExterno = () => (
  <Ico size={12}>
    <path d="M6 3.5h6.5V10M12.5 3.5l-9 9" />
  </Ico>
);
export const IcoVoltar = () => (
  <Ico>
    <path d="M13 8H3.5M7.5 4l-4 4 4 4" />
  </Ico>
);
export const IcoRelogio = () => (
  <Ico size={20}>
    <circle cx="8" cy="8" r="6.4" />
    <path d="M8 4.6V8l2.4 1.6" />
  </Ico>
);
export const IcoBusca = () => (
  <Ico>
    <circle cx="7" cy="7" r="4.6" />
    <path d="M10.4 10.4L14 14" />
  </Ico>
);

export function LinkExterno({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener">
      {children}
      <IcoExterno />
      <span className="sr">(abre em nova aba)</span>
    </a>
  );
}

/** Situação na tela com o status original do portal ao lado (R6, seção 5). */
export function PilulaSituacao({ s, status, curta }: { s: Situacao; status: string; curta?: boolean }) {
  // No cartão, o rótulo longo quebrava a linha; o texto completo continua no detalhe.
  const rotulo = curta && s.rotulo === 'Prazo de propostas encerrado' ? 'Prazo encerrado' : s.rotulo;
  return (
    <span className="sit">
      <span className={`pill ${s.recebendo ? 'accent' : s.aberta ? 'up' : 'neu'}`}>{rotulo}</span>
      {!curta && s.rotulo !== status && <span className="sit-o">No portal: {status}</span>}
    </span>
  );
}

const LIMITE_ATRASO_MS = 36 * 3600_000;

/** «coletado em …» com um selo discreto quando a última coleta tem mais de 36 h. */
export function Coletado({ em }: { em: string }) {
  const atrasado = Date.now() - new Date(em).getTime() > LIMITE_ATRASO_MS;
  return (
    <>
      <span>coletado em {formatColeta(em)}</span>
      {atrasado && (
        <span className="selo" role="status" title="A última coleta foi há mais de 36 horas. As informações são dessa coleta e podem estar atrás do portal.">
          <IcoRelogio />
          Atualização pendente
        </span>
      )}
    </>
  );
}

export function Seg<T extends string | number>({
  label,
  valor,
  opcoes,
  onChange,
}: {
  label: string;
  valor: T;
  opcoes: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {opcoes.map(([v, txt]) => (
        <button key={String(v)} type="button" className="segb" aria-pressed={valor === v} onClick={() => onChange(v)}>
          {txt}
        </button>
      ))}
    </div>
  );
}

export function Rotulo({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="rot" style={style}>
      {children}
    </span>
  );
}

/**
 * Texto do portal que pode trazer HTML (`descricao_adicional`) ou entidades (`&#8220;` em `finalidade`),
 * mostrado como o portal mostra, mas só como texto: nunca vira HTML na página (R6).
 */
export function textoDeHtml(html: string | null): string {
  if (!html) return '';
  return (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').trim();
}
