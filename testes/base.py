"""Base comum dos testes: uma app com uma base de dados temporária."""

import tempfile
import unittest
from pathlib import Path

from servidor import criar_app


class TesteComApp(unittest.TestCase):
    def setUp(self):
        self._pasta = tempfile.TemporaryDirectory()
        self.app = criar_app(base_dados=Path(self._pasta.name) / "teste.db")
        self.app.testing = True
        self.cliente = self.app.test_client()

    def tearDown(self):
        self._pasta.cleanup()

    def post(self, url, dados=None):
        resposta = self.cliente.post(url, json=dados or {})
        return resposta.status_code, resposta.get_json()
