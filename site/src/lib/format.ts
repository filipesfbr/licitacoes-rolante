// Formatação pt-BR do site. Os valores do portal vêm em reais, às vezes com 3 casas no preço unitário.

// Espaço inseparável: "R$" nunca fica sozinho no fim da linha.
const NBSP = ' ';
const nf = (min: number, max = min) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
const n2 = nf(2);
const n2a4 = nf(2, 4);
const n0a4 = nf(0, 4);

/** 1480190.36 → "R$ 1.480.190,36" */
export const formatBRL = (reais: number) => `R$${NBSP}${n2.format(reais)}`;

/** Preço unitário como vem: 21.038 → "R$ 21,038" · 15 → "R$ 15,00" */
export const formatPreco = (reais: number) => `R$${NBSP}${n2a4.format(reais)}`;

/** 800 → "800" · 2.5 → "2,5" */
export const formatQtd = (n: number) => n0a4.format(n);

export const formatInt = (n: number) => nf(0).format(n);

/** "2026-10-26" → "26/10/2026" */
export const formatDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** "2026-11-11T08:59" → "11/11/2026 às 08:59" · "2026-11-11" → "11/11/2026" */
export const formatDataHora = (iso: string) => (iso.length > 10 ? `${formatDate(iso)} às ${iso.slice(11, 16)}` : formatDate(iso));

/** "2026-10-27T06:00:12-03:00" → "27/10/2026 às 06:00" (o horário já vem em Brasília) */
export const formatColeta = (iso: string) => `${formatDate(iso)} às ${iso.slice(11, 16)}`;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * D6: tempo entre duas datas "AAAA-MM-DD", só o fato: "2 anos e 3 meses", "5 meses", "12 dias".
 * `depois` é true quando `de` vem depois de `ate` (filial aberta depois da licitação, por exemplo).
 */
export function intervalo(de: string, ate: string): { texto: string; depois: boolean } {
  const depois = de > ate;
  const [a, b] = depois ? [ate, de] : [de, ate];
  const [y1, m1, d1] = a.split('-').map(Number) as [number, number, number];
  const [y2, m2, d2] = b.split('-').map(Number) as [number, number, number];
  const meses = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (meses < 1) {
    const dias = Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
    return { texto: dias === 0 ? 'no mesmo dia' : plural(dias, 'dia', 'dias'), depois };
  }
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [anos && plural(anos, 'ano', 'anos'), resto && plural(resto, 'mês', 'meses')].filter(Boolean);
  return { texto: partes.join(' e '), depois };
}
