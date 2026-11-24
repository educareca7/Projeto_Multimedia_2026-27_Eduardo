"""Artes Marciais (App 2): desafio de 60 segundos contra alvos.

A animação dos lutadores e a física dos alvos ficam no browser (precisam de
60 imagens por segundo). O servidor é o árbitro:
- sorteia cada alvo (técnica pedida, posição e quanto tempo fica à espera);
- recebe cada acerto e confirma que é o alvo certo, com a técnica certa e
  dentro do tempo;
- calcula os pontos (base da categoria + bónus de rapidez) × combo;
- no fim mede o tempo, faz as estatísticas e dá o bilhete para os recordes.
"""

from __future__ import annotations

import random
from collections import Counter

from flask import Blueprint, jsonify, request

from . import recordes
from .partidas import Partidas, agora

# ---------------------------------------------------------------------------
# Regras do desafio (ajustar aqui)
# ---------------------------------------------------------------------------
CONFIG = {
    "duracao": 60,
    "contagem": 3,
    "vidaAlvoInicial": 5,  # s que um alvo fica à espera no início
    "vidaAlvoMinima": 3,  # ... e no fim (vai encurtando)
    "encurtar": 0.04,  # s a menos por cada segundo de desafio
    "pausaEntreAlvos": 0.5,
    "pontosBase": {"soco": 100, "cotovelo": 120, "joelho": 130, "pontapé": 150},
    "bonusRapidez": 0.5,  # até +50% se acertar logo
    "comboPasso": 0.25,
    "comboMax": 3,
    # distâncias (m) a que o alvo pode aparecer em relação à posição do lutador
    "desvios": [-0.5, -0.25, 0.25, 0.5, 0.75],
}
TOLERANCIA = 0.6  # s de folga (rede e relógios diferentes)
# Num PC lento a animação corre abaixo dos 60 fps e o relógio do jogo atrasa-se
# em relação ao real. O servidor aceita até este fator de atraso.
FOLGA_LENTIDAO = 1.6

# Golpes que podem ser pedidos como alvo, com a sua categoria.
# (As esquivas não têm impacto, por isso não aparecem aqui.)
ARTES = {
    "boxe": {
        "nome": "Boxe",
        "tecnicas": {"jab": "soco", "direto": "soco", "gancho": "soco", "uppercut": "soco", "ganchoCorpo": "soco"},
    },
    "muaythai": {
        "nome": "Muay Thai",
        "tecnicas": {"jab": "soco", "direto": "soco", "cotovelo": "cotovelo", "joelhada": "joelho",
                     "circular": "pontapé", "teep": "pontapé", "cotoveloGiro": "cotovelo",
                     "giratorio": "pontapé", "joelhoVoador": "joelho"},
    },
    "taekwondo": {
        "nome": "Taekwondo",
        "tecnicas": {"ap": "pontapé", "dollyo": "pontapé", "yeop": "pontapé", "naeryo": "pontapé",
                     "jireugi": "soco", "dwit": "pontapé", "tornado": "pontapé", "huryeo": "pontapé"},
    },
}

partidas = Partidas()
bp = Blueprint("artes", __name__, url_prefix="/api/artes")


# ---------------------------------------------------------------------------
# Regras
# ---------------------------------------------------------------------------
def multiplicador(combo: int) -> float:
    """Multiplicador com `combo` acertos seguidos antes deste."""
    return min(CONFIG["comboMax"], 1 + CONFIG["comboPasso"] * combo)


def vida_do_alvo(decorrido: float) -> float:
    """Quanto tempo um alvo fica à espera: encurta à medida que o desafio avança."""
    return max(CONFIG["vidaAlvoMinima"], CONFIG["vidaAlvoInicial"] - decorrido * CONFIG["encurtar"])


def pontos_acerto(categoria: str, fracao_restante: float, combo: int) -> int:
    """(base da categoria + bónus de rapidez) × combo."""
    base = CONFIG["pontosBase"].get(categoria, 100)
    fracao = max(0.0, min(1.0, fracao_restante))
    bonus = round(base * CONFIG["bonusRapidez"] * fracao)
    return round((base + bonus) * multiplicador(combo))


def sortear_tecnica(arte: str, anterior: str | None, rng: random.Random) -> str:
    """Técnica do próximo alvo (nunca a mesma duas vezes seguidas)."""
    opcoes = [t for t in ARTES[arte]["tecnicas"] if t != anterior]
    return rng.choice(opcoes)


def decorrido(partida) -> float:
    """Segundos de desafio (sem a contagem decrescente), pelo relógio do servidor."""
    return agora() - partida["inicio"] - CONFIG["contagem"]


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
def _corpo() -> dict:
    return request.get_json(silent=True) or {}


