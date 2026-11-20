import type { Alteracao, Licitacao } from './tipos.ts';

const CAMPOS = ['status', 'total', 'valor_referencia'] as const;

/** R5: mudança de status ou valor em relação à coleta anterior, e licitação que sumiu do portal. */
export function alteracoes(anterior: Licitacao[], novo: Licitacao[], detectadoEm: string): Alteracao[] {
  const atual = new Map(novo.map((l) => [l.codigo, l]));
  const saida: Alteracao[] = [];
  for (const a of anterior) {
    const base = { detectado_em: detectadoEm, codigo: a.codigo, ano: a.ano };
    const b = atual.get(a.codigo);
    if (!b) {
      saida.push({ ...base, campo: 'licitacao', antes: 'presente', depois: null });
      continue;
    }
    for (const campo of CAMPOS) {
      if (a[campo] !== b[campo]) saida.push({ ...base, campo, antes: a[campo], depois: b[campo] });
    }
  }
  return saida;
}
