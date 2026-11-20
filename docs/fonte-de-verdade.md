# Fonte de verdade — Licitações Rolante

> Definição de onde vem cada dado do site e das regras para exibi-lo.
> Rascunho de 02/11/2026. Estas regras valerão para o coletor e para o site.
> Adaptado de `impostometro-rolante/docs/fonte-de-verdade.md` e `gastometro-rolante/docs/fonte-de-verdade.md`.

---

## 1. Definição

> **A única fonte de verdade sobre licitações é o Portal da Transparência da Prefeitura Municipal de Rolante**
> (https://transparencia.abase.com.br/licitacoes/apvqyIT7vjY=, operado pela Abase Sistemas),
> **entidade "Prefeitura Municipal de Rolante"** (`entidade=0`).
>
> Um dado está correto quando é **igual ao que o portal exibe** para a mesma licitação.

O site **não produz dados**: ele copia, organiza e mostra o que o portal publica. A nossa base é um **espelho datado** do portal, nunca a fonte.

---

## 2. Hierarquia

| Nível | O quê | Origem | Papel |
|---|---|---|---|
| **1. Fonte de verdade** | Licitação: objeto, modalidade, status, datas, valor de referência e `total` | `Usuario/Licitacao/ListaLicitacoes` | define o dado |
| **2. Detalhe** | Vencedores e valor por item | `ListaVencedoresDetalhesLicitacao` | só é aceito se passar na conferência da R2 |
| **2. Detalhe** | Itens pedidos | `ListaItensDetalhesLicitacao` | mostra o que está sendo requisitado |
| **2. Detalhe** | Documentos | `ListaAnexosLicitacoes` | link para edital e anexos |
| Apoio (D2) | Data de abertura e situação cadastral do CNPJ | Dados da Receita Federal, por API de terceiros | sempre rotulado como outra fonte. Nunca altera dado do portal |
| Espelho | Snapshots diários | nossa coleta | cópia auditável, nunca fonte |

---

## 3. Regras

**R1 — Nenhum dado sem origem.** Todo valor exibido vem do portal. Única exceção: os dados de CNPJ da Receita Federal (D2), sempre rotulados como outra fonte, e o intervalo entre a abertura da empresa e a emissão da licitação (D6), calculado só dessas duas datas. **Proibido:** projeção, estimativa, resumo, reescrita, classificação por inferência e qualquer selo de suspeita ou de regularidade.

**R2 — Conferência.** O portal não tem totalizador de licitações. Uma coleta só é publicada se, para cada licitação do período:

1. o número de linhas recebidas for igual a `recordsTotal`;
2. a soma de `quantidade_item × valor_vencedor`, em decimal exato e arredondada só no fim para 2 casas, for igual ao `total` do portal;
3. nenhuma linha de vencedor tiver quantidade ou valor nulo, zero ou negativo, nem documento vazio. Exceção: quantidade 0 é aceita quando o item da mesma licitação (mesmo lote e sequência) está cadastrado no portal com quantidade máxima 0 (caso da licitação 46121, itens 62 a 64); a linha entra com 0 e contribui 0 para a soma;
4. o documento de cada vencedor for um CNPJ de 14 dígitos ou um CPF mascarado.

Se qualquer item falhar, **nada é publicado** e o site continua na coleta anterior. A soma serve **só para conferir**: o valor exibido é sempre o `total` do portal. Linhas de vencedor **não são deduplicadas**.

**R3 — Snapshot imutável.** Cada coleta guarda os dados, a data e hora da coleta e o hash SHA-256 de cada arquivo. O histórico da branch `data` é o registro do que o portal mostrava em cada data.

**R4 — Rastreabilidade na tela.** Cada licitação exibe a fonte, a data da coleta e o link para conferir no portal.

**R5 — Mudanças retroativas.** O site mostra o último snapshot válido. Cada alteração de status ou de valor em relação ao anterior entra num histórico público.

**R6 — Texto fiel.** Objeto, itens, modalidade e nomes de empresa são exibidos **exatamente como vêm do portal**, sem resumo, reescrita, corte ou ajuste de maiúsculas. A apresentação pode facilitar a leitura, como recolher um texto longo com o texto integral a um clique. O rótulo de um status ou o título de um campo pode mudar para ficar mais legível, desde que não altere o entendimento e o status original do portal continue visível.

**R7 — Escopo.** Só a **Prefeitura**. Ano atual e ano anterior.

**R8 — Privacidade.**

- **Empresa:** nome e CNPJ são exibidos como vêm do portal.
- **Número de CPF dentro do nome de uma empresa:** é mascarado antes de gravar. É a única exceção à R6.
- **Pessoa física:** exibida só como "Pessoa física" (D1). Nome e CPF mascarado (`***.***.***-99`) **nunca são gravados**: o coletor confere o documento (R2, item 4) em memória e grava só o tipo "pessoa física". A branch `data` é pública e o histórico do git é permanente, então nada que não pode ser exibido entra nela.
- **Dados de CNPJ:** nunca gravar sócios (`qsa`), e-mail, telefone ou endereço, mesmo que a API os devolva.
- **Fixtures:** sem nomes de pessoas físicas.

**R9 — Valor não é gasto.** O `total` é o valor dos vencedores na licitação. Registro de preços é teto de compra, e leilão é receita. O site nunca chama esse valor de "gasto" nem o soma ao valor de leilão.

---

## 4. O que esta conferência não garante

A R2 prova que a lista e os vencedores concordam entre si, não que o portal lançou o valor certo. Um erro na origem passa na conferência e é repetido pelo site, como pode ser o caso da licitação 47390 (2015), com R$ 95.646.667,59 de total contra R$ 6.369.405,47 de referência. Por definição, o site espelha o portal.
