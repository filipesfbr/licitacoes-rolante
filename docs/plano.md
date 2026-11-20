# Plano — Licitações Rolante

> Situação em 20/11/2026: coletor e site na branch `develop`, com PR aberto para a `main`. Coleta ainda não rodada no GitHub.
> **Para retomar, leia primeiro a seção 10.**
> Regras do projeto: [`fonte-de-verdade.md`](fonte-de-verdade.md).

---

## 1. Objetivo

Mostrar as licitações do ano atual e do anterior com seu status, de um jeito fácil de ler: o que está sendo pedido, o que está em aberto, o que foi fechado, os valores e, quando houver, quem venceu.

---

## 2. Decisões pendentes

Nenhuma decisão pendente. O handoff da marca chegou em 03/11/2026 (`design_handoff_licitacoes_rolante/`).

---

## 3. Decisões tomadas

- Repositório próprio, `licitacoes-rolante`, com coleta diária na linha do Impostômetro e do Gastômetro.
- Ano atual e ano anterior, com as licitações abertas no topo.
- Texto exatamente como vem do portal, sem resumo, sem IA e sem ajuste de maiúsculas. Rótulos podem mudar um pouco, sem alterar o entendimento.
- CNPJ pode aparecer.
- **D1 (03/11/2026):** vencedor pessoa física aparece só como "Pessoa física", sem nome e sem dígitos do CPF. Na coleta, nome e CPF mascarado são descartados antes de gravar: a branch `data` guarda só o tipo "pessoa física". A conferência do CPF mascarado (R2, item 4) roda em memória, antes do descarte. Motivo: num município pequeno, nome parcial com dígitos identifica a pessoa (em Chamada Pública/PNAE são agricultores), e a branch `data` será pública com histórico permanente. O nome continua no portal. Custo: o site não diz quem venceu nesses casos.
- **D2 (03/11/2026):** o site mostra data de abertura, situação cadastral e matriz/filial do CNPJ, rotulados como dados da Receita Federal, conforme a seção 7. É a única exceção à fonte única (R1).
- **D3 (03/11/2026):** cada licitação tem página de detalhe com link próprio, para poder compartilhar.
- **D4 (03/11/2026):** rótulos de status da seção 5 aprovados.
- **D5 (03/11/2026):** empresa MEI aparece com o nome como vem do portal, mascarando só o número de CPF dentro dele (R8). Igual para qualquer empresa com CPF no nome, sem depender de saber se é MEI.
- **D6 (03/11/2026):** o detalhe mostra o tempo entre a abertura da empresa (Receita) e a emissão da licitação (`dataEmissao`), como fato neutro, sem selo, cor ou alerta. Em filial, junto do rótulo matriz/filial.
- **D7 (03/11/2026):** domínio `licitacoes.rolanters.com.br` e repositório público na primeira publicação, no padrão de Impostômetro e Gastômetro.
- **D8 (03/11/2026):** o projeto fica fora do `transparencia-rolante`.
- A conferência da R2 foi aprovada, desde que a soma só confira o dado e nunca crie um novo.
- Com vários vencedores, não há subtotal calculado por vencedor: mostram-se os itens de cada um, com quantidade e preço como vêm. Com um só vencedor, o `total` do portal é o valor dele.
- Valor rotulado como "valor dos vencedores", nunca "gasto". Leilão fica fora dos totais.
- Identidade visual da família: acento terracota, âmbar no escuro.
- Pensado primeiro para celular. Ordem: abertas com o prazo mais próximo primeiro, depois as demais, da emissão mais recente para a mais antiga.
- Dispensa e inexigibilidade explicadas como "contratação direta, sem licitação".

**Fora da primeira versão:** propostas dos perdedores, alertas por e-mail, ranking de fornecedores e anos anteriores ao ano passado.

---

## 4. API do portal (verificado em 30/10/2026)

Base `https://apitransparencia.abase.com.br/`, sem login, `POST` com `application/x-www-form-urlencoded`, `token=apvqyIT7vjY=`. Manter 1 chamada a cada 2 s, como nos outros projetos. Cerca de 400 chamadas nesse ritmo não foram bloqueadas.

