# App 3 — Escape room "Última Ficha"

## História

O jogador adormeceu num salão de arcade antigo e ficou trancado depois da hora
de fecho. Tem **8 minutos** para sair antes do alarme.

## Interface

- Sala com **4 paredes** navegáveis por **setas**.
- **Point-and-click** em objetos.
- **Inventário** em barra inferior: selecionar um item e clicar onde o usar.
- **3 dicas**, cada uma custa **30 segundos**.

## Cadeia de enigmas

1. **Quadro elétrico** — ligar cabos coloridos segundo um esquema meio rasgado
   num poster → **volta a luz**.
2. **Jukebox** — repetir uma sequência de 4 sons/luzes → **cai uma ficha**.
3. **Máquina de garra** — usar a ficha; mini-jogo de timing → **apanhar uma chave**.
4. **Gaveta do balcão** — a chave abre-a → **lanterna UV**; apontada às paredes
   revela **números escondidos**.
5. **Máquina principal** — código de 4 dígitos cuja **ordem é dada pelo quadro de
   recordes** (iniciais ↔ símbolos junto aos números) → **mini-jogo retro de ~20 s**
   (Pong ou Snake) → **porta destrancada**.

## Técnica

- Cenários em **SVG/CSS neon**, coerentes com o dashboard.
- **Estado central** (`energiaLigada`, `temFicha`, `temChave`, ...).
- Cada mini-puzzle num **modal independente**.
- Sons opcionais.

## Ecrã final

**Tempo**, **dicas usadas** e **rank S/A/B/C**. Opções: jogar de novo / sair.

## Plano de corte (se o tempo apertar)

Opções (a decidir na altura):

- cortar a máquina de garra, **ou**
- cortar o mini-jogo final, **ou**
- reduzir para 2 paredes.

## Implementação (2026-11-24, versão 2)

O utilizador pediu mais conteúdo com lógica, mais divisões, melhor navegação e
enigmas menos óbvios (sem ficar muito difícil). Mudanças em relação à spec
original: **10 minutos** (2:50 → 3:00), uma segunda divisão (escritório) e uma
cadeia mais longa com pistas cruzadas entre divisões.

### Divisões e navegação

- **Salão** (4 paredes): 0 Saída · 1 Jukebox · 2 Máquina de garra · 3 Balcão.
- **Escritório** (2 paredes): 4 Secretária · 5 Cacifos. Entra-se pela porta
  PRIVADO (Balcão) e volta-se pela porta «SALÃO» (Cacifos).
- Setas com o nome da parede vizinha, ← →, **planta clicável** (divisões,
  paredes vistas, para onde se está a olhar, escritório trancado com cadeado),
  transição a deslizar entre paredes e "entrar" ao mudar de divisão.
- Rótulo com o nome do objeto junto ao cursor; o item na mão segue o cursor.

### Cadeia de enigmas

1. **Fusível** escondido no vaso (salão, às escuras: brilha de vez em quando).
2. **Quadro elétrico**: pôr o fusível e ligar 4 cabos. A **nota do eletricista**
   (em cima do balcão) tem 3–4 **pistas lógicas** geradas ao acaso com uma única
   solução (pontas, par/ímpar, «logo abaixo», «mais acima», somas...). As
   lâmpadas dizem quantas ligações estão certas.
3. **Jukebox** (8 discos com ano e lado): o **cartaz do torneio** diz o ano e o
   lado do hino oficial; há duas canções desse ano (A e B). Dá a ficha.
4. **Garra** com a ficha: timing para apanhar o **cartão de acesso** (3 tentativas;
   se falhar, a jukebox volta a dar ficha).
5. **Porta PRIVADO** com o cartão → escritório.
6. **Computador**: senha = iniciais do 1.º dos **recordes** + **ano do torneio**
   (post-it «campeão + ano»). O email diz que o cofre usa a hora de fecho ao domingo.
