# Salão Arcade

| | |
|---|---|
| **Nome da Aplicação / Dashboard Web** | Salão Arcade |
| **Disciplina** | Oficina de Multimédia – 12.º Ano – CRSI |
| **Ano Letivo** | 2026/2027 |
| **Autor** | _Eduardo Gonçalves_ |
| **Turma** | _12ºA2_ |
| **Link da Aplicação Web** | _[Link]_ |

---

## 1. Visão Geral do Projeto

**Descrição:** O Salão Arcade é um *dashboard* web em estilo arcade néon. Na página inicial há três "máquinas de arcade", cada uma com um jogo diferente:
- **Detetive de Países:** descobrir um país num mapa-mundo a partir de pistas de cultura e história.
- **Artes Marciais:** treinar técnicas de boxe, muay thai e taekwondo e fazer um desafio de 60 segundos contra alvos.
- **Última Ficha:** um *escape room* num salão de arcade.

Cada jogo é uma partida única (início, fim, resultado, jogar de novo ou sair), e as pontuações ficam guardadas numa tabela de recordes.

**Proposta Escolhida:** Proposta 2

---

## 2. Estrutura do Código e Funcionalidades Integradas

Já existia um código base. Analisei-o com a IA e decidi substituí-lo por três jogos novos, desenhados por mim e construídos com o Claude.

A aplicação é um servidor em **Python (Flask)** com uma interface no browser (HTML, CSS e JavaScript). A divisão de trabalho é esta:

| Python, no servidor (`servidor/`) | JavaScript, no browser (`site/`) |
|---|---|
| Sorteia cada partida e guarda as soluções (o browser nunca as recebe) | Desenha o mapa (D3), as salas (SVG) e os lutadores (canvas) |
| Verifica cada resposta: país clicado, cabos, disco, senha, códigos, golpes | Envia ao servidor o que o jogador fez e mostra a resposta |
| Mede o tempo e calcula pontos, combos, rank e estatísticas | Mostra o relógio, toca os sons (Web Audio) e os efeitos |
| Guarda os recordes numa base de dados **SQLite** | Caixa para o jogador escrever o nome no fim |
| Gera a página de recordes com um *template* **Jinja** | |

**Funcionalidades integradas**

- **Dashboard:** três máquinas com capas animadas e atalhos de teclado (1, 2, 3). Cabe no ecrã do PC sem *scroll* e tem ligação para os recordes.
- **Comum aos três jogos:** regras de introdução passo a passo, som sintetizado (sem ficheiros de áudio) com botão para silenciar (tecla M) e ecrã de resultado com tabela de recordes.
- **Detetive de Países:**
  - 5 rondas com 90 segundos cada;
  - base de dados de 165 países com 6 pistas cada, que só o servidor lê;
  - cada clique errado revela uma pista mais fácil;
  - a pontuação junta um bónus de tempo e um combo de acertos seguidos.
- **Artes Marciais:**
  - três artes, cada uma com a sua guarda, 7 a 9 técnicas (incluindo pontapés giratórios, tornado, esquivas) e 6 combos;
  - lutadores com esqueleto animado (*rig*), cenários noturnos com néon e efeitos sonoros;
  - desafio de 60 segundos contra alvos físicos (sacos, aparadores, tábuas), com o servidor a funcionar como árbitro.
- **Última Ficha:**
  - duas divisões (salão e escritório), planta clicável, inventário com itens que se leem e se combinam, e um caderno que guarda as pistas;
  - 9 enigmas encadeados, sorteados de novo em cada partida. As pistas lógicas dos cabos são geradas em Python com `itertools.permutations`: o servidor testa as 24 ligações possíveis até sobrar uma única solução;
  - 3 dicas (cada uma custa 30 s), 10 minutos e rank S/A/B/C.
- **Recordes:** no fim de cada partida, o servidor entrega um "bilhete" de uso único com a pontuação que ele próprio calculou. Só com esse bilhete se guarda um recorde, por isso não dá para inventar pontos.
- **Testes automáticos:** 26 testes em Python (`unittest`) às regras e à API de cada jogo.

**Executar localmente**

```powershell
python -m pip install -r requirements.txt
python app.py                                # abrir http://127.0.0.1:5000
python -m unittest discover -s testes -t .   # correr os testes
```

---

## 3. Registo de Utilização da IA

