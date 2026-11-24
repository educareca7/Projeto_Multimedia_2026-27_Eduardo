# App 2 — Artes Marciais 2D (visualizador/jogo arcade)

Substitui por completo o explorador de artes marciais anterior (boneco mal feito
e animações más).

## Menu

- Escolher a arte marcial. Começar com **3: boxe, muay thai, taekwondo**
  (mais se houver tempo).
- Cada arte tem **personagem, stance/guarda característica, técnicas e combos
  próprios** e, idealmente, **fundo próprio**.

## Visualizador

- Personagem em **idle animado** (respiração subtil na guarda).
- **Botões** abaixo executam **técnicas** (ex.: jab) e **combos** (sequências
  predefinidas); no fim de cada animação volta ao idle.
- **Movimento para a frente e para trás.**
- **Controlos de teclado** também.
- **Fundo aberto**, não um espaço fechado: cenário com **parallax**.

## Qualidade das animações — PRIORITÁRIA

- **Rig de esqueleto** (canvas ou SVG) com **proporções humanas corretas**.
- **Keyframes com easing.**
- **Antecipação** antes do golpe.
- **Follow-through** depois do impacto.
- **Rotação de anca/tronco** nos golpes.
- Estilo **silhueta com contorno neon**.

## Jogabilidade

- **Desafio de 60 segundos** com **alvos** (aparadores/sacos) que surgem a
  **alturas e distâncias diferentes**.
- Cada alvo exige o **tipo de golpe certo** e o **posicionamento certo**.
- **Pontuação e combo.**
- **Ecrã final** (jogar de novo / sair).

## Implementação (2026-11-24)

Fluxo: intro (regras passo a passo) → escolha da arte → treino livre
(visualizador) → «Começar desafio» → contagem 3-2-1 → 60 s → resultado.

### Ficheiros (`site/artes/`)

| Ficheiro | Conteúdo |
|---|---|
| `rig.js` | Esqueleto 2D com proporções antropométricas (1,80 m). Braços/tronco em FK; pernas em IK de 2 ossos (pés cravados no chão; nos pontapés o pé segue um alvo no ar). `rotOmbros`/`rotAnca` = rotação em profundidade. Desenho de **figura humana ilustrada**: volumes musculares (cápsulas com ventre), perfil da cabeça com cabelo, roupa de cada arte, contorno escuro fino; lado afastado mais escuro. Tronco com cintura escapular (ombros) e largura projetada como elipse; sombreado de volume por membro; braços/pernas de trás que passam à frente ligam-se ao ombro/anca **sem costura** (zona de ligação repintada sem contorno). Pé apoiado nunca entra no chão. |
| `tecnicas.js` | As 3 artes: guarda, ritmo de idle, técnicas (keyframes), combos e `aparencia` (pele, cabelo, roupa, luvas). **Para afinar animações ou o visual dos lutadores, editar aqui.** |
| `animacao.js` | Motor: interpolação **cúbica monótona** entre chaves (velocidade contínua, sem paragens em cada pose) com o easing a deformar só o tempo do troço; **cadeia cinética** (anca arranca primeiro, depois tronco e membro; cabeça e mão de guarda atrasadas); pausa de impacto (`pausar`); encadeamento de técnicas a meio da recuperação; passos com deslocamento; camada de idle; rasto do golpe; `aoIniciar` para os sons. |
| `cenarios.js` | Cenários naturais ao ar livre com parallax e perspetiva atmosférica: boxe (ringue num parque ao fim da tarde), muay thai (campo de treino tailandês: montanhas cársicas, templo, palmeiras, estrado de madeira), taekwondo (pátio de pedra de um templo na montanha: pagode, pavilhão hanok, pinheiros, cerejeira, pétalas). Cada camada estática é pintada uma vez para uma imagem em cache (as longínquas a meia resolução = desfoque de profundidade). Animados: nuvens, raios de sol, halo dos candeeiros, pirilampos, borboletas, névoa, pétalas. Primeiro plano numa faixa no topo do ecrã (ramos, beiral de colmo, lanternas de lótus) + vinheta: nunca tapa alvos nem marcas. |
| `sons.js` | Sons sintetizados (Web Audio, sem ficheiros): «whoosh» do golpe a crescer até ao impacto (dois nos giratórios), voz do lutador com formantes («huss»/«tss» nos golpes leves, «hah» nos pesados, kihap no taekwondo), esquivas, saco a ranger e correntes a chiar em cada balanço (objetos chamam `aoBalanco`), impacto próprio de cada objeto (saco, reflexos, bananeira, tábua a partir), passos por piso (lona, madeira, pedra), ambiente por cenário (cidade e grilos; selva com insetos e pássaros; vento, pássaros e sino do templo) e sinais do desafio (contagem, sino do ringue, acerto que sobe de tom com o combo). |
| `objetos.js` | Alvos físicos: saco de reflexos (mola 2D), saco pesado / tailandês / de uppercut (pêndulo), tronco de bananeira (abana), tábua (parte em duas). Fita branca marca a zona certa. |
| `artes.js` | Interface, treino, desafio, efeitos (pó, estrela de impacto, lascas) e resultado. Regras em `CONFIG`. Em PC a arena (palco + painel lateral de controlos) ajusta-se à altura do ecrã: **sem scroll**. |

