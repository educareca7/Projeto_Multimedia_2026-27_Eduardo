"""Última Ficha (App 3): regras, geração da partida e validação dos enigmas.

O servidor sorteia tudo no início da partida e guarda as soluções. O browser
recebe apenas o que o jogador pode ver na sala (pistas, cartaz, recordes,
horário...). Cada tentativa (cabos, disco, senha, códigos) é enviada para aqui
e o servidor responde se está certa. No fim, é o servidor que mede o tempo,
conta as dicas e calcula o rank e a pontuação.

Cadeia de enigmas:
    fusível → quadro elétrico (pistas lógicas) → jukebox (hino do cartaz) →
    ficha → garra → cartão → porta PRIVADO → computador (campeão + ano) →
    email → cofre (fecho ao domingo) → lanterna UV + pilhas → marcas UV +
    ordem dos recordes → máquina final (squash) → porta.
"""

from __future__ import annotations

import itertools
import math
import random
from dataclasses import dataclass
from typing import Callable

from flask import Blueprint, jsonify, request

from . import recordes
from .partidas import Partidas, agora

# ---------------------------------------------------------------------------
# Regras (ajustar aqui)
# ---------------------------------------------------------------------------
CONFIG = {
    "duracao": 10 * 60,  # s até o alarme (2:50 → 3:00)
    "custoDica": 30,  # s que cada dica custa
    "dicas": 3,
    "tentativasGarra": 3,
}
# rank: (segundos que sobram, máximo de dicas)
RANK_S = (240, 0)
RANK_A = (150, 1)
RANK_B = (60, 3)
TOLERANCIA = 20  # s de folga entre o relógio do browser e o do servidor

CORES = ["vermelho", "azul", "amarelo", "verde"]
SIMBOLOS = ["estrela", "circulo", "triangulo", "losango"]
TITULOS = ["Néon na Avenida", "Ficha Dourada", "Corrida Noturna", "Pixel do Coração",
           "Rei do Salão", "Fliperama Azul", "Luzes de Março", "Última Partida"]
INICIAIS = ["KAI", "ANA", "RUI", "TOM", "MIA", "LEO", "EVA", "IVO"]
FECHOS_DOMINGO = ["21:45", "22:15", "22:40", "23:10", "20:35"]

# Enigmas que contam para o resultado (9). Os marcados com * são validados
# aqui no servidor; os outros são passos no browser (apanhar e usar itens).
ENIGMAS = ["energia*", "ficha*", "cartao", "privado", "computador*", "cofre*", "uv", "codigo*", "porta"]
VALIDADOS = {e.rstrip("*") for e in ENIGMAS if e.endswith("*")}
PASSOS_BROWSER = {e for e in ENIGMAS if not e.endswith("*")}

partidas = Partidas()
bp = Blueprint("escape", __name__, url_prefix="/api/escape")


# ---------------------------------------------------------------------------
# Pistas lógicas dos cabos
# ---------------------------------------------------------------------------
@dataclass
class Pista:
    texto: str
    teste: Callable[[dict[str, int]], bool]


def todas_as_ligacoes() -> list[dict[str, int]]:
    """As 24 maneiras de ligar 4 cabos a 4 tomadas (1–4, de cima para baixo)."""
    return [dict(zip(CORES, p)) for p in itertools.permutations([1, 2, 3, 4])]


def pistas_verdadeiras(sol: dict[str, int]) -> list[Pista]:
    """Todas as pistas que são verdade para a solução `sol` (nenhuma é direta)."""
    pistas: list[Pista] = []
    for c in CORES:
        n = sol[c]
        if n in (1, 4):
            pistas.append(Pista(f"O cabo {c} vai para uma das pontas (1 ou 4).", lambda p, c=c: p[c] in (1, 4)))
        else:
            pistas.append(Pista(f"O cabo {c} não vai para nenhuma das pontas.", lambda p, c=c: p[c] in (2, 3)))
        paridade = "ímpar" if n % 2 else "par"
        pistas.append(Pista(f"O cabo {c} vai para uma tomada {paridade}.", lambda p, c=c, n=n: p[c] % 2 == n % 2))
    for a, b in itertools.permutations(CORES, 2):
        if sol[a] == sol[b] + 1:
            pistas.append(Pista(f"O {a} fica logo abaixo do {b}.", lambda p, a=a, b=b: p[a] == p[b] + 1))
        if sol[a] < sol[b]:
            pistas.append(Pista(f"O {a} fica mais acima do que o {b}.", lambda p, a=a, b=b: p[a] < p[b]))
        if a < b and abs(sol[a] - sol[b]) > 1:
            pistas.append(Pista(f"O {a} e o {b} não ficam lado a lado.", lambda p, a=a, b=b: abs(p[a] - p[b]) > 1))
        if a < b:
            soma = sol[a] + sol[b]
            pistas.append(Pista(f"As tomadas do {a} e do {b} somam {soma}.", lambda p, a=a, b=b, s=soma: p[a] + p[b] == s))
    return pistas