| Endpoint (`Usuario/Licitacao/...`) | Parâmetros usados | Conteúdo |
|---|---|---|
| `ListaLicitacoes` | `draw, start, length=20000, ano, entidade=0`, mais `mes, modalidade, status, finalidade, licitacao, fundamentolegal, dispensalicitacao, tipoLicitacao, solicitante, covid` vazios | Lista do ano |
| `ListaVencedoresDetalhesLicitacao` | `codigo, draw, start, length` | Vencedor, documento, item, quantidade, referência e valor |
| `ListaItensDetalhesLicitacao` | idem | Item, unidade, quantidade máxima e referência |
| `ListaAnexosLicitacoes` | idem | Documentos da licitação |
| `ListaAgendaCalendario` | `ano, mes, finalidade, numerolicitacao, entidade` | Calendário do mês |
| `ListaPropostasDetalhesLicitacao`, `ListaFornecedoresLicitacoes` | `codigo, draw, start, length` | Fora da primeira versão |
| `ListaTramitacaoDetalhesLicitacao` | idem | Vazio na única licitação testada (46150) |

`entidade=1` é a Câmara: nenhuma licitação em 2026.

**Campos da lista:** `codigoLicitacao, anoLicitacao, numeroLicitacao, numeroProcesso, descricaoModalidade, finalidade, status, dataEmissao, valorReferencia, total, orcamentoSigiloso, dataAberturaPropostas, dataFechamentoPropostas, horaAberturaPropostas, horaFechamentoPropostas, dataAberturaDocumentacao`.

**Cuidados:**

- `dataAberturaPropostas` e `dataFechamentoPropostas` são números de dias. A conversão a partir de 28/12/1800 bateu com `dataAberturaDocumentacao` nos casos vistos.
- O horário nem sempre vem: `dataAberturaDocumentacao` aparece nas abertas de 2026 vistas, mas em só 2 de 185 licitações de 2025. O design precisa funcionar só com a data.
- `dataHomologacao` veio vazia em todos os anos amostrados (2007, 2015, 2025 e 2026). **Não há data de fechamento.**
- Orçamento sigiloso: o portal usa valor negativo em `valor_proposta` para exibir "Sigiloso".
- Em anos antigos, o status não é confiável: de 2007 a 2015 quase tudo segue "Em Andamento" (2015: 63 de 65). Esses anos estão fora do escopo.

---

## 5. Status na tela (D4)

O texto original do portal fica sempre visível ao lado do rótulo.

| Na tela | Quando | Status no portal |
|---|---|---|
| Recebendo propostas | Prazo ainda não venceu | Em Andamento |
| Prazo de propostas encerrado | Prazo já venceu | Em Andamento |
| Em andamento | Sem data de prazo | Em Andamento |
| Encerrada | Sempre | Encerramento |
| Sem vencedor | Sempre | Encerramento por falta de interessados, de licitantes habilitados ou de propostas classificadas |
| Anulada / Revogada | Sempre | Anulação de ofício / Revogação de ofício |

Qualquer outro status, como "Alteração do edital", aparece exatamente como vem do portal. Encerrada sem vencedor na API aparece como "sem vencedor informado", sem supor o motivo.

---

## 6. Testes de integridade (30/10/2026)

As 349 licitações de 2025 e 2026, comparando `total` com a soma dos vencedores em decimal exato, sem tolerância:

| Resultado | Qtd |
|---|---:|
| Soma exata | 299 |
| Diferença de até 1 centavo | 22 |
| Sem valor e sem vencedor | 28 |
| Diferença maior que 1 centavo | 0 |

Dos 22 casos, 12 foram vistos e fecham ao arredondar (`62123.185` contra `62123.19`). Os outros 10 só se sabe que ficam em até 1 centavo. Testar todos na primeira coleta real.

**Sem ocorrências:** linhas faltando, quantidade ou valor nulo, zero ou negativo, vencedor sem documento, total sem vencedor, vencedor com total zero, CPF sem máscara e CPF formatado em `finalidade`.