### Artes, técnicas e teclas

| Arte | Técnicas (Z X C V B N · Q W E) | Combos (1–6) |
|---|---|---|
| Boxe | Jab Z, Direto X, Gancho C, Uppercut V, Gancho ao corpo B; esquivas: Esquiva Q, Pêndulo W | 1-2 · 1-2-3 · Gancho + Uppercut · Esquiva + Direto · Corpo + Cabeça · Pêndulo + 3-2 |
| Muay Thai | Jab Z, Direto X, Cotovelada C, Joelhada V, Pontapé circular B, Teep N, Cotovelada giratória Q, Pontapé giratório W, Joelhada voadora E | 1-2 + Pontapé · Cotovelada + Joelhada · Teep + Circular · Jab + Cotov. giratória · 1-2 + Giratório · Direto + Joelho voador |
| Taekwondo | Ap Z, Dollyo X, Yeop C, Naeryo V, Jireugi B, Dwit chagi Q (giratório para trás), Tornado W (360° no ar), Huryeo giratório E | Ap + Dollyo · Yeop + Dollyo · Jireugi + Dollyo · Dollyo + Dwit · Ap + Tornado · Dollyo + Huryeo |

Movimento: ← → (ou A D), passos de 0,25 m. Som: tecla M. Sem legendas no
treino (a descrição de cada golpe fica só na dica do botão).

Golpes giratórios: parâmetro `giro` (corpo inteiro) e `olhar` (cabeça). O
esqueleto é sempre calculado virado para a direita e o giro aplica-se como
cos(giro) em x à volta da bacia (`paraMundo` em `rig.js`); de costas trocam-se
os papéis dos membros no desenho. O peso fica sobre o pé de apoio (px ≈ pfX)
para ele não deslizar. Gancho: braço e antebraço "encurtados" (`bfQ`, `bfP`)
porque o cotovelo aponta para o lado e o antebraço atravessa.

Cada técnica tem antecipação → impacto (com rotação de anca/ombros) →
follow-through → recuperação. Golpes com membros de trás passam para a camada
da frente durante o golpe para se lerem bem.

### Regras do desafio (`CONFIG` em `artes.js`)

- Um alvo de cada vez, como **objeto real** adequado à arte: boxe → saco de
  reflexos (jab, direto), saco pesado (gancho), saco de uppercut; muay thai →
  saco tailandês comprido (socos, cotovelo, joelho), tronco de bananeira
  (pontapé circular); taekwondo → tábuas que partem.
- Cada objeto tem uma **etiqueta de papel** com a técnica pedida, a tecla e o
  tempo restante, e fica a uma distância que obriga a mexer (pegadas de giz no
  chão + indicação «Avança ▶»/«◀ Recua»).
- Acerto = técnica pedida **e** ponto de impacto do membro na zona marcada do
  objeto (posição real calculada pelo rig no instante do impacto). Bater com a
  técnica errada mexe o objeto mas não conta.
- Objetos dos golpes novos: gancho ao corpo → saco pesado; teep, giratórios e
  joelhada voadora → saco tailandês; giratórios e tornado do taekwondo → tábuas.
  As esquivas não têm alvo.
