"""Testes dos recordes (servidor/recordes.py)."""

import unittest

from servidor import recordes
from testes.base import TesteComApp


class TesteNomes(unittest.TestCase):
    def test_nomes(self):
        self.assertEqual(recordes.limpar_nome("  Ana   Rita "), "Ana Rita")
        self.assertEqual(recordes.limpar_nome("João"), "João")
        self.assertIsNone(recordes.limpar_nome("A"))
        self.assertIsNone(recordes.limpar_nome("<script>"))
        self.assertIsNone(recordes.limpar_nome("x" * 13))


class TesteApiRecordes(TesteComApp):
    def bilhete(self, pontos, jogo="geo"):
        with self.app.app_context():
            return recordes.emitir_bilhete(jogo, pontos, "teste")

    def test_guardar_e_ordenar(self):
        for nome, pontos in [("Ana", 500), ("Rui", 900), ("Eva", 700)]:
            estado, r = self.post("/api/recordes", {"bilhete": self.bilhete(pontos), "nome": nome})
            self.assertEqual(estado, 200)
        self.assertEqual(r["posicao"], 2)  # Eva, atrás do Rui
        tabela = self.cliente.get("/api/recordes/geo").get_json()["tabela"]
        self.assertEqual([l["nome"] for l in tabela], ["Rui", "Eva", "Ana"])

    def test_bilhete_so_se_usa_uma_vez(self):
        b = self.bilhete(100)
        self.assertEqual(self.post("/api/recordes", {"bilhete": b, "nome": "Ana"})[0], 200)
        self.assertEqual(self.post("/api/recordes", {"bilhete": b, "nome": "Ana"})[0], 404)
        self.assertEqual(self.post("/api/recordes", {"bilhete": "inventado", "nome": "Ana"})[0], 404)

    def test_nome_invalido_nao_gasta_o_bilhete(self):
        b = self.bilhete(100)
        self.assertEqual(self.post("/api/recordes", {"bilhete": b, "nome": "?"})[0], 400)
        self.assertEqual(self.post("/api/recordes", {"bilhete": b, "nome": "Ana"})[0], 200)

    def test_pagina_de_recordes(self):
        self.post("/api/recordes", {"bilhete": self.bilhete(1234, "escape"), "nome": "Tom"})
        html = self.cliente.get("/recordes/").get_data(as_text=True)
        self.assertIn("Última Ficha", html)
        self.assertIn("Tom", html)
        self.assertIn("1 234", html)


if __name__ == "__main__":
    unittest.main()