def _partida(ident: str):
    partida = partidas.obter(ident)
    if partida is None or partida["terminada"]:
        return None
    return partida


def _sem_partida():
    return jsonify(erro="Desafio desconhecido ou já terminado."), 404


@bp.post("/partida")
def nova_partida():
    arte = str(_corpo().get("arte", ""))
    if arte not in ARTES:
        return jsonify(erro="Arte desconhecida."), 400
    ident = partidas.criar({
        "arte": arte,
        "inicio": agora(),
        "rng": random.Random(),
        "alvos": 0,
        "alvo": None,
        "pontos": 0,
        "combo": 0,
        "melhorCombo": 0,
        "acertos": 0,
        "terminada": False,
    })
    publico = {k: CONFIG[k] for k in ("duracao", "contagem", "pausaEntreAlvos", "comboPasso", "comboMax", "desvios")}
    return jsonify(id=ident, config=publico)


@bp.post("/<ident>/alvo")
def novo_alvo(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    t = decorrido(partida)
    if t < -TOLERANCIA or t > CONFIG["duracao"] * FOLGA_LENTIDAO:
        return jsonify(erro="O desafio não está a decorrer."), 409
    anterior = partida["alvo"]
    if anterior and anterior["estado"] == "ativo":
        # o anterior ficou por acertar: conta como fugido
        anterior["estado"] = "fugiu"
        partida["combo"] = 0
    rng = partida["rng"]
    tecnica = sortear_tecnica(partida["arte"], anterior["tecnica"] if anterior else None, rng)
    vida = vida_do_alvo(max(0.0, t))
    partida["alvos"] += 1
    partida["alvo"] = {"indice": partida["alvos"], "tecnica": tecnica, "vida": vida, "criado": agora(), "estado": "ativo"}
    return jsonify(indice=partida["alvos"], tecnica=tecnica, vida=vida, sorteio=rng.random())


@bp.post("/<ident>/acerto")
def acerto(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    corpo = _corpo()
    alvo = partida["alvo"]
    if not alvo or alvo["indice"] != corpo.get("indice") or alvo["estado"] != "ativo":
        return jsonify(erro="Esse alvo já não está ativo."), 409
    if corpo.get("tecnica") != alvo["tecnica"]:
        return jsonify(erro="Não é a técnica pedida."), 409
    passou = agora() - alvo["criado"]
    if passou > alvo["vida"] * FOLGA_LENTIDAO + TOLERANCIA:
        alvo["estado"] = "fugiu"
        partida["combo"] = 0
        return jsonify(erro="O alvo já tinha fugido."), 409
    categoria = ARTES[partida["arte"]]["tecnicas"][alvo["tecnica"]]
    pts = pontos_acerto(categoria, 1 - passou / alvo["vida"], partida["combo"])
    alvo["estado"] = "atingido"
    partida["pontos"] += pts
    partida["combo"] += 1
    partida["acertos"] += 1
    partida["melhorCombo"] = max(partida["melhorCombo"], partida["combo"])
    return jsonify(pontos=pts, pontosTotal=partida["pontos"], combo=partida["combo"], multiplicador=multiplicador(partida["combo"]))


@bp.post("/<ident>/fugiu")
def fugiu(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    alvo = partida["alvo"]
    if alvo and alvo["indice"] == _corpo().get("indice") and alvo["estado"] == "ativo":
        alvo["estado"] = "fugiu"
        partida["combo"] = 0
    return jsonify(combo=partida["combo"], multiplicador=multiplicador(partida["combo"]))


@bp.post("/<ident>/fim")
def fim(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    if decorrido(partida) < CONFIG["duracao"] - 2:
        return jsonify(erro="O desafio ainda não acabou."), 409
    partida["terminada"] = True
    corpo = _corpo()
    tecnicas = ARTES[partida["arte"]]["tecnicas"]
    usadas = Counter({t: int(n) for t, n in (corpo.get("usadas") or {}).items() if t in tecnicas and int(n) > 0})
    golpes = max(int(corpo.get("golpes") or 0), partida["acertos"])
    favorita = usadas.most_common(1)[0][0] if usadas else None
    nome = ARTES[partida["arte"]]["nome"]
    detalhe = f"{nome} · {partida['acertos']} alvos · combo {partida['melhorCombo']}"
    return jsonify(
        pontos=partida["pontos"],
        acertos=partida["acertos"],
        alvos=partida["alvos"],
        melhorCombo=partida["melhorCombo"],
        precisao=round(100 * partida["acertos"] / golpes) if golpes else None,
        favorita=favorita,
        bilhete=recordes.emitir_bilhete("artes", partida["pontos"], detalhe) if partida["pontos"] > 0 else None,
    )
