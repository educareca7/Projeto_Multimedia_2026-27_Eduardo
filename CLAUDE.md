# Salão Arcade — Projeto Web

Website com um **dashboard inicial** onde 3 widgets (máquinas de arcade) dão
acesso a 3 jogos. Trabalho académico (Oficina de Multimédia).
**Prazo: 2026-11-26.** Sem restrições técnicas.

## Especificações — ler antes de mexer numa app

`docs/` é a fonte de verdade. Se o código divergir de `docs/`, segue `docs/`.

- [docs/00-visao-geral.md](docs/00-visao-geral.md): regra geral, estilo, ordem de trabalho
- [docs/app-1-geografia.md](docs/app-1-geografia.md): Detetive de Países (`/geo/`)
- [docs/app-2-artes-marciais.md](docs/app-2-artes-marciais.md): Artes Marciais 2D (`/artes/`)
- [docs/app-3-escape-room.md](docs/app-3-escape-room.md): Última Ficha (`/escape/`)

## Regras que se aplicam a tudo

- **Jogar uma vez e sair:** sem níveis, progressão ou campanhas. Cada app:
  intro → partida → ecrã de resultado → jogar de novo / sair.
- **Estilo:** arcade neon. Fundo escuro, acentos `--cyan` e `--magenta`
  (`--amber` para pontos); `--accent` por página (`style="--accent: ..."` no body).
  Fonte pixel Silkscreen (`--font-pixel`) **só em títulos**; Chakra Petch
  (`--font-sans`) no resto, incluindo dentro dos jogos. `.title-arcade` = título
  neon na cor de acento. Scanlines subtis em `body::after`. Componentes em
  `shared/base.css`: `.btn` (`--primary`, `--red`/`--magenta`, `--ghost`), `.chip`,
  `.screen-card`, `.eyebrow`, `.how-to`, `.big-score`, `.stat`.
  (Um estilo "Farflung"/papel vintage foi experimentado e rejeitado a 2026-11-24.)
- **Dashboard:** capas ricas e animadas nas máquinas; **sem scroll em PC**
  (media query em `dashboard.css` ajusta à altura do ecrã); descrição discreta.
- **Ordem de trabalho:** dashboard + estilo + navegação → App 1 → App 2 → App 3
  → polimento. Tudo a funcionar primeiro, embelezar depois.
- **Passos pequenos e testáveis.** No fim de cada app, dizer ao utilizador
  como a testar e **esperar a aprovação dele antes de começar a app seguinte**.
- O utilizador **não usa Git**: não sugerir nem lembrar commits.
- Texto visível em **português europeu**, tratamento por "tu".

## Stack

- O trabalho deve ser **focado em Python** (pedido do utilizador, 2026-11-24):
  **servidor Flask** (`servidor/`) com a lógica dos jogos (sorteios, soluções,
  validação, tempo, pontuação, rank), **SQLite** para recordes e **Jinja** para a
  página de recordes. O browser (HTML + CSS + JavaScript ES modules, sem
  framework nem build) só desenha, anima, toca sons e envia as ações para
  `/api/...` (`site/shared/api.js`). **Regra: lógica nova de jogo vai para
  Python**; o JavaScript nunca recebe as soluções.
- Bibliotecas e dados de terceiros ficam **locais** (a apresentação pode ser
  sem Internet). Todos os caminhos no site são **relativos**.

```powershell
python -m pip install -r requirements.txt
python app.py                                # http://127.0.0.1:5000
python -m unittest discover -s testes -t .   # testes
```

## Estrutura

```
app.py                  arranque (cria a app com servidor.criar_app())
servidor/               Python: __init__.py (app + site estático, Cache-Control no-cache),
                        partidas.py (partidas em memória), recordes.py (SQLite + bilhetes +
                        /recordes/), geo.py, artes.py, escape.py (regras + API de cada jogo),
                        dados/paises/*.json (base de dados, não pública), templates/
dados/salao.db          recordes (SQLite, criado sozinho)
testes/                 unittest: regras e API de cada jogo e dos recordes
site/
  index.html            dashboard (dashboard.css, dashboard.js)
  shared/
    base.css            tokens, botões, topbar, ecrãs intro/resultado, chips de HUD
    shell.js            createGameShell(): ciclo intro → jogo → resultado
    regras.js           regras da intro passo a passo: <ol class="how-to" data-passos>,
                        cada <li> pode ter um <svg class="rule-icon"> (ativado pelo shell)
    som.js              som sintetizado (Web Audio, sem ficheiros): som.ui("certo"|"errado"|...),
                        blocos som.tom/ruido/sino, botão de som na topbar (tecla M), preferência guardada
    api.js              enviar()/obter() para /api/ (ErroApi com a mensagem do servidor)
    recordes.js/.css    caixa "guarda o teu recorde" nos ecrãs finais + estilo da página
    fonts/              Silkscreen Bold + Chakra Petch (OFL), self-hosted
  geo/  artes/  escape/ uma pasta por app: index.html + <app>.js (+ CSS/dados próprios)
docs/                   especificações (fonte de verdade)
```

Padrão de cada página de app: `<header class="topbar">` com "← Salão" e
`<section data-screen="intro|game|result">`. Botões `data-action="start"` e
`data-action="again"` arrancam a partida via `createGameShell({ onStart })`;
no fim, o jogo chama `shell.show("result")`.

## Estado

- [x] Passo 1: dashboard, estilo base, navegação, esqueleto das 3 apps
- [x] Volta ao neon com capas ricas, Chakra Petch e dashboard sem scroll (2026-11-24)
- [x] App 1: Detetive de Países, versão 2 (pistas reveladas por erros, 90 s,
  165 países); **aprovada pelo utilizador**
  - `site/geo/`: `geo.js` (regras em `CONFIG` no topo), `geo.css`,
    `nomes-paises.js` (id ISO numérico → nome pt-PT via `Intl.DisplayNames`),
    `data/paises/<continente>.json` (base de dados: 165 países × 6 pistas,
    da mais difícil para a mais fácil), `data/countries-110m.json`, `vendor/` (D3, topojson)
- [x] App 2: Artes Marciais; **aprovada pelo utilizador**. Detalhes em docs/app-2-artes-marciais.md
  (rig e desenho dos lutadores em `rig.js`, keyframes e aparência em `tecnicas.js`,
  motor em `animacao.js`, cenários em `cenarios.js`, alvos físicos em `objetos.js`,
  sons em `sons.js`). Revisões a 2026-11-24: movimento/desenho/cenários/som e
  depois mais golpes (giratórios, esquivas), voz do lutador, sem legendas;
  depois **cenários noturnos com néon** (polimento, a aguardar aprovação).
- [x] Som (`shared/som.js`): App 1 (clique errado, nova pista, certo, tempo a acabar,
  fanfarra) e App 2 (golpes, impactos, passos, ambiente, desafio)
- [x] App 3: Última Ficha, versão 2 (salão + escritório, 10 min, pistas cruzadas,
  caderno, planta); **funcionalidade aprovada pelo utilizador**. Detalhes em docs/app-3-escape-room.md
  (`cenas.js` paredes SVG, `puzzles.js` mini-puzzles, `escape.js` dados/estado/
  navegação/inventário/dicas/rank, `sons.js`).
- [x] Lógica dos 3 jogos passada para Python (2026-11-24): API por jogo, soluções só
  no servidor, pontuações/rank no servidor, recordes em SQLite com bilhetes de uso
  único, página /recordes/ (Jinja), 26 testes. **A aguardar teste do utilizador.**
- [ ] Polimento (em curso: App 2 passou a noturna/néon para condizer com o resto)
