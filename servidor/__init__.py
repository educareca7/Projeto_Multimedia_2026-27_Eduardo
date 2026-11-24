"""Servidor do Salão Arcade (Flask).

Faz duas coisas:
1. Serve o site (HTML, CSS, JavaScript e imagens da pasta site/).
2. Tem a lógica dos jogos: cada jogo é um Blueprint com a sua API em /api/...
   (sorteios, soluções, validação de respostas, pontuações) e os recordes
   ficam numa base de dados SQLite.
"""

from __future__ import annotations

import mimetypes
from pathlib import Path

from flask import Flask, abort, redirect, send_from_directory
from werkzeug.security import safe_join

from . import artes, escape, geo, recordes

RAIZ = Path(__file__).resolve().parent.parent
SITE_DIR = RAIZ / "site"

# Em alguns Windows o registo associa .js a text/plain, o que impede o
# browser de carregar ES modules. Fixar os tipos aqui evita isso.
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("font/woff2", ".woff2")


def criar_app(base_dados: Path | str | None = None) -> Flask:
    """Cria a aplicação. `base_dados` permite usar outra base (nos testes)."""
    app = Flask(__name__, static_folder=None)
    app.config["BASE_DADOS"] = str(base_dados or RAIZ / "dados" / "salao.db")
    app.json.ensure_ascii = False
    recordes.iniciar_base(Path(app.config["BASE_DADOS"]))

    app.register_blueprint(recordes.bp)
    app.register_blueprint(escape.bp)
    app.register_blueprint(geo.bp)
    app.register_blueprint(artes.bp)

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def site(path: str):
        if path.startswith("api/"):
            abort(404)
        caminho = safe_join(str(SITE_DIR), path)
        if caminho is None:
            abort(404)
        if Path(caminho).is_dir():
            if path and not path.endswith("/"):
                return redirect(f"/{path}/")
            path = f"{path}index.html"
        return send_from_directory(SITE_DIR, path)

    @app.after_request
    def sem_cache(resposta):
        # O browser confirma sempre se o ficheiro mudou (responde 304 se não
        # mudou): assim uma alteração aparece logo, sem versões antigas em cache.
        resposta.headers["Cache-Control"] = "no-cache"
        return resposta

    return app
