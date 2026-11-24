"""Partidas em curso, guardadas na memória do servidor.

Cada jogo cria uma partida quando o jogador começa e recebe um identificador
aleatório. O browser só guarda esse identificador: as soluções e as contas
ficam aqui, do lado do servidor, onde o jogador não as consegue ver nem mudar.

As partidas antigas são apagadas sozinhas (ao fim de `PRAZO` segundos sem
uso), para a memória não crescer sem limite.
"""

from __future__ import annotations

import secrets
import threading
import time
from typing import Any

PRAZO = 2 * 60 * 60  # 2 horas


class Partidas:
    """Dicionário de partidas com identificador aleatório e prazo de validade."""

    def __init__(self, prazo: float = PRAZO) -> None:
        self._prazo = prazo
        self._partidas: dict[str, dict[str, Any]] = {}
        self._trinco = threading.Lock()

    def criar(self, estado: dict[str, Any]) -> str:
        """Guarda uma partida nova e devolve o seu identificador."""
        ident = secrets.token_urlsafe(12)
        agora = time.monotonic()
        with self._trinco:
            self._limpar(agora)
            estado["_criada"] = agora
            estado["_usada"] = agora
            self._partidas[ident] = estado
        return ident

    def obter(self, ident: str) -> dict[str, Any] | None:
        """Devolve a partida (ou None se não existir ou já tiver expirado)."""
        with self._trinco:
            partida = self._partidas.get(ident)
            if partida is not None:
                partida["_usada"] = time.monotonic()
            return partida

    def apagar(self, ident: str) -> None:
        with self._trinco:
            self._partidas.pop(ident, None)

    def __len__(self) -> int:
        return len(self._partidas)

    def _limpar(self, agora: float) -> None:
        velhas = [i for i, p in self._partidas.items() if agora - p["_usada"] > self._prazo]
        for i in velhas:
            del self._partidas[i]


def segundos_desde(partida: dict[str, Any], chave: str = "_criada") -> float:
    """Segundos que passaram desde um instante guardado na partida."""
    return time.monotonic() - partida[chave]


def agora() -> float:
    return time.monotonic()