7. **Cofre**: a hora de domingo no **horário** da parede (só números) → lanterna UV sem pilhas.
8. **Pilhas** do comando da TV + lanterna (combinar no inventário).
9. **UV**: 4 marcas (2 no salão, 2 no escritório); código = dígitos pela ordem dos
   símbolos nos recordes → máquina ÚLTIMA FICHA → squash de 20 s → porta.

Itens: fusível, nota (lê-se), ficha, cartão, lanterna, pilhas, lanterna UV.
Textos de exame dão contexto sem dizer o que fazer; as 3 dicas (−30 s) dependem
do passo atual. Tudo é sorteado por partida (ligações e pistas, ano, lado,
músicas, campeão, hora de domingo, símbolos, dígitos, posição do cartão).

### Ficheiros (`site/escape/`)

| Ficheiro | Conteúdo |
|---|---|
| `cenas.js` | 6 paredes em SVG; estados por classes no `<svg>`; marcas UV. |
| `puzzles.js` | Quadro, jukebox (discos), garra, teclado numérico genérico (máquina final e cofre), computador, squash, e vistas de perto (nota, cartaz, horário, cortiça, recordes). |
| `escape.js` | Gerador dos dados (pistas lógicas, músicas...), estado, navegação/planta, inventário (ler/combinar), interações, dicas, rank. `?depurar` → `window.__escape`. |
| `sons.js` | Sons da sala (inclui jukebox, fusível, leitor de cartões, combinar, portas). |
| `escape.css` | Sala, planta, rótulo, cursor do item, janelas, estados. |

Rank: S (≥ 4:00 de sobra e 0 dicas), A (≥ 2:30 e ≤ 1 dica), B (≥ 1:00), C;
alarme = «Apanhado» (X).

### Conforto de jogo (2026-11-24, pedido do utilizador)

- **Caderno** (botão na barra, botão na janela dos enigmas, tecla N): guarda
  automaticamente o que já se leu (nota do eletricista, cartaz, recordes,
  post-it, email, horário, cortiça), as **marcas UV** encontradas (símbolo,
  dígito e parede; ficam apontadas quando a luz passa por cima) e as
  **tentativas** (cabos com n.º de certas, senhas, códigos). Abre ao lado de um
  enigma sem o fechar; com um enigma aberto, clicar na nota no inventário abre-a
  no caderno. Contador «+N» de entradas novas.
- **Os enigmas não fazem reset**: os cabos ficam ligados ao fechar o quadro
  (e as lâmpadas mostram o último resultado); «Desligar todos» e clicar numa
  tomada ocupada desliga-a; jukebox marca os discos já ouvidos; teclados
  mostram «Já tentaste: …».
- Teclas 1–6 pegam no item do inventário; Esc fecha enigma → caderno → item.
- **Planta** maior, com título, nomes das divisões e das paredes, cone de visão
  a partir de «tu», parede atual realçada e legenda («Estás a olhar para…» /
  «Ir para…» ao passar o rato).


## Servidor (Python, `servidor/escape.py`)

- `gerar_partida()` sorteia tudo e separa o que é público (pistas, cartaz,
  recordes, horário, marcas UV) das soluções (ligações, disco, senha, códigos),
  que nunca vão para o browser.
- Pistas dos cabos: `gerar_pistas_cabos()` testa as 24 ligações
  (`itertools.permutations`), escolhe pistas verdadeiras até sobrar uma
  solução, tira as redundantes e garante pelo menos 3.
- `POST /api/escape/partida`, `/<id>/cabos` (devolve quantas certas),
  `/<id>/disco`, `/<id>/senha`, `/<id>/cofre`, `/<id>/codigo`, `/<id>/dica`
  (máx. 3, −30 s), `/<id>/fim` (tempo pelo relógio do servidor, rank,
  enigmas, pontos e bilhete). Só se escapa com o código validado no servidor.
- Pontos: 100 por enigma; se escapou, +10 por segundo que sobra e +300 por dica
  não usada.
