"""Tabela de recordes dos três jogos (base de dados SQLite).

Como funciona:
1. Quando uma partida acaba, o módulo do jogo calcula a pontuação e chama
   `emitir_bilhete()`. O bilhete é um código de uso único que o browser recebe.
2. O jogador escreve o nome e o browser envia o bilhete + nome para
   POST /api/recordes. Só é guardado o que o servidor calculou: o browser não
   consegue inventar pontos.
3. A página /recordes/ e GET /api/recordes/<jogo> mostram os melhores.
"""

from __future__ import annotations

import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from flask import Blueprint, abort, current_app, jsonify, render_template, request

from .partidas import Partidas

JOGOS = {
    "geo": "Detetive de Países",
    "artes": "Artes Marciais",
    "escape": "Última Ficha",
}
NOME_VALIDO = re.compile(r"^[\wÀ-ÿ .\-]{2,12}$")

bp = Blueprint("recordes", __name__)
_bilhetes = Partidas(prazo=30 * 60)  # 30 min para escrever o nome


# ---------------------------------------------------------------------------
# Base de dados
# ---------------------------------------------------------------------------
def _caminho() -> Path:
    return Path(current_app.config["BASE_DADOS"])


@contextmanager
def _ligar(caminho: Path | None = None):
    """Abre a base de dados, grava no fim (commit) e fecha sempre a ligação."""
    ligacao = sqlite3.connect(caminho or _caminho())
    ligacao.row_factory = sqlite3.Row
    try:
        with ligacao:  # commit (ou rollback se houver erro)
            yield ligacao
    finally:
        ligacao.close()


def iniciar_base(caminho: Path) -> None:
    """Cria a pasta e a tabela, se ainda não existirem."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with _ligar(caminho) as ligacao:
        ligacao.execute(
            """CREATE TABLE IF NOT EXISTS recordes (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                jogo    TEXT    NOT NULL,
                nome    TEXT    NOT NULL,
                pontos  INTEGER NOT NULL,
                detalhe TEXT    NOT NULL DEFAULT '',
                criado  TEXT    NOT NULL
            )"""
        )
        ligacao.execute("CREATE INDEX IF NOT EXISTS por_jogo ON recordes (jogo, pontos DESC)")


def melhores(jogo: str, limite: int = 10) -> list[dict]:
    with _ligar() as ligacao:
        linhas = ligacao.execute(
            "SELECT id, nome, pontos, detalhe, criado FROM recordes WHERE jogo = ? "
            "ORDER BY pontos DESC, criado ASC LIMIT ?",
            (jogo, limite),
        ).fetchall()
    return [dict(linha, posicao=i + 1) for i, linha in enumerate(linhas)]


def posicao_de(jogo: str, ident: int) -> int:
    """Posição (1 = melhor) de um recorde na tabela do seu jogo."""
    with _ligar() as ligacao:
        alvo = ligacao.execute("SELECT pontos, criado FROM recordes WHERE id = ?", (ident,)).fetchone()
        if alvo is None:
            return 0
        acima = ligacao.execute(
            "SELECT COUNT(*) FROM recordes WHERE jogo = ? AND (pontos > ? OR (pontos = ? AND criado < ?))",
            (jogo, alvo["pontos"], alvo["pontos"], alvo["criado"]),
        ).fetchone()[0]
    return acima + 1


def guardar(jogo: str, nome: str, pontos: int, detalhe: str) -> int:
    with _ligar() as ligacao:
        cursor = ligacao.execute(
            "INSERT INTO recordes (jogo, nome, pontos, detalhe, criado) VALUES (?, ?, ?, ?, ?)",
            (jogo, nome, int(pontos), detalhe, datetime.now().isoformat(timespec="seconds")),
        )
        return int(cursor.lastrowid)


# ---------------------------------------------------------------------------
# Bilhetes (usados pelos módulos dos jogos)
# ---------------------------------------------------------------------------
def emitir_bilhete(jogo: str, pontos: int, detalhe: str) -> str:
    """Regista uma pontuação calculada no servidor e devolve o bilhete."""
    if jogo not in JOGOS:
        raise ValueError(f"jogo desconhecido: {jogo}")
    return _bilhetes.criar({"jogo": jogo, "pontos": int(pontos), "detalhe": detalhe})


def limpar_nome(nome: str) -> str | None:
    nome = " ".join(str(nome or "").split())
    return nome if NOME_VALIDO.match(nome) else None


# ---------------------------------------------------------------------------
# API e página
# ---------------------------------------------------------------------------
@bp.post("/api/recordes")
def api_guardar():
    corpo = request.get_json(silent=True) or {}
    bilhete = _bilhetes.obter(str(corpo.get("bilhete", "")))
    if bilhete is None:
        return jsonify(erro="Esta partida já não pode ser guardada."), 404
    nome = limpar_nome(corpo.get("nome", ""))
    if nome is None:
        return jsonify(erro="O nome tem de ter 2 a 12 letras ou números."), 400
    _bilhetes.apagar(str(corpo["bilhete"]))  # uso único
    ident = guardar(bilhete["jogo"], nome, bilhete["pontos"], bilhete["detalhe"])
    return jsonify(
        id=ident,
        posicao=posicao_de(bilhete["jogo"], ident),
        tabela=melhores(bilhete["jogo"], 5),
    )


@bp.get("/api/recordes/<jogo>")
def api_listar(jogo: str):
    if jogo not in JOGOS:
        abort(404)
    limite = max(1, min(50, request.args.get("limite", 10, type=int)))
    return jsonify(tabela=melhores(jogo, limite))


@bp.get("/recordes/")
def pagina():
    tabelas = [{"id": j, "nome": nome, "linhas": melhores(j, 10)} for j, nome in JOGOS.items()]
    return render_template("recordes.html", tabelas=tabelas)
