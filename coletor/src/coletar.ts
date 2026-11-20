import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { criarApi } from './api.ts';
import { alteracoes } from './historico.ts';
import { anexo, item, licitacao, vencedor } from './normalizar.ts';
import { consultar, paraConsultar } from './receita.ts';
import type { Alteracao, DadosCnpj, Detalhe, Fonte, Licitacao } from './tipos.ts';
import { validarLicitacao } from './validar.ts';

const DATA = process.env.DATA_DIR ?? 'data';

const lerJson = <T>(caminho: string, padrao: T): T =>
  existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf8')) : padrao;

const escritos: Record<string, string> = {};
function gravar(relativo: string, conteudo: string) {
  const caminho = join(DATA, relativo);
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  escritos[relativo] = `sha256:${createHash('sha256').update(conteudo).digest('hex')}`;
}
const json = (x: unknown) => `${JSON.stringify(x, null, 2)}\n`;
// Uma linha por registro: o diff do git mostra exatamente o que mudou.
const jsonLinhas = (a: unknown[]) => (a.length ? `[\n${a.map((x) => JSON.stringify(x)).join(',\n')}\n]\n` : '[]\n');

/** Data e hora em Brasília (UTC−3, sem horário de verão desde 2019). */
function agoraBRT(d = new Date()) {
  const iso = new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 19);
  return { hoje: iso.slice(0, 10), coletadoEm: `${iso}-03:00` };
}

const EM_ANDAMENTO = 'Em Andamento';