**Vencedores:** 2.468 linhas com CNPJ e 211 com CPF mascarado. 3 linhas de CNPJ têm número no formato de CPF no nome.

**Casos estranhos, publicados como vêm:**

| Licitação | Caso |
|---|---|
| 46154 | Status "Alteração do edital", com vencedor e total de R$ 48.773,07 |
| 52829 | "Em Andamento" com vencedor e total de R$ 1.080.000. Credenciamento aberto até 07/04/2027 |
| 46101, 46107, 46252 | Encerradas sem vencedor |
| 46117 | Total de R$ 0,01. A soma fecha, mas o valor parece simbólico. Não investigado |
| 53939, 46159, 46245 | Chamadas Públicas com linhas de mesma chave (lote, item e CPF mascarado). Parecem pessoas diferentes cujo CPF mascarado coincide. A soma só fecha mantendo todas |

**Retrato de 2026 em 30/10/2026, sem leilão (161 licitações):**

| Situação | Qtd | Valor |
|---|---:|---:|
| Recebendo propostas | 4 | R$ 1.480.190,36 (referência) |
| Prazo de propostas encerrado | 9 | R$ 4.770.332,00 (referência) |
| Encerradas | 141 | R$ 37.662.538,41 (referência: R$ 41.426.316,82) |
| Com status de sem vencedor, anulação ou revogação | 7 | R$ 3.770.511,80 (referência) |

Das 141 encerradas, 103 são contratação direta, somando R$ 3.252.845,88.

---

## 7. Dados de CNPJ (D2)

Testado em 02/11/2026 com **uma** empresa, matriz. As quatro APIs responderam sem chave e trouxeram a mesma data de abertura.

| API | Campo da data | Observação |
|---|---|---|
| BrasilAPI: `brasilapi.com.br/api/cnpj/v1/{cnpj}` | `data_inicio_atividade` | **Principal recomendada** |
| Minha Receita: `minhareceita.org/{cnpj}` | `data_inicio_atividade` | Mesmo formato. **Reserva recomendada** |
| CNPJ.ws: `publica.cnpj.ws/cnpj/{cnpj}` | `estabelecimento.data_inicio_atividade` | Informa a data de atualização da base |
| ReceitaWS: `receitaws.com.br/v1/cnpj/{cnpj}` | `abertura` | Formato próprio |

**Regras:**

- Gravar só `data_inicio_atividade`, `descricao_situacao_cadastral` e `descricao_identificador_matriz_filial`. Descartar `qsa`, `email`, `ddd_telefone_*` e endereço.
- Exibir como "Dados da Receita Federal, consultados em dd/mm/aaaa", separado dos dados do portal.
- Apenas o fato, sem selo, alerta ou juízo sobre a idade da empresa. O intervalo até a emissão da licitação (D6) segue a mesma regra.
- API fora do ar não bloqueia a coleta: o site mostra "não consultado".
- Guardar por CNPJ e atualizar periodicamente, sem repetir a consulta a cada coleta.
- Em filial, a data é a da filial, que pode ser mais nova que a empresa. O rótulo matriz/filial precisa aparecer junto.

---

## 8. Coleta

- Padrão do Impostômetro e do Gastômetro: GitHub Actions diário, commit na branch `data`, deploy chamado pela coleta. Pipeline do repositório `workflow-test`.
- Recoletar tudo todo dia, sem lógica de "só o que mudou": cerca de 363 chamadas nos 2 anos, ou 12 minutos, o que também captura alterações retroativas.
- Virada de ano: em janeiro, o ano anterior mantém no topo as licitações ainda abertas.

---

## 9. Verificações técnicas pendentes

Não dependem de decisão.