- Pontos: soco 100, cotovelo 120, joelho 130, pontapé 150; bónus de rapidez até
  +50%; combo +0,25 por acerto seguido (máx. ×3). Alvo que foge (5 s → 3 s)
  repõe o combo.
- Acerto: pausa de impacto (~0,07 s), tremor, estrela, pó/lascas e som.
- Resultado: pontos, alvos acertados, melhor combo, precisão, técnica favorita.

Testes: `artes/?depurar` expõe `window.__artes` (lutador, desafio, técnicas)
para testes automáticos.

### Revisão visual (2026-11-24, pedido do utilizador)

Trocou-se o estilo «stickman neon» por personagens humanos ilustrados e os
cenários futuristas por cenários naturais ligados a cada arte; os alvos
passaram a objetos físicos; os controlos passaram para um painel ao lado do
palco para não haver scroll.

### Revisão de movimento, desenho, cenários e som (2026-11-24, pedido do utilizador)

Golpes mais humanos (curvas suaves + cadeia cinética + pausa de impacto),
lutadores sem falhas entre membros (ombros, ancas, pescoço) e com volume,
guardas corrigidas (luva de trás à frente do queixo no boxe, mão de trás ao peito
no taekwondo), cenários muito mais detalhados e som em toda a app.

### Mais golpes, sons do lutador e sem legendas (2026-11-24, pedido do utilizador)

Gancho e uppercut refeitos (mecânica real), golpes novos e esquivas no boxe,
giratórios/voadores no muay thai e no taekwondo, 6 combos por arte, voz do
lutador e balanço audível dos sacos; legendas do treino removidas.

### Versão noturna com néon (2026-11-24, pedido do utilizador)

O utilizador achou que os cenários de dia não condiziam com o estilo neon do
resto do site. Os três cenários passaram para a **noite**, mantendo o sítio de
cada arte:

- **Boxe:** ringue de rua numa cidade (prédios com letreiros de néon, o «BOXE»
  pisca), rede de arame, candeeiros frios, cordas de néon, lona azul-escura com
  reflexos, avental com «SALÃO ARCADE», treliça de projetores no topo.
- **Muay Thai:** montanhas cársicas em silhueta, lua, templo e chedi iluminados
  a dourado, palmeiras em silhueta, fio de lâmpadas, letreiro «MUAY THAI»,
  pirilampos, estrado escuro, beiral de colmo com lâmpadas.
- **Taekwondo:** montanhas ao luar, névoa azulada, pavilhão com portas de papel
  acesas, letreiro «태권도» no muro, cerejeira com brilho rosa, lanternas acesas.

Comum (`cenarios.js`): `neonTexto`/`letreiro` (tubo de néon com halo),
`estrelas`, `lua`, `holofote` (feixe que segue o lutador, com pó), `halos`,
`fioLampadas`, `pirilampos`. A cache das camadas limpa-se quando a fonte acaba
de carregar (`document.fonts.ready`).

Em `artes.js`: o lutador é desenhado numa imagem à parte e ganha **contorno de
luz** (uma cor de cada lado, `LUZ_LUTADOR` por arte) e um tom frio; sombras
neutras; etiqueta do alvo em placa escura com contorno néon; marcas no chão a
brilhar em verde; estrela de impacto branca com brilho ciano; prévias da escolha
de arte com fundo noturno. Em `objetos.js`: cores das categorias em néon e
suportes em metal escuro.


## Servidor (Python, `servidor/artes.py`)

- O servidor é o árbitro do desafio: `POST /api/artes/partida {arte}` →
  `/<id>/alvo` (técnica pedida, tempo de espera e sorteio da posição) →
  `/<id>/acerto {indice, tecnica}` (confirma alvo/técnica/tempo e devolve os
  pontos e o combo) → `/<id>/fugiu` → `/<id>/fim` (estatísticas + bilhete).
- Pontos = (base da categoria + bónus de rapidez) × combo (`CONFIG` no servidor).
- `FOLGA_LENTIDAO = 1.6`: num PC lento o relógio do jogo atrasa-se em relação
  ao real; o servidor aceita esse atraso.
- A animação, a física dos alvos e o som continuam no browser.
