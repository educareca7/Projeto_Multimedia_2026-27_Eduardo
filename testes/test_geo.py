"""Testes do Detetive de Países (servidor/geo.py)."""

import random
import unittest
from collections import Counter

from servidor import geo
from testes.base import TesteComApp


class TesteBaseDados(unittest.TestCase):
    def test_paises_estao_no_mapa_e_tem_6_pistas(self):
        banco = geo.banco()
        self.assertGreaterEqual(len(banco), 150)
        no_mapa = geo.ids_do_mapa()
        for pais in banco:
            self.assertIn(pais["id"], no_mapa)
            self.assertEqual(len(pais["pistas"]), 6, pais["nome"])

    def test_variedade_de_continentes(self):
        for semente in range(50):
            escolhidos = geo.escolher_paises(geo.banco(), random.Random(semente))
            self.assertEqual(len(escolhidos), geo.CONFIG["rondas"])
            maximo = max(Counter(p["continente"] for p in escolhidos).values())
            self.assertLessEqual(maximo, geo.CONFIG["maxPorContinente"])


class TestePontuacao(unittest.TestCase):
    def test_multiplicador(self):
        self.assertEqual(geo.multiplicador(1), 1)
        self.assertEqual(geo.multiplicador(2), 1.5)
        self.assertEqual(geo.multiplicador(10), geo.CONFIG["comboMax"])

    def test_pontos_ronda(self):
        conta = geo.pontos_ronda(pistas_vistas=1, tempo=0, sequencia=1)
        self.assertEqual(conta["pontos"], 1000 + 200)
        conta = geo.pontos_ronda(pistas_vistas=3, tempo=45, sequencia=2)
        self.assertEqual(conta["pontos"], round((600 + 100) * 1.5))


class TesteApiGeo(TesteComApp):
    def test_partida_completa(self):
        _, r = self.post("/api/geo/partida")
        ident = r["id"]
        partida = geo.partidas.obter(ident)
        for ronda in range(geo.CONFIG["rondas"]):
            _, info = self.post(f"/api/geo/{ident}/ronda")
            self.assertEqual(len(info["pistas"]), 1)  # só a 1.ª pista
            certo = partida["paises"][ronda]["id"]
            if ronda == 0:
                # um erro revela mais uma pista; repetir o erro não conta
                _, errado = self.post(f"/api/geo/{ident}/tentativa", {"pais": "000"})
                self.assertEqual((errado["resultado"], len(errado["pistas"])), ("errado", 2))
                self.assertEqual(self.post(f"/api/geo/{ident}/tentativa", {"pais": "000"})[1]["resultado"], "repetido")
            _, fim_ronda = self.post(f"/api/geo/{ident}/tentativa", {"pais": certo})
            self.assertEqual(fim_ronda["resultado"], "certo")
            self.assertEqual(len(fim_ronda["pistas"]), 6)
        _, fim = self.post(f"/api/geo/{ident}/fim")
        self.assertEqual(fim["acertos"], 5)
        self.assertEqual(fim["melhorSequencia"], 5)
        self.assertGreater(fim["pontos"], 5000)
        self.assertIsNotNone(fim["bilhete"])

    def test_tempo_nao_acaba_antes_do_fim(self):
        _, r = self.post("/api/geo/partida")
        self.post(f"/api/geo/{r['id']}/ronda")
        estado, _ = self.post(f"/api/geo/{r['id']}/tempo")
        self.assertEqual(estado, 409)

    def test_base_de_dados_nao_e_publica(self):
        self.assertEqual(self.cliente.get("/geo/data/paises/europa.json").status_code, 404)


if __name__ == "__main__":
    unittest.main()