1. ~~**Nomes de pessoas em `finalidade`**~~ **Feito em 03/11/2026, nas 350 licitações de 2025–26:** nenhuma pessoa física privada como beneficiária. Os nomes que aparecem são de quem tem papel público:
   - artistas e escritores contratados por inexigibilidade, que a lei exige nomear;
   - vereadores e deputados autores de emendas;
   - nomes de rua, escola e parque.
   Achado à parte: 4 objetos trazem entidades HTML (`&#8220;`). O site agora mostra o texto como o portal mostra, sem nunca virar HTML.
   Limite: a busca foi por padrões (sobrenomes comuns, sequências de nomes próprios e palavras como «servidor» e «paciente»), não uma leitura de cada objeto.
2. ~~**Link "conferir no portal"**~~ **Feito em 03/11/2026:** `?ano=2026&numero-licitacao=4&entidade=0` filtra a tela. O número se repete entre modalidades, então o portal lista todas as licitações com esse número no ano (5 no teste).
3. ~~**Link do edital**~~ **Feito em 03/11/2026:** no navegador, `gedapi.../docPublico?RowGuid={linkPublico}` redireciona para o visualizador de PDF do portal e abre o documento.
4. ~~**APIs de CNPJ**~~ **Feito em 03/11/2026:**
   - 444 CNPJs distintos entre os vencedores de 2025–26.
   - BrasilAPI e Minha Receita responderam sem chave, no mesmo formato e com os mesmos dados, para uma filial e uma matriz. Nenhuma das duas amostras de "nome com CPF" tinha `opcao_pelo_mei` verdadeiro.
   - A Minha Receita declara que nenhuma consulta é recusada por limite de uso e que não há garantia de serviço. A BrasilAPI não publica termos nem limite.
   - Uso adotado: 1 consulta por segundo e cache de 30 dias por CNPJ, com no máximo 60 renovações por coleta.
5. ~~**Arredondamento**~~ **Feito em 03/11/2026:** na coleta completa, as 350 licitações de 2025–26 fecharam exatamente com soma em decimal exato e meio para cima no fim, incluindo os casos de 1 centavo.

---

## 10. Como retomar (estado em 03/11/2026)

**Regras de trabalho**
- Código, `docs/` e `README.md` vão para o git. Só `design_handoff_licitacoes_rolante/` fica fora (`.git/info/exclude`).
- O repositório será público: nada de nome ou documento de pessoa física, nem em log.
- Ajuste de design: em caso de dúvida, perguntar com opções antes de mexer. Duas tentativas por conta própria no bloco de resumo foram rejeitadas.

**Onde está cada coisa**
- **Coletor:** `coletor/src/`, com testes em `coletor/test/coletor.test.ts`.
- **Site:** `site/src/`:
  - `App.tsx`: carga dos dados e rotas;
  - `components/Lista.tsx` e `components/Detalhe.tsx`;
  - `lib/situacao.ts` e `lib/format.ts`, com testes;
  - `styles/tokens.css` e `styles/app.css`.
- **Dados da coleta local completa:** `data/`, na raiz (no `.gitignore`), com `licitacoes/`, `detalhes/`, `cnpj.json`, `historico-alteracoes.json` e `manifest.json`.

**Comandos**
- Checagens: `npm test` (49 testes), `npx eslint .` e `npm run build`.
- Prévia do site: `cd site && npx vite --port 5181`. Lê `../data` por padrão; outra pasta com `DATA_DIR=...`.
- Coleta completa: `npm run coletar`, cerca de 40 min, grava em `data/`. Para 1 ano só: `ANOS=2026 npm run coletar`.

**Próximo passo sugerido:** o Filipe segue revisando o site e pedindo ajustes. Pendências na seção 11 ("Falta") e na seção 12 ("Falta").

---

## 11. Andamento

> Atualizado a cada etapa. O repositório é público: toda mudança fica registrada.

### Feito

