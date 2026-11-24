# App 1 — Detetive de Países (jogo de geografia)

## Conceito

Mapa-mundo interativo onde o jogador descobre um **país-mistério** a partir de
pistas culturais. Começa com uma pista difícil; **cada clique errado revela uma
pista mais fácil**.

## Mapa

- Mapa-mundo interativo (D3 + TopoJSON).
- Microestados excluídos (o mapa 110m não os tem) ou acessíveis com zoom.

## Partida

- **5 rondas.**
- Em cada ronda há um país-mistério e um **limite de 90 segundos**.
- A ronda começa com **1 pista** (a mais vaga e difícil).
- **A pista seguinte só aparece quando o jogador clica num país e erra.**
  Não aparecem pistas com o passar do tempo.
- O jogador perde a ronda se **esgotar as pistas** (errar depois da última) ou
  se **acabar o tempo**.
- Quanto **menos pistas** usadas e **mais cedo**, mais pontos.
- **Combo:** respostas certas consecutivas multiplicam os pontos.

*(Revisto a 2026-11-24. Antes: 40 s por ronda, pista nova a cada 8 s, clique
errado custava 5 s. O utilizador achou o tempo apertado e preferiu pistas
desbloqueadas por erros.)*

## Pistas

- De **CULTURA e CONHECIMENTO**: gastronomia, música, história, desporto,
  monumentos, tradições, pessoas famosas.
- **NÃO** são pistas de análise do mapa (forma, vizinhos, posição).
- **Ordenadas da mais difícil/de nicho para a mais fácil.** As primeiras devem
  ser vagas e pouco conhecidas; as últimas, óbvias.
- Exemplo — Portugal: fado → navegadores → pastel de nata → Cristiano Ronaldo
  (com pistas ainda mais de nicho antes destas).

## Base de dados de países

- **Todos os países do mapa** que são Estados-membros da ONU (cerca de 165).
  Ficam de fora territórios e casos disputados (Antártida, Gronelândia, Porto
  Rico, Nova Caledónia, Malvinas, Saara Ocidental, Terras Austrais Francesas,
  Chipre do Norte, Somalilândia, Kosovo, Taiwan, Palestina): continuam no mapa,
  mas nunca são o país-mistério.
- **6 pistas por país**, da mais difícil para a mais fácil. Nos países menos
  conhecidos, a última pista pode ser a capital ou a bandeira, para que seja
  mesmo fácil.
- **Factos verificáveis.** Evitar factos que mudam depressa (clubes atuais,
  recordes em aberto).
- Formato: JSON, um ficheiro por continente em `servidor/dados/paises/` (só o servidor lê; não é público).

## Ecrã final

Pontuação total e **resumo das rondas** (país, acertou/falhou, pistas usadas,
tempo, pontos). Opções: jogar de novo / sair para o dashboard.

## Regras implementadas (valores em `CONFIG`, no topo de `site/geo/geo.js`)

| Regra | Valor |
|---|---|
| Tempo por ronda | 90 s; se acabar, perde a ronda |
| Pistas | começa com 1; cada clique errado revela a seguinte |
| Errar depois da última pista | perde a ronda |
| Pontos base | 1000 / 800 / 600 / 400 / 250 / 120 conforme 1…6 pistas vistas |
| Bónus de tempo | até 200, proporcional ao tempo que sobra |
| Combo | acertos seguidos: ×1 → ×1,5 → ×2 → ×2,5 → ×3 (máx.); falhar repõe ×1 |
| Fim de ronda | país destacado e com zoom, todas as pistas reveladas |
| Escolha dos países | 5 ao acaso, no máximo 2 do mesmo continente |

### Som (2026-11-24)

Sons sintetizados de `shared/som.js`: clique num país errado (som de erro +
virar de ficha da nova pista), país repetido (clique curto), acerto (arpejo),
ronda perdida (três notas a descer), tique-taque nos últimos 10 s (mais forte
nos últimos 5) e fanfarra no resultado. Botão de som na barra de topo (tecla M).


## Servidor (Python, `servidor/geo.py`)

- A base de dados e as regras (`CONFIG`) estão no servidor. Partida → 5 países
  (máx. 2 por continente); cada ronda começa com a 1.ª pista.
- `POST /api/geo/partida`, `/<id>/ronda`, `/<id>/tentativa {pais}`,
  `/<id>/tempo`, `/<id>/fim`. Cada clique errado devolve só a pista seguinte;
  o país e as 6 pistas só chegam quando a ronda acaba.
- Pontos = (base pelas pistas vistas + bónus de tempo) × combo, com o tempo
  medido pelo servidor. O `/fim` dá o resumo e o bilhete para os recordes
  (só com pontos > 0).