async function main() {
  const fonte = lerJson<Fonte | null>('config/fonte.json', null)!;
  const { hoje, coletadoEm: iniciadoEm } = agoraBRT();
  const anoAtual = Number(hoje.slice(0, 4));
  // R7: ano atual e anterior.
  const anos = process.env.ANOS ? process.env.ANOS.split(',').map(Number) : [anoAtual - 1, anoAtual];

  const api = criarApi(fonte);
  const listas: Record<number, Licitacao[]> = {};
  const detalhes: Detalhe[] = [];
  const validacao: Record<number, { licitacoes: number; com_vencedor: number }> = {};
  const erros: string[] = [];
  let anexosBaixados = 0;

  for (const ano of anos) {
    const anterior = new Map(lerJson<Licitacao[]>(join(DATA, `licitacoes/${ano}.json`), []).map((l) => [l.codigo, l]));
    const brutas = await api.licitacoes(ano);
    listas[ano] = brutas.map(licitacao).sort((a, b) => b.emissao.localeCompare(a.emissao) || b.codigo - a.codigo);
    validacao[ano] = { licitacoes: brutas.length, com_vencedor: 0 };

    for (const bruta of brutas) {
      const lic = licitacao(bruta);
      const vencedores = await api.vencedores(lic.codigo);
      const problemas = validarLicitacao(bruta, vencedores);
      erros.push(...problemas);
      if (vencedores.length) validacao[ano].com_vencedor++;
      const itens = await api.itens(lic.codigo);

      // shortcut: anexos de licitação fechada e com o mesmo status vêm da coleta anterior, porque a
      // resposta traz os PDFs em base64 (até ~90 MB). Documento novo sem mudança de status só entra
      // quando o status mudar; se isso acontecer na prática, baixar todos uma vez por semana.
      const antes = anterior.get(lic.codigo);
      const guardado = lerJson<Detalhe | null>(join(DATA, `detalhes/${lic.codigo}.json`), null);
      let anexos = guardado?.anexos;
      if (!anexos || lic.status === EM_ANDAMENTO || antes?.status !== lic.status) {
        anexos = (await api.anexos(lic.codigo)).map(anexo);
        anexosBaixados++;
      }

      detalhes.push({
        codigo: lic.codigo,
        // Pessoa física só pode ser descartada depois de conferida (R2, item 4).
        vencedores: problemas.length ? [] : vencedores.map(vencedor),
        itens: itens.map(item),
        anexos,
      });
      console.log(
        `${ano} nº ${lic.numero} (${lic.codigo}): ${vencedores.length} vencedores · ${itens.length} itens · ${anexos.length} anexos${problemas.length ? ' · NÃO CONFERE' : ''}`,
      );
    }
  }

  // R2: se alguma licitação não fechar, nada é gravado e o site fica no último snapshot.
  if (erros.length) {
    console.error(`\nColeta NÃO publicada (R2):\n- ${erros.join('\n- ')}`);
    process.exit(1);
  }

  // R5: compara com a coleta anterior, ano a ano.
  const historico = lerJson<Alteracao[]>(join(DATA, 'historico-alteracoes.json'), []);
  for (const ano of anos) {
    const anterior = lerJson<Licitacao[] | null>(join(DATA, `licitacoes/${ano}.json`), null);
    if (anterior) historico.push(...alteracoes(anterior, listas[ano]!, hoje));
  }

  for (const ano of anos) gravar(`licitacoes/${ano}.json`, jsonLinhas(listas[ano]!));
  for (const d of detalhes) {
    gravar(
      `detalhes/${d.codigo}.json`,
      `{"codigo":${d.codigo},\n"vencedores":${jsonLinhas(d.vencedores)},"itens":${jsonLinhas(d.itens)},"anexos":${jsonLinhas(d.anexos)}}\n`,
    );
  }
  gravar('historico-alteracoes.json', jsonLinhas(historico));

  // D2: dados da Receita por CNPJ vencedor. Falha aqui nunca impede a coleta: fica o que já estava guardado.
  const cnpjs = [...new Set(detalhes.flatMap((d) => d.vencedores.flatMap((v) => (v.documento ? [v.documento] : []))))].sort();
  const guardados = lerJson<Record<string, DadosCnpj>>(join(DATA, 'cnpj.json'), {});
  const fila = paraConsultar(cnpjs, guardados, hoje);
  let falhas = 0;
  let seguidas = 0;
  let consultados = 0;
  for (const [i, cnpj] of fila.entries()) {
    // Duas fontes fora do ar: cada consulta gasta até 40 s. Desiste da fila para não estourar o timeout do job.
    if (seguidas >= 3) {
      console.log('Receita: 3 falhas seguidas, fila abandonada até a próxima coleta');
      break;
    }
    if (i) await new Promise((r) => setTimeout(r, 1000));
    consultados++;
    const dados = await consultar(cnpj, hoje, { userAgent: fonte.userAgent });
    if (dados) {
      guardados[cnpj] = dados;
      seguidas = 0;
    } else {
      falhas++;
      seguidas++;
    }
  }
  if (fila.length) console.log(`Receita: ${consultados - falhas} de ${fila.length} CNPJs consultados${falhas ? ` (${falhas} sem resposta)` : ''}`);
  // Só os CNPJs que ainda são vencedores na janela de anos; uma linha por CNPJ para o diff do git.
  const cnpjAtual = Object.fromEntries(cnpjs.filter((c) => guardados[c]).map((c) => [c, guardados[c]!]));
  gravar('cnpj.json', `{\n${Object.entries(cnpjAtual).map(([c, d]) => `${JSON.stringify(c)}:${JSON.stringify(d)}`).join(',\n')}\n}\n`);

  // A branch `data` é sempre o snapshot de hoje: arquivo fora da coleta (ano que saiu da janela,
  // licitação removida do portal) sai daqui e continua no histórico do git (R3).
  for (const pasta of ['licitacoes', 'detalhes']) {
    for (const f of existsSync(join(DATA, pasta)) ? readdirSync(join(DATA, pasta)) : []) {
      if (!escritos[`${pasta}/${f}`]) unlinkSync(join(DATA, pasta, f));
    }
  }

  gravar(
    'manifest.json',
    json({
      // A coleta leva ~40 min: a data mostrada no site é a do fim, quando os dados ficaram prontos.
      coletado_em: agoraBRT().coletadoEm,
      iniciado_em: iniciadoEm,
      fonte: {
        portal: fonte.portal,
        portalLicitacoes: fonte.portalLicitacoes,
        api: fonte.api,
        entidade: fonte.entidade,
        repositorio: fonte.repositorio,
      },
      anos,
      validacao,
      arquivos: escritos,
    }),
  );
  const total = Object.values(validacao).reduce((s, v) => s + v.licitacoes, 0);
  console.log(`\nColeta ok: ${total} licitações conferem (R2) · ${anexosBaixados} listas de anexos baixadas`);
}

await main();