- **Estrutura** copiada do Gastômetro: Node 24 rodando TypeScript direto, vitest, eslint, `config/fonte.json`.
- **Coletor** (`coletor/src/`):
  - `api.ts`: `ListaLicitacoes`, vencedores, itens e anexos. 1 chamada a cada 2 s, retry em 429/403/5xx, e falha se as linhas recebidas forem diferentes de `recordsTotal` (R2, item 1).
  - `validar.ts`: R2, itens 2 a 4, em decimal exato (`BigInt`), arredondando meio para cima só no fim.
  - `normalizar.ts`: copia só os campos permitidos. Converte datas (dias desde 28/12/1800) e horas (centésimos de segundo). Aplica a R8.
  - `historico.ts`: R5 (status, `total`, `valor_referencia` e licitação removida).
  - `coletar.ts`: grava `licitacoes/{ano}.json`, `detalhes/{codigo}.json`, `historico-alteracoes.json` e `manifest.json` com SHA-256. Com erro na R2, nada é gravado.
- **Testes:** 49 ao todo (coletor e site), todos passando. Lint e typecheck sem erros.
- **Workflows:** `ci.yml` e `coleta.yml` (07:17 de Brasília, commit na branch `data`, conferência de privacidade antes do commit, sem deploy).

### Decisões de implementação (para o Filipe revisar)

- **Anexos chegam com o PDF em base64** (uma licitação veio com 94 MB). Nunca gravamos o arquivo nem o nome dele (`nomeDoc` pode ter nome de pessoa): só tipo, fase, data e `linkPublico`. Para não baixar isso todo dia, licitação fechada e com o mesmo status reaproveita os anexos da coleta anterior. Atalho: documento novo sem mudança de status só entra quando o status mudar.
- **CPF mascarado inteiro** (`***.***.***-**`), sem os 2 dígitos, no nome de empresa (D5) e também em `finalidade`, por segurança. Nenhum caso real foi visto em `finalidade`.
- **Pessoa física** é gravada só como `"pessoa_fisica": true` (D1). Os erros da R2 nunca mostram o documento, porque o log do Actions é público.
- A branch `data` guarda só o snapshot de hoje. Arquivo que sai da janela de anos é apagado dela e continua no histórico do git (R3).
- O campo `nomeGanhador` da lista vem sempre vazio e não é copiado.

### Falta

1. ~~Primeira coleta real completa~~ **Feita em 03/11/2026, localmente:**
   - 350 licitações (185 de 2025 e 165 de 2026), 323 com vencedor, todas passando na R2;
   - 2.681 linhas de vencedor, 211 delas de pessoa física, gravadas sem nome nem documento;
   - checagens de privacidade do `coleta.yml` sem ocorrência;
   - 3,5 MB no total;
   - 39 min (das 16:24 às 17:03), incluindo os anexos de todas. As coletas seguintes reaproveitam os anexos das licitações fechadas.
   - O `manifest.json` agora grava `coletado_em` no fim da coleta (a data que o site mostra) e `iniciado_em` no início.
2. Subir para o GitHub e rodar o `coleta.yml` uma vez (depois do merge do PR na `main`).
3. ~~Dados de CNPJ da Receita (D2, D6)~~ **Feito em 03/11/2026:**
   - `coletor/src/receita.ts`: BrasilAPI com Minha Receita de reserva. Grava só abertura, situação e matriz/filial, em `cnpj.json` (uma linha por CNPJ).
   - Falha na API nunca impede a coleta: fica o dado anterior, ou "não consultados" no site.
   - Conferência de campos permitidos no `coleta.yml`.
   - No site, cada empresa mostra «Receita Federal · consultado em …: Aberta em …, X antes da emissão da licitação · ATIVA · MATRIZ».
   - Testes de privacidade (descarta `qsa`, e-mail, telefone e endereço), da reserva e da fila de renovação.
4. ~~Verificações 1 a 5 da seção 9~~ feitas em 03/11/2026.
5. **Publicação (só com liberação):**
   - primeiro commit e push;
   - primeira coleta no Actions (~40 min, cria a branch `data`);
   - `deploy.yml` (Pages), `bump.yml` e `release.yml` no padrão do Gastômetro, com o deploy chamado no fim do `coleta.yml`;
   - README público e `AGENTS.md`;
   - domínio `licitacoes.rolanters.com.br` e repositório público (D7).

---

## 12. Site (plano de 03/11/2026, a partir do handoff)