Ferramenta usada: **Claude** (Claude Code, dentro do VS Code).

### 3.1 Prompt para conversão Web/HTML

Primeiro pedi uma análise do código que já existia:

> «Estou a fazer um projeto web: um website com um dashboard inicial onde 3 widgets dão acesso a 3 aplicações integradas. […] Já existe código base, mas não estou satisfeito com ele. Antes de alterares qualquer coisa, analisa o projeto e diz-me: (1) que stack e estrutura estão a ser usadas, (2) o que está bem e o que está mal, (3) se recomendas aproveitar ou recomeçar, com justificação.»

Depois escrevi uma especificação completa:
- **regra geral:** partidas de "jogar uma vez e sair";
- **estilo:** arcade néon, fonte pixel só nos títulos;
- **as três aplicações:** em detalhe;
- **forma de trabalhar:** «Primeiro tudo a funcionar, depois embelezar. Trabalha em passos pequenos e testáveis».

O Claude guardou cada aplicação num documento em `docs/`, que serviu de referência durante todo o projeto.

### 3.2 Prompt para ampliação e construção de funcionalidades

- **Controlo do processo:** «Avança para a App 1 (Detetive de Países). Não passes para a App 2 sem eu testar e aprovar. No fim, diz-me como testar.»
- **Regras da introdução:** «Torna só o painel inicial das regras mais interativo, tipo após leres a primeira regra passas para a próxima.»
- **Sons:** «Era fixe se houvessem barulhos dos golpes e de soltar o ar e de quando bate nos alvos, além de um possível som ambiente […]. Já agora isso podia também ser incorporado na primeira app.»
- **Mais golpes:** «Podias adicionar mais golpes, tipo pontapés giratórios, tornados […] e tipo desvios e outros golpes e mais combos no boxe.»
- **Última Ficha mais rica:** «Podias acrescentar mais algumas coisas também no sentido de lógica das existentes, ou mais divisões. […] Não quero que seja muito difícil mas também não quero que seja entregue quase.»
- **Menos frustração:** «Poder abrir a nota escrita enquanto estás nos cabos e pormenores desse género que facilitam o trabalho do utilizador sem estar sempre a dar reset.»
- **Mais Python:** «O trabalho deveria ser mais focado no python, mas vejo muito código da funcionalidade do site em javascript. Mudar de js para python seria uma tarefa demorada?» Daqui saiu o servidor Flask com a lógica dos jogos, a base de dados de recordes e os testes.

### 3.3 Dificuldades e erros corrigidos com a IA

- **Lutadores pouco humanos.** A primeira versão tinha bonecos tipo *stickman*, com falhas entre os membros e golpes pouco realistas. Pedi personagens mais humanas e o Claude refez o esqueleto, as articulações e as curvas de movimento. O gancho e o uppercut foram refeitos com a mecânica real.
- **Alterações que não apareciam.** Eu disse que «só mudou o fundo do boxe», mas a causa era o browser estar a usar ficheiros antigos guardados em cache. A correção foi configurar o servidor para o browser confirmar sempre se há versões novas.
- **Letreiros "cortados" no cenário.** Pareciam escondidos atrás de alguma coisa, mas era a barra da rede a passar à frente deles. O Claude ampliou a imagem para confirmar antes de corrigir.
- **Erro encontrado pelos testes.** As ligações à base de dados nunca eram fechadas (em Python, `with sqlite3.connect()` não fecha a ligação). Os testes automáticos detetaram o problema e foi corrigido.
- **PCs lentos.** Com a animação abaixo dos 60 fps, o relógio do jogo atrasa-se em relação ao do servidor e golpes válidos seriam rejeitados. Acrescentou-se uma margem de tolerância no servidor.
- **Enigmas demasiado óbvios.** Substituíram-se por pistas cruzadas entre divisões e pistas lógicas geradas ao acaso, mas sempre com uma única solução.

### 3.4 Otimização de Layout

- **Cores:** fundo escuro com acentos néon ciano e magenta, âmbar para pontos e recordes, *scanlines* CRT muito subtis.
- **Fontes:**
  - Pedi uma fonte pixel só nos títulos e outra mais limpa no resto, e mudar também a letra dentro dos jogos.
  - Ficaram **Silkscreen** nos títulos e **Chakra Petch** no resto, guardadas no próprio projeto para funcionar sem Internet.
  - Um estilo "papel vintage" foi experimentado e rejeitado: voltei ao néon com capas mais trabalhadas.
