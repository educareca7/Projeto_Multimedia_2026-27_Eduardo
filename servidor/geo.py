"""Detetive de Países (App 1): base de dados, rondas, respostas e pontuação.

A base de dados (servidor/dados/paises/*.json, 6 pistas por país) fica só no
servidor. Em cada ronda o browser recebe a 1.ª pista (a mais difícil); cada
clique errado é enviado para aqui e o servidor responde com a pista seguinte.
O país certo só é revelado quando a ronda acaba. O tempo de cada ronda é
medido pelo servidor e é ele que calcula os pontos.
"""

from __future__ import annotations

import json
import random
from functools import lru_cache
from pathlib import Path

from flask import Blueprint, jsonify, request

from . import recordes
from .partidas import Partidas, agora

# ---------------------------------------------------------------------------
# Regras (ajustar aqui)
# ---------------------------------------------------------------------------
CONFIG = {
    "rondas": 5,
    "segundosPorRonda": 90,
    # pontos conforme o nº de pistas vistas quando se acerta (1, 2, 3...)
    "pontosBase": [1000, 800, 600, 400, 250, 120],
    "bonusTempoMax": 200,  # proporcional ao tempo que sobra
    "comboPasso": 0.5,  # cada acerto seguido soma +0,5 ao multiplicador
    "comboMax": 3,
    "maxPorContinente": 2,  # variedade: no máximo 2 países do mesmo continente
}
DIFICULDADE = ["Muito difícil", "Difícil", "Difícil", "Média", "Fácil", "Muito fácil"]
TOLERANCIA = 3  # s de folga entre o relógio do browser e o do servidor

PASTA_DADOS = Path(__file__).resolve().parent / "dados" / "paises"
ATLAS = Path(__file__).resolve().parent.parent / "site" / "geo" / "data" / "countries-110m.json"

partidas = Partidas()
bp = Blueprint("geo", __name__, url_prefix="/api/geo")


# ---------------------------------------------------------------------------
# Base de dados
# ---------------------------------------------------------------------------
def ids_do_mapa() -> set[str]:
    """Códigos ISO dos países que existem no mapa (TopoJSON do browser)."""
    atlas = json.loads(ATLAS.read_text(encoding="utf-8"))
    return {g["id"] for g in atlas["objects"]["countries"]["geometries"] if "id" in g}


@lru_cache(maxsize=1)
def banco() -> tuple[dict, ...]:
    """Lê todos os continentes e fica só com os países que estão no mapa e têm pistas."""
    no_mapa = ids_do_mapa()
    paises = []
    for ficheiro in sorted(PASTA_DADOS.glob("*.json")):
        dados = json.loads(ficheiro.read_text(encoding="utf-8"))
        for pais in dados["paises"]:
            if pais["id"] in no_mapa and pais.get("pistas"):
                paises.append(pais)
    return tuple(paises)


def escolher_paises(lista, rng: random.Random, rondas: int = CONFIG["rondas"]) -> list[dict]:
    """Escolhe os países da partida, com no máximo N do mesmo continente."""
    escolhidos, por_continente = [], {}
    for pais in rng.sample(list(lista), len(lista)):
        n = por_continente.get(pais["continente"], 0)
        if n >= CONFIG["maxPorContinente"]:
            continue
        por_continente[pais["continente"]] = n + 1
        escolhidos.append(pais)
        if len(escolhidos) == rondas:
            break
    return escolhidos


# ---------------------------------------------------------------------------
# Pontuação
# ---------------------------------------------------------------------------
def multiplicador(sequencia: int) -> float:
    """Multiplicador de combo para o N-ésimo acerto seguido (1 = sem combo)."""
    return min(CONFIG["comboMax"], 1 + CONFIG["comboPasso"] * max(0, sequencia - 1))


def pontos_base(pistas_vistas: int) -> int:
    tabela = CONFIG["pontosBase"]
    return tabela[min(pistas_vistas, len(tabela)) - 1]


def pontos_ronda(pistas_vistas: int, tempo: float, sequencia: int) -> dict:
    """Pontos de um acerto: (base + bónus de tempo) × combo."""
    total = CONFIG["segundosPorRonda"]
    base = pontos_base(pistas_vistas)
    bonus = round((total - min(tempo, total)) / total * CONFIG["bonusTempoMax"])
    mult = multiplicador(sequencia)
    return {"base": base, "bonus": bonus, "mult": mult, "pontos": round((base + bonus) * mult)}


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
def _partida(ident: str):
    return partidas.obter(ident)


def _sem_partida():
    return jsonify(erro="Partida desconhecida."), 404


def _pistas_vistas(partida) -> list[dict]:
    ronda = partida["ronda"]
    pais = partida["paises"][ronda["indice"]]
    return [{"texto": pais["pistas"][i], "dificuldade": DIFICULDADE[min(i, len(DIFICULDADE) - 1)]}
            for i in range(ronda["vistas"])]


def _todas_as_pistas(pais) -> list[dict]:
    return [{"texto": t, "dificuldade": DIFICULDADE[min(i, len(DIFICULDADE) - 1)]} for i, t in enumerate(pais["pistas"])]