> O handoff está em `design_handoff_licitacoes_rolante/` (fora do git por enquanto). A marca é final; as telas não foram desenhadas. O layout segue os fundamentos do handoff e os componentes do Gastômetro.

**Stack:** a mesma do Gastômetro, para manter a família igual e reaproveitar código. Vite + React 19 + TypeScript, workspace `site/`, Inter local (`@fontsource-variable/inter`), GitHub Pages. O handoff sugere Next.js ou Astro, mas o site é estático e os irmãos já usam Vite.

**Rotas (D3):** `#/` para a lista e `#/licitacao/{codigo}` para o detalhe. A rota com hash funciona no GitHub Pages sem servidor. Limite: a prévia ao compartilhar mostra a imagem geral do site, não a da licitação.

**Dados:** `dados/manifest.json` (data da coleta e fonte), `dados/licitacoes/{ano}.json` (lista) e `dados/detalhes/{codigo}.json`, que só é carregado ao abrir o detalhe.

### Telas

1. **Lista** (desenho atual, depois dos ajustes do Filipe)
   - Cabeçalho com a assinatura horizontal.
   - Topo no padrão do Gastômetro, à direita: «Acompanhe as» / **licitações** (gigante, terracota, em caixa alta via CSS) / «da Prefeitura de Rolante/RS», e a caixa de fonte embaixo.
   - **Contadores-filtro:** o título «165 licitações em 2026» é clicável e mostra todas. Embaixo, 4 contadores clicáveis (recebendo propostas, em andamento, encerradas, sem vencedor/anuladas/revogadas), e clicar de novo desliga o filtro.
   - Rejeitados: painel com número gigante e barra (parecido demais com os irmãos), gráfico de quadrados, card «todas», linha «N licitações · ver todas» e topo centralizado.
   - Seletor de ano (quando há 2 anos) e busca sem acento (objeto, modalidade, número/ano, processo). Não busca pela empresa vencedora: decidido que não precisa.
   - Cartões: pílula de situação, nº/ano, modalidade, objeto em 3 linhas, prazo ou emissão, e valor. Mostra 30, depois «mostrar mais».
   - Ordem: recebendo propostas pelo prazo mais próximo, depois o resto pela emissão mais recente.
   - «De onde vêm os dados» no fim.
2. **Detalhe**
   - Situação, modalidade (dispensa e inexigibilidade com a explicação "contratação direta, sem licitação"), número, processo e objeto completo.
   - Datas: emissão, propostas, abertura da documentação.
   - Valores: referência e total, ou "Sigiloso".
   - Vencedores agrupados por CNPJ, com os itens, quantidade e preço como vêm, sem subtotal por vencedor. Pessoas físicas ficam num grupo só, sem nome. Cada empresa mostra a linha da Receita (D2, D6).
   - **Itens paginados de 10 em 10** («Mostrar mais 10 · 20 de 57 itens»), nos vencedores e nos itens pedidos.
   - Itens pedidos, documentos, histórico de alterações (R5) e fonte com link para o portal (R4).
3. **Estados:** carregando, erro, busca sem resultado, licitação não encontrada e coleta atrasada (mais de 36 h).
4. **Rodapé:** família (Impostômetro e Gastômetro), repositório e "de onde vêm os dados".

### Regras de tela

- **Situação calculada na hora** (seção 5): "Recebendo propostas" enquanto `fechamento_propostas` não passou. O texto original do portal fica sempre visível.
- **Texto fiel (R6):** `descricao_adicional` vem em HTML, e 4 objetos (`finalidade`) trazem entidades como `&#8220;`. Os dois são mostrados como o portal mostra, mas só como texto (`textoDeHtml`, sem `innerHTML`).
- **R9:** nunca "gasto". O valor de leilão não entra em soma nenhuma.

### Fica para depois

- PNG do og:image e ícones: não há conversor de SVG na máquina, então vai só o `favicon.svg` por enquanto.
- Deploy e domínio (D7). O `deploy.yml` só entra com autorização, porque ele publica a cada push na `main`.

### Andamento do site