- **Margens e *scroll*:** pedi que no PC não houvesse barra de *scroll*. O dashboard e as áreas de jogo ajustam-se à altura do ecrã, e os botões das Artes Marciais passaram para um painel lateral.
- **Pormenores:**
  - descrição do dashboard mais discreta;
  - "INSERE UMA FICHA" a piscar;
  - regras apresentadas uma de cada vez;
  - planta da Última Ficha maior e com cone de visão.
- **Coerência visual:** as Artes Marciais tinham cenários de dia que não condiziam com o resto. Passaram a cenários noturnos com letreiros néon, lutadores com contorno de luz e etiquetas com brilho.

---

## 4. Estrutura de Ficheiros do Repositório

1. `site/index.html`: página principal do dashboard (com `dashboard.css` e `dashboard.js`).
2. `app.py`: ficheiro principal da aplicação (arranca o servidor Flask).
3. `site/shared/base.css`: folha de estilos comum (cores, fontes, botões, ecrãs). Cada jogo tem também o seu CSS.
4. `README.md`: este relatório de projeto.
5. Assets:
   - `site/shared/fonts/`: fontes Silkscreen e Chakra Petch (licença OFL);
   - `site/geo/data/countries-110m.json`: mapa-mundo;
   - `site/geo/vendor/`: bibliotecas D3 e topojson-client;
   - `servidor/dados/paises/`: base de dados de 165 países, escrita para este projeto.

Os sons são sintetizados e as ilustrações são desenhadas em código (SVG e canvas), por isso não há ficheiros de imagem nem de áudio.

Restantes pastas:

```
servidor/            lógica em Python
  __init__.py        cria a aplicação Flask e regista a API de cada jogo
  partidas.py        partidas em curso, guardadas no servidor
  geo.py             Detetive de Países: rondas, pistas, pontuação
  artes.py           Artes Marciais: alvos, acertos, combo, estatísticas
  escape.py          Última Ficha: gerador da partida, enigmas, rank
  recordes.py        base de dados SQLite e página de recordes
  templates/         página de recordes (Jinja)
site/
  shared/            código comum (ciclo do jogo, som, regras, API, recordes)
  geo/ artes/ escape/   um jogo por pasta (index.html + CSS + JavaScript)
testes/              testes automáticos em Python
docs/                especificação de cada jogo
dados/salao.db       recordes (criado automaticamente)
requirements.txt     dependências (Flask)
```

---

## 5. Reflexão Crítica e Aprendizagem

**O que correu melhor:** trabalhar por passos pequenos e só avançar para o jogo seguinte depois de o testar e aprovar. Assim encontrei os problemas cedo, por exemplo bonecos pouco humanos, enigmas demasiado óbvios ou um design que não condizia com o resto. Também correu bem escrever no início uma especificação detalhada: a IA ficou com uma referência clara e o resultado ficou muito próximo do que eu tinha imaginado.

**Maior dificuldade:** a qualidade das animações das Artes Marciais. Fazer golpes parecidos com os reais (anca, ombros, antecipação, impacto) precisou de várias rondas de correções. Outra dificuldade foi perceber, no fim, que a lógica dos jogos estava toda em JavaScript quando o trabalho devia ser focado em Python. Tive de decidir com a IA uma divisão sensata: o Python decide e guarda, o JavaScript desenha.

**Como a IA mudou a minha forma de programar:** passei a gastar mais tempo a pensar no que quero, a descrevê-lo com precisão e a testar, e menos tempo a escrever cada linha. Aprendi que a IA faz muito depressa, mas é preciso saber pedir, verificar o resultado e dizer claramente o que não está bem. A responsabilidade pelas decisões (o que construir, quando está bom, o que cortar) continuou a ser minha.

---

### Créditos

- Fontes [Silkscreen](https://fonts.google.com/specimen/Silkscreen) (Jason Kottke) e [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) (Cadson Demak), SIL Open Font License 1.1.
- [D3](https://d3js.org) 7.9.0 e [topojson-client](https://github.com/topojson/topojson-client) 3.1.0, de Mike Bostock (licença ISC).
- Mapa-mundo [world-atlas](https://github.com/topojson/world-atlas) 2.0.2 (ISC), com dados de [Natural Earth](https://www.naturalearthdata.com) (domínio público).
