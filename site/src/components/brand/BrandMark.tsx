// Símbolo do Licitações Rolante (martelo sobre moeda). Geometria em design_handoff_licitacoes_rolante/assets/licitacoes-rolante/mark.svg.
type Props = { height?: number; tone?: 'auto' | 'ink' | 'white'; title?: string };

export function BrandMark({ height = 34, tone = 'auto', title }: Props) {
  const stroke = tone === 'ink' ? 'var(--tinta)' : tone === 'white' ? 'var(--branco)' : 'var(--accent)';
  const fill = tone === 'auto' ? 'var(--brand-bg)' : 'none';
  return (
    <svg
      width={(height * 26) / 34}
      height={height}
      viewBox="0 0 26 34"
      fill="none"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect x="2" y="2" width="22" height="30" rx="11" fill={fill} strokeWidth="1.8" />
      <g transform="translate(13.75 15.7) rotate(60)">
        <rect x="-4.5" y="-2" width="9" height="4" rx="1.2" strokeWidth="1.4" />
        <path d="M-2.6 -2 V2 M2.6 -2 V2" strokeWidth="1.1" />
        <path d="M0 2 V8.2" strokeWidth="1.4" />
      </g>
      <path
        d="M11.5 21.6 A4.5 1.4 0 0 1 20.5 21.6 A4.5 1.4 0 0 1 11.5 21.6 Z M11.5 21.6 V23.8 A4.5 1.4 0 0 0 20.5 23.8 V21.6 M13.3 22.72 V24.92 M16 23 V25.2 M18.7 22.72 V24.92"
        strokeOpacity=".55"
        strokeWidth=".9"
      />
    </svg>
  );
}