**Feito (03/11/2026):**
- `site/` com Vite + React. Tokens e base de CSS copiados do Gastômetro. `BrandMark` com a geometria do `mark.svg` do handoff. `favicon.svg` sem o manifesto C2PA de ~8 KB.
- **Lista:** contagem por situação, filtros (ano, situação, busca sem acento), cartões, "mostrar mais" de 30 em 30, busca vazia, fonte e data da coleta.
- **Detalhe:** situação com o status do portal, objeto, valores e datas.
  - Vencedores agrupados por CNPJ. Pessoas físicas ficam num grupo só, sem nome.
  - Itens pedidos (abertos quando não há vencedor, recolhidos quando há), documentos com link para o PDF, histórico (R5) e link filtrado do portal.
- **Estados:** carregando, erro, licitação não encontrada e coleta atrasada.
- Seção "De onde vêm os dados" no fim da lista: fonte, conferência R2, R9 e privacidade R8.
- `lib/situacao.ts` (seção 5, ordem, busca) e `lib/format.ts`, com 14 testes. Ao todo, 40 testes passando, lint e build sem erros.
- **Conferido no Chrome,** com uma amostra de 2026 passada pelos normalizadores do coletor: lista em tela larga, detalhe com pessoa física e detalhe em celular sem rolagem horizontal.

- **Ajustes de 03/11/2026 com dados completos:**
  - topo e contadores-filtro (ver Telas);
  - itens paginados;
  - texto com entidades HTML;
  - links do portal (`numero-licitacao`) e do documento testados;
  - linha da Receita em cada empresa.

**Falta:**
1. Conferir no Chrome a linha da Receita com o `cnpj.json` real.
2. Conferir o tema claro e o celular a 390 px com os dados completos.
3. PNG de og:image e ícones (`apple-touch-icon`, `icon-192`, `icon-512`) e `manifest.webmanifest`. Dá para gerar pelo Chrome headless.
4. Mais ajustes que o Filipe pedir.

---

## 13. Simplificação das telas (plano de 20/11/2026)

> Pedido do Filipe: o site está cheio, com palavras em cima das outras. Quer algo simples, fácil de ler, com botões que pareçam botões e a informação a poucos cliques. Plano baseado numa navegação em tela larga e em 390 px (lista e detalhe da licitação 54086, com 133 vencedores e 114 itens). **Decisões do Filipe (20/11/2026):** aviso de coleta atrasada vira selo discreto; vencedores como lista compacta com os itens ao clicar; só CSS e markup, sem mexer em dados nem no coletor.

**Escopo:** `site/src/components/Lista.tsx`, `Detalhe.tsx`, `ui.tsx`, `App.tsx` (só o aviso de atraso) e `styles/app.css`. Textos do portal, regras R2, R6, R8 e R9 e a regra «nunca subtotal por vencedor» não mudam.

**Limite que muda o desenho:** com vários vencedores não existe valor por empresa (seção 3). A linha compacta da empresa mostra «N itens», nunca um valor em reais. Só com 1 vencedor aparece o `total` do portal, como hoje.

### Lista

1. **Topo mais baixo.** Título menor (`.topo-t`, `.bignum`), caixa de fonte numa linha só. O aviso de atraso sai do topo e vira um selo ao lado de «coletado em …» (`App.tsx`, `LIMITE_ATRASO_MS`), com o texto «Atualização pendente» e o mesmo critério de 36 h.
2. **Filtros em uma linha de chips:** Todas · Recebendo propostas · Em andamento · Encerradas · Outras, cada um com a contagem. Substitui o título-botão «165 licitações em 2026» e os 4 cartões `.contador`. Chip com borda, fundo e estado marcado (`aria-pressed`) bem visível. A busca e o ano ficam juntos, logo abaixo.
3. **Cartão mais simples:**
   - topo: `Nº/ano` à esquerda e pílula curta à direita, sem quebrar linha (pílula usa «Prazo encerrado» em vez de «Prazo de propostas encerrado» só no cartão; o texto completo continua no detalhe);
   - objeto em 2 linhas; modalidade some do corpo e vira pequena, acima do objeto;
   - rodapé de uma linha: data à esquerda, valor à direita, sem o rótulo repetido «VALOR DOS VENCEDORES» (o rótulo curto «Vencedores» ou «Referência» fica pequeno);
   - seta `›` à direita para indicar que abre.
