"""Testes da Última Ficha (servidor/escape.py)."""

import random
import unittest

from servidor import escape
from testes.base import TesteComApp


class TestePistasCabos(unittest.TestCase):
    def test_pistas_dao_sempre_uma_unica_solucao(self):
        rng = random.Random(1)
        for _ in range(300):
            sol = dict(zip(escape.CORES, rng.sample([1, 2, 3, 4], 4)))
            textos = escape.gerar_pistas_cabos(sol, rng)
            pistas = [p for p in escape.pistas_verdadeiras(sol) if p.texto in textos]
            # as pistas devolvidas são verdadeiras e só a solução as cumpre
            self.assertGreaterEqual(len(textos), 3)
            restantes = escape.solucoes(pistas)
            if len(pistas) == len(textos):  # (a pista direta de desempate é rara)
                self.assertEqual(restantes, [sol])

    def test_ha_24_ligacoes_possiveis(self):
        self.assertEqual(len(escape.todas_as_ligacoes()), 24)


class TesteRegras(unittest.TestCase):
    def test_rank(self):
        self.assertEqual(escape.calcular_rank(False, 500, 0), "X")
        self.assertEqual(escape.calcular_rank(True, 300, 0), "S")
        self.assertEqual(escape.calcular_rank(True, 300, 1), "A")
        self.assertEqual(escape.calcular_rank(True, 100, 2), "B")
        self.assertEqual(escape.calcular_rank(True, 10, 3), "C")

    def test_pontos(self):
        self.assertEqual(escape.calcular_pontos(False, 0, 0, 4), 400)
        self.assertEqual(escape.calcular_pontos(True, 100, 1, 9), 900 + 1000 + 600)

    def test_partida_publica_nao_tem_solucoes(self):
        gerada = escape.gerar_partida(random.Random(5))
        for chave in ("ligacoes", "musicaCerta", "senha", "codigoCofre", "codigo"):
            self.assertNotIn(chave, gerada["publico"])
        sol, pub = gerada["solucao"], gerada["publico"]
        self.assertEqual(sol["senha"], pub["iniciais"][0] + str(pub["ano"]))
        certa = pub["musicas"][sol["musicaCerta"]]
        self.assertEqual((certa["ano"], certa["lado"]), (pub["ano"], pub["ladoHino"]))
        self.assertEqual(sum(1 for m in pub["musicas"] if m["ano"] == pub["ano"]), 2)


class TesteApiEscape(TesteComApp):
    def solucao(self, ident):
        return escape.partidas.obter(ident)["solucao"]

    def test_partida_completa(self):
        _, r = self.post("/api/escape/partida")
        ident, sol = r["id"], self.solucao(r["id"])
        base = f"/api/escape/{ident}"
        # cabos errados e certos
        errados = {c: n % 4 + 1 for c, n in sol["ligacoes"].items()}
        self.assertEqual(self.post(f"{base}/cabos", {"ligacoes": errados})[1]["certas"], 0)
        self.assertEqual(self.post(f"{base}/cabos", {"ligacoes": sol["ligacoes"]})[1]["certas"], 4)
        self.assertTrue(self.post(f"{base}/disco", {"indice": sol["musicaCerta"]})[1]["certo"])
        self.assertFalse(self.post(f"{base}/senha", {"senha": "ABC123"})[1]["certo"])
        self.assertTrue(self.post(f"{base}/senha", {"senha": sol["senha"].lower()})[1]["certo"])
        self.assertTrue(self.post(f"{base}/cofre", {"codigo": sol["codigoCofre"]})[1]["certo"])
        self.assertEqual(self.post(f"{base}/dica")[1]["restantes"], 2)
        self.assertTrue(self.post(f"{base}/codigo", {"codigo": sol["codigo"]})[1]["certo"])
        estado, fim = self.post(f"{base}/fim", {"escapou": True, "passos": ["cartao", "privado", "uv", "batota"]})
        self.assertEqual(estado, 200)
        self.assertTrue(fim["escapou"])
        self.assertEqual(fim["rank"], "A")  # 1 dica e muito tempo de sobra
        self.assertEqual(fim["enigmas"], 9)
        self.assertIsNotNone(fim["bilhete"])
        # depois do fim a partida fecha
        self.assertEqual(self.post(f"{base}/codigo", {"codigo": sol["codigo"]})[0], 404)

    def test_nao_se_escapa_sem_o_codigo(self):
        _, r = self.post("/api/escape/partida")
        _, fim = self.post(f"/api/escape/{r['id']}/fim", {"escapou": True})
        self.assertFalse(fim["escapou"])
        self.assertEqual(fim["rank"], "X")
        self.assertIsNone(fim["bilhete"])

    def test_jukebox_precisa_de_energia(self):
        _, r = self.post("/api/escape/partida")
        estado, _ = self.post(f"/api/escape/{r['id']}/disco", {"indice": 0})
        self.assertEqual(estado, 409)

    def test_so_ha_3_dicas(self):
        _, r = self.post("/api/escape/partida")
        for _ in range(3):
            self.assertEqual(self.post(f"/api/escape/{r['id']}/dica")[0], 200)
        self.assertEqual(self.post(f"/api/escape/{r['id']}/dica")[0], 409)


if __name__ == "__main__":
    unittest.main()
