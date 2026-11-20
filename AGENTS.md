# AGENTS.md

Licitações Rolante: site estático que mostra o que a Prefeitura de Rolante está licitando, a situação de cada
licitação e quem venceu, com dados do Portal da Transparência. Irmão do
[Impostômetro Rolante](https://github.com/filipesfbr/impostometro-rolante) e do
[Gastômetro Rolante](https://github.com/filipesfbr/gastometro-rolante). Visão geral, comandos e dados:
`README.md`. Plano de trabalho: `docs/plano.md`.

## Regras que não podem quebrar

- **`docs/fonte-de-verdade.md` (R1–R9) manda.** O site copia e organiza o que o portal publica: sem estimativa,
  resumo ou classificação de fornecedor como suspeito ou regular.
- **R2:** por licitação, linhas recebidas == `recordsTotal` e a soma de quantidade × valor dos vencedores bate,
  em decimal exato (`coletor/src/validar.ts`, nunca float), com o `total` do portal. Falhou: nada é commitado.
- **R8:** nome e documento de pessoa física nunca chegam ao repositório, nem em log de erro. Todo texto livre do
  portal passa por `mascararCpf`. Os campos são copiados um a um em `coletor/src/normalizar.ts` (lista de
  permitidos); campo novo da API não vai para os dados. O `coleta.yml` confere isso antes de commitar.
- **R3:** a branch `data` é o registro público e imutável dos snapshots. Nunca escrever na `main` a partir da coleta.
- O valor dos vencedores nunca é chamado de «gasto» (registro de preços é teto, leilão é receita).
- API do portal: 1 chamada a cada 2 s; parâmetro vazio é string vazia (nunca o texto `null`); o portal responde
  429/403 com reCAPTCHA quando passa do ritmo.
- Dados da Receita (BrasilAPI, Minha Receita): só abertura, situação e matriz/filial, sempre rotulados como outra
  fonte. No máximo 60 consultas por coleta; 3 falhas seguidas abandonam a fila.
- Fixtures sintéticas, sem nomes de pessoas ou empresas reais.

## Identidade visual

Fonte de verdade em `docs/brand/licitacoes-rolante/`. Cor só em `site/src/styles/tokens.css` (um único acento:
terracota, âmbar no escuro); sem sombras nem gradientes; fonte Inter local; marca só via
`BrandMark`/`BrandLockup`.

## Pipeline

Padrão do repositório [`workflow-test`](https://github.com/filipesfbr/workflow-test): leia o README de lá antes
de mudar `ci.yml`, `bump.yml` ou `release.yml`. As guardas (bump na `develop`, release que nunca escreve na
`main`, guarda de tag, sync que falha em conflito) seguram problemas reais.

Específico daqui: `coleta.yml` (07:17 de Brasília) commita na branch `data` e chama o deploy, porque push com
`GITHUB_TOKEN` não dispara workflow. Actions fixadas por SHA; o token de escrita só entra no passo de push.
Repositório público: todo commit, log de Actions e dado na `data` fica registrado para sempre.