def solucoes(pistas: list[Pista]) -> list[dict[str, int]]:
    """Ligações que respeitam todas as pistas."""
    return [p for p in todas_as_ligacoes() if all(q.teste(p) for q in pistas)]


def gerar_pistas_cabos(sol: dict[str, int], rng: random.Random) -> list[str]:
    """Escolhe pistas até sobrar uma só solução, tira as que não fazem falta e
    garante pelo menos 3 (com 2 fica fácil demais)."""
    candidatas = pistas_verdadeiras(sol)
    rng.shuffle(candidatas)
    escolhidas: list[Pista] = []
    resto = todas_as_ligacoes()
    for pista in candidatas:
        if len(resto) == 1:
            break
        novo = [p for p in resto if pista.teste(p)]
        if len(novo) < len(resto):
            escolhidas.append(pista)
            resto = novo
    if len(resto) > 1:  # raro: uma pista direta desempata
        c = rng.choice(CORES)
        escolhidas.append(Pista(f"O {c} vai para a tomada {sol[c]}.", lambda p, c=c, n=sol[c]: p[c] == n))
    # tirar as redundantes (da última para a primeira)
    for i in range(len(escolhidas) - 1, -1, -1):
        sem = escolhidas[:i] + escolhidas[i + 1:]
        if len(solucoes(sem)) == 1:
            escolhidas = sem
    for pista in candidatas:
        if len(escolhidas) >= 3:
            break
        if pista not in escolhidas:
            escolhidas.append(pista)
    rng.shuffle(escolhidas)
    return [p.texto for p in escolhidas]


# ---------------------------------------------------------------------------
# Partida
# ---------------------------------------------------------------------------
def gerar_musicas(ano: int, lado: str, rng: random.Random) -> tuple[list[dict], int]:
    """8 discos: duas canções do ano do torneio (uma de cada lado), duas do
    mesmo lado noutros anos e o resto ao acaso. Devolve (discos, índice certo)."""
    codigos = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"]
    outros_anos = [a for a in range(1983, 1991) if a != ano]
    titulos = rng.sample(TITULOS, len(TITULOS))
    discos = [{"titulo": t, "codigo": c} for t, c in zip(titulos, codigos)]
    ordem = rng.sample(range(8), 8)
    outro_lado = "B" if lado == "A" else "A"
    discos[ordem[0]].update(ano=ano, lado=lado)
    discos[ordem[1]].update(ano=ano, lado=outro_lado)
    for i, k in enumerate(ordem[2:]):
        discos[k].update(ano=rng.choice(outros_anos), lado=lado if i < 2 else rng.choice("AB"))
    return discos, ordem[0]


def gerar_partida(rng: random.Random | None = None) -> dict:
    """Sorteia uma partida. Devolve {'publico': ..., 'solucao': ...}."""
    rng = rng or random.Random()
    tomadas = rng.sample([1, 2, 3, 4], 4)
    ligacoes = dict(zip(CORES, tomadas))
    ano = rng.choice([1986, 1987, 1988, 1989])
    lado = rng.choice("AB")
    simbolos = rng.sample(SIMBOLOS, 4)
    algarismos = rng.sample(range(10), 4)
    digitos = dict(zip(simbolos, algarismos))
    ranking = rng.sample(SIMBOLOS, 4)
    iniciais = rng.sample(INICIAIS, 4)
    pontos, pontuacoes = 99000 - rng.randrange(900), []
    for _ in ranking:
        pontuacoes.append(str(pontos))
        pontos -= 1500 + rng.randrange(6000)
    fecho = rng.choice(FECHOS_DOMINGO)
    horario = ["15:00 – 23:00", "15:00 – 23:00", "15:00 – 23:30", "15:00 – 23:30",
               "15:00 – 02:00", "11:00 – 02:00", f"11:00 – {fecho}"]
    musicas, musica_certa = gerar_musicas(ano, lado, rng)
    publico = {
        "pistasCabos": gerar_pistas_cabos(ligacoes, rng),
        "ano": ano,
        "ladoHino": lado,
        "musicas": musicas,
        "simbolos": simbolos,
        "digitos": digitos,
        "ranking": ranking,
        "iniciais": iniciais,
        "pontuacoes": pontuacoes,
        "horario": horario,
        "premioX": 0.1 + rng.random() * 0.8,
    }
    solucao = {
        "ligacoes": ligacoes,
        "musicaCerta": musica_certa,
        "senha": f"{iniciais[0]}{ano}",
        "codigoCofre": fecho.replace(":", ""),
        "codigo": "".join(str(digitos[s]) for s in ranking),
    }
    return {"publico": publico, "solucao": solucao}


