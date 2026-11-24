# Visão geral do projeto

Website com um **dashboard inicial** onde 3 widgets dão acesso a 3 aplicações
integradas. Sem restrições técnicas. Prazo: 2 dias a partir de 2026-11-24
(entrega a **2026-11-26**).

A antiga app de xadrez (e o resto do código base anterior) vai ser substituída.

## Regra geral (para as 3 apps)

São experiências de **"jogar uma vez e sair"**:

- Nada de níveis, progressão ou campanhas.
- Cada app tem **uma partida/sessão** com início, fim, **ecrã de resultado** e
  opção de **sair** ou **jogar de novo**.

## Estilo

Arcade com toque moderno e limpo.

- Fundo escuro.
- 1–2 acentos neon (ciano e magenta).
- Fonte pixel **só em títulos** (Silkscreen Bold, porque a Press Start 2P desenha
  mal as maiúsculas acentuadas); **Chakra Petch** (sans angular, ar de HUD) no
  resto, incluindo dentro dos jogos.
- Scanlines CRT **muito subtis**.
- Widgets do dashboard como cartões tipo **"máquina de arcade/cartucho"**, com
  brilho no hover e **capas ricas e animadas** (não ilustrações simplificadas):
  globo 3D real a rodar, cena synthwave com lutador, salão escuro com porta e
  luz UV.
- **Dashboard sem barra de scroll em PC**: tudo cabe na altura do ecrã.
- Descrição do dashboard discreta: «3 máquinas. 1 ficha cada. Joga uma partida,
  vê o resultado e sai.»

*Histórico (2026-11-24): experimentou-se um estilo de cartografia vintage
inspirado no jogo Farflung; o utilizador preferiu voltar ao neon.*

## Arquitetura: Python no centro (2026-11-24)

O trabalho deve ser focado em Python. O servidor Flask (`servidor/`) é o
"cérebro" de cada jogo e o browser é a "consola":

- **Python:** sorteia as partidas e guarda as soluções; valida cada resposta
  (país, cabos, disco, senha, códigos, golpes); mede o tempo; calcula pontos,
  combos, rank e estatísticas; guarda recordes em SQLite (bilhete de uso único
  emitido no fim da partida); gera a página `/recordes/` com Jinja.
- **JavaScript:** desenho (D3, SVG, canvas), animação a 60 fps, som, input e
  apresentação das respostas do servidor.
- Testes em `testes/` (`python -m unittest discover -s testes -t .`).

Pormenores da API de cada jogo nas secções "Servidor" de cada documento.

## As 3 aplicações

1. [Detetive de Países](app-1-geografia.md) — jogo de geografia com pistas culturais.
2. [Artes Marciais 2D](app-2-artes-marciais.md) — visualizador/jogo arcade de técnicas e combos.
3. [Última Ficha](app-3-escape-room.md) — escape room num salão de arcade.

## Forma de trabalhar

Ordem:

1. Dashboard + estilo base + navegação
2. Versão funcional da App 1
3. App 2
4. App 3
5. Polimento

**Primeiro tudo a funcionar, depois embelezar.** Trabalhar em passos pequenos e
testáveis. No fim de cada app, explicar como testar e **não avançar para a app
seguinte sem o utilizador testar e aprovar**. Não é usado Git.