4. **Botões com cara de botão:** «Mostrar mais» e o seletor de ano com borda e fundo (`.btn2`, `.seg`).
5. **«De onde vêm os dados» recolhido** (`<details>`), com 1 frase visível e o link do portal.

### Detalhe

1. **Primeira tela:** voltar, `Nº/ano`, pílula de status, objeto e 3 números (valor, emissão, prazo). Os outros campos (propostas a partir de, abertura da documentação, processo, status do portal) vão para «Mais detalhes», recolhido.
2. **Vencedores como lista compacta.** Uma linha por empresa: nome, CNPJ, «N itens», e um botão «Ver itens» com seta. Ao abrir, aparecem os itens paginados de 10 em 10 como hoje. Com 1 vencedor, abre já aberto e mostra o `total`.
3. **Itens pedidos, Documentos e Alterações** como seções recolhíveis com o mesmo visual: título, contagem, seta, fundo próprio (hoje só «Itens pedidos» é `<details>`).
4. **Receita Federal:** uma linha curta e discreta. Sem dado, a linha não aparece (hoje repete «não consultados» em cada empresa).
5. **Fonte e «conferir no portal»** continuam no fim.

### Ordem de execução (estimativa total: ~2 h)

1. `app.css`: botão e chip padrão (`.btn2`, novo `.chip`), seta de cartão. ~20 min.
2. `Lista.tsx`: topo, chips, cartão, «De onde vêm os dados» recolhido. ~40 min.
3. `App.tsx`: aviso de atraso vira selo. ~10 min.
4. `Detalhe.tsx`: primeira tela + «Mais detalhes». ~25 min.
5. `Detalhe.tsx`: vencedores compactos e seções recolhíveis. ~30 min.
6. Conferir no Chrome em tela larga e em 390 px (lista, detalhe com 1 vencedor, com 133, pessoa física e sem vencedor). `npm test`, `npx eslint .` e `npm run build`.

**Fora deste plano:** og:image e ícones, `cnpj.json`, deploy.

### Andamento (20/11/2026)

**Feito:** etapas 1 a 5 do plano acima, conferidas no Chrome em tela larga e em 390 px (iframes de 390 px, porque o Chrome ignora o resize da janela). `npm test` (49), `npx eslint .`, `tsc` e `npm run build` passando.

**Desvios do plano**
- Na lista, o ano e a busca ficam **acima** dos chips (e não abaixo), porque as contagens dos chips dependem do ano.
- No detalhe, o «No portal: …» continua ao lado da pílula, fora de «Mais detalhes»: o texto original do portal tem de ficar sempre visível (seção 12).
- Receita Federal: aparece só dentro da empresa aberta, e só quando há dado (sem `cnpj.json`, nada aparece).
- Aviso de atraso virou o selo `Coletado` em `ui.tsx` (lista e detalhe).

**Falta:** o Filipe revisar e pedir ajustes; conferir o detalhe com pessoa física e com 1 vencedor (abre já aberto) no celular; tema claro.

**Seção «De onde vêm os dados» (20/11/2026):** refeita no padrão do Impostômetro e do Gastômetro, em tamanho menor (`site/src/components/Origem.tsx`): título grande, frase de destaque, parágrafo com «Este site é independente e não tem vínculo com a prefeitura», 4 princípios numerados, 3 notas próprias (valor dos vencedores, situação, Receita Federal) e «Status da última coleta» (data e «N licitações com vencedor conferidas ✓», lidos de `manifest.validacao`). `#de-onde-vem` funciona como âncora (App.tsx). O rodapé perdeu o parágrafo «Site independente, não oficial…» (a informação agora está na seção) e ganhou o link «De onde vêm os dados». Fora: download JSON/CSV e histórico geral de alterações (dependem do coletor).