def calcular_rank(escapou: bool, sobra: float, dicas: int) -> str:
    if not escapou:
        return "X"
    if sobra >= RANK_S[0] and dicas <= RANK_S[1]:
        return "S"
    if sobra >= RANK_A[0] and dicas <= RANK_A[1]:
        return "A"
    if sobra >= RANK_B[0]:
        return "B"
    return "C"


def calcular_pontos(escapou: bool, sobra: float, dicas: int, enigmas: int) -> int:
    """100 por enigma; se escapou, +10 por segundo que sobra e +300 por dica guardada."""
    pontos = 100 * enigmas
    if escapou:
        pontos += int(sobra) * 10 + 300 * (CONFIG["dicas"] - dicas)
    return pontos


def tempo_usado(partida: dict) -> float:
    """Tempo de jogo medido pelo servidor, incluindo o castigo das dicas."""
    return (agora() - partida["inicio"]) + partida["dicas"] * CONFIG["custoDica"]


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
def _partida(ident: str):
    partida = partidas.obter(ident)
    if partida is None or partida.get("terminada"):
        return None
    return partida


def _sem_partida():
    return jsonify(erro="Partida desconhecida ou já terminada."), 404


def _corpo() -> dict:
    return request.get_json(silent=True) or {}


@bp.post("/partida")
def nova_partida():
    gerada = gerar_partida()
    ident = partidas.criar({
        "solucao": gerada["solucao"],
        "inicio": agora(),
        "dicas": 0,
        "resolvidos": set(),
        "terminada": False,
    })
    return jsonify(id=ident, dados=gerada["publico"], config=CONFIG)


@bp.post("/<ident>/cabos")
def cabos(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    ligacoes = _corpo().get("ligacoes") or {}
    certas = sum(1 for c in CORES if ligacoes.get(c) == partida["solucao"]["ligacoes"][c])
    if certas == 4:
        partida["resolvidos"].add("energia")
    return jsonify(certas=certas)


@bp.post("/<ident>/disco")
def disco(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    if "energia" not in partida["resolvidos"]:
        return jsonify(erro="A jukebox está desligada."), 409
    certo = _corpo().get("indice") == partida["solucao"]["musicaCerta"]
    if certo:
        partida["resolvidos"].add("ficha")
    return jsonify(certo=certo)


@bp.post("/<ident>/senha")
def senha(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    valor = "".join(str(_corpo().get("senha", "")).split()).upper()
    certo = valor == partida["solucao"]["senha"]
    if certo:
        partida["resolvidos"].add("computador")
    return jsonify(certo=certo)


def _validar_codigo(ident: str, chave: str, enigma: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    certo = str(_corpo().get("codigo", "")) == partida["solucao"][chave]
    if certo:
        partida["resolvidos"].add(enigma)
    return jsonify(certo=certo)


@bp.post("/<ident>/cofre")
def cofre(ident: str):
    return _validar_codigo(ident, "codigoCofre", "cofre")


@bp.post("/<ident>/codigo")
def codigo(ident: str):
    return _validar_codigo(ident, "codigo", "codigo")


@bp.post("/<ident>/dica")
def dica(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    if partida["dicas"] >= CONFIG["dicas"]:
        return jsonify(erro="Já não tens dicas."), 409
    partida["dicas"] += 1
    return jsonify(dicasUsadas=partida["dicas"], restantes=CONFIG["dicas"] - partida["dicas"], custo=CONFIG["custoDica"])


@bp.post("/<ident>/fim")
def fim(ident: str):
    partida = _partida(ident)
    if partida is None:
        return _sem_partida()
    corpo = _corpo()
    partida["terminada"] = True
    usado = tempo_usado(partida)
    # só se escapa com o código da máquina validado e dentro do tempo
    escapou = (
        bool(corpo.get("escapou"))
        and "codigo" in partida["resolvidos"]
        and usado <= CONFIG["duracao"] + TOLERANCIA
    )
    sobra = max(0.0, CONFIG["duracao"] - usado) if escapou else 0.0
    passos = {p for p in corpo.get("passos", []) if p in PASSOS_BROWSER}
    if escapou:
        passos.add("porta")
    enigmas = len(partida["resolvidos"] | passos)
    rank = calcular_rank(escapou, sobra, partida["dicas"])
    pontos = calcular_pontos(escapou, sobra, partida["dicas"], enigmas)
    bilhete = None
    if escapou:
        minutos, segundos = divmod(math.ceil(sobra), 60)  # como o relógio do jogo
        detalhe = f"Rank {rank} · sobraram {minutos}:{segundos:02d} · {partida['dicas']} dica(s)"
        bilhete = recordes.emitir_bilhete("escape", pontos, detalhe)
    return jsonify(
        escapou=escapou,
        rank=rank,
        pontos=pontos,
        tempoUsado=min(usado, CONFIG["duracao"]),
        tempoSobra=sobra,
        dicasUsadas=partida["dicas"],
        dicas=CONFIG["dicas"],
        enigmas=enigmas,
        totalEnigmas=len(ENIGMAS),
        bilhete=bilhete,
    )
