"""Arranque do Salão Arcade.

    python app.py      →  http://127.0.0.1:5000

A aplicação está no pacote servidor/ (lógica dos jogos, API e recordes).
O site (HTML/CSS/JavaScript) está em site/.
"""

from servidor import criar_app

app = criar_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