def _fechar_ronda(partida, acertou: bool, motivo: str = "") -> dict:
    """Termina a ronda atual, soma os pontos e devolve o que o browser mostra."""
    ronda = partida["ronda"]
    pais = partida["paises"][ronda["indice"]]
    tempo = min(agora() - ronda["inicio"], CONFIG["segundosPorRonda"])
    ronda["ativa"] = False
    conta = None
    if acertou:
        partida["sequencia"] += 1
        partida["melhorSequencia"] = max(partida["melhorSequencia"], partida["sequencia"])
        conta = pontos_ronda(ronda["vistas"], tempo, partida["sequencia"])
        partida["pontos"] += conta["pontos"]
    else:
        partida["sequencia"] = 0
    partida["resumo"].append({
        "pais": pais["nome"],
        "acertou": acertou,
        "pistas": ronda["vistas"],
        "totalPistas": len(pais["pistas"]),
        "tempo": round(tempo, 1),
        "erros": ronda["erros"],
        "pontos": conta["pontos"] if conta else 0,
    })
    return {
        "resultado": "certo" if acertou else "perdeu",
        "motivo": motivo,
        "pais": {"id": pais["id"], "nome": pais["nome"]},
        "pistas": _todas_as_pistas(pais),
        "pistasVistas": ronda["vistas"],
        "conta": conta,
        "pontosTotal": partida["pontos"],
        "comboSeguinte": multiplicador(partida["sequencia"] + 1),
        "ultima": ronda["indice"] == len(partida["paises"]) - 1,
    }


@bp.post("/partida")
def nova_partida():
    paises = escolher_paises(banco(), random.Random())
    ident = partidas.criar({
        "paises": paises,
        "ronda": None,
        "pontos": 0,
        "sequencia": 0,
        "melhorSequencia": 0,
        "resumo": [],
        "terminada": False,
    })
    return jsonify(id=ident, config={"rondas": len(paises), "segundosPorRonda": CONFIG["segundosPorRonda"]})


@bp.post("/<ident>/ronda")
def nova_ronda(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    anterior = partida["ronda"]
    if anterior and anterior["ativa"]:
        return jsonify(erro="A ronda atual ainda não acabou."), 409
    indice = 0 if anterior is None else anterior["indice"] + 1
    if indice >= len(partida["paises"]):
        return jsonify(erro="Já não há rondas."), 409
    pais = partida["paises"][indice]
    partida["ronda"] = {"indice": indice, "inicio": agora(), "vistas": 1, "erros": 0, "tentados": set(), "ativa": True}
    return jsonify(
        indice=indice,
        totalPistas=len(pais["pistas"]),
        pistas=_pistas_vistas(partida),
        valeAgora=pontos_base(1),
        pontosTotal=partida["pontos"],
        comboSeguinte=multiplicador(partida["sequencia"] + 1),
    )


@bp.post("/<ident>/tentativa")
def tentativa(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    ronda = partida["ronda"]
    if not ronda or not ronda["ativa"]:
        return jsonify(erro="Não há nenhuma ronda a decorrer."), 409
    escolhido = str((request.get_json(silent=True) or {}).get("pais", ""))
    pais = partida["paises"][ronda["indice"]]
    if escolhido == pais["id"]:
        return jsonify(_fechar_ronda(partida, True))
    if escolhido in ronda["tentados"]:
        return jsonify(resultado="repetido")
    ronda["tentados"].add(escolhido)
    ronda["erros"] += 1
    if ronda["vistas"] < len(pais["pistas"]):
        ronda["vistas"] += 1
        return jsonify(resultado="errado", pistas=_pistas_vistas(partida), valeAgora=pontos_base(ronda["vistas"]))
    return jsonify(_fechar_ronda(partida, False, "pistas"))


@bp.post("/<ident>/tempo")
def fim_do_tempo(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    ronda = partida["ronda"]
    if not ronda or not ronda["ativa"]:
        return jsonify(erro="Não há nenhuma ronda a decorrer."), 409
    falta = CONFIG["segundosPorRonda"] - (agora() - ronda["inicio"])
    if falta > TOLERANCIA:
        return jsonify(erro="Ainda há tempo.", falta=falta), 409
    return jsonify(_fechar_ronda(partida, False, "tempo"))


@bp.post("/<ident>/fim")
def fim(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    resumo = partida["resumo"]
    if len(resumo) < len(partida["paises"]) or partida["terminada"]:
        return jsonify(erro="A partida ainda não acabou."), 409
    partida["terminada"] = True
    certas = [r for r in resumo if r["acertou"]]
    media = sum(r["pistas"] for r in certas) / len(certas) if certas else None
    detalhe = f"{len(certas)}/{len(resumo)} países · melhor sequência {partida['melhorSequencia']}"
    return jsonify(
        pontos=partida["pontos"],
        acertos=len(certas),
        rondas=len(resumo),
        melhorSequencia=partida["melhorSequencia"],
        mediaPistas=media,
        erros=sum(r["erros"] for r in resumo),
        resumo=resumo,
        bilhete=recordes.emitir_bilhete("geo", partida["pontos"], detalhe) if partida["pontos"] > 0 else None,
    )
