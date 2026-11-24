"""Testes das Artes Marciais (servidor/artes.py)."""

import random
import unittest

from servidor import artes
from testes.base import TesteComApp


class TesteRegras(unittest.TestCase):
    def test_pontos_acerto(self):
        # pontapé (150) acertado logo, sem combo: 150 + 75
        self.assertEqual(artes.pontos_acerto("pontapé", 1.0, 0), 225)
        # soco no último instante, com 4 acertos seguidos (×2)
        self.assertEqual(artes.pontos_acerto("soco", 0.0, 4), 200)
        self.assertEqual(artes.multiplicador(100), artes.CONFIG["comboMax"])

    def test_vida_do_alvo_encurta(self):
        self.assertEqual(artes.vida_do_alvo(0), artes.CONFIG["vidaAlvoInicial"])
        self.assertEqual(artes.vida_do_alvo(1000), artes.CONFIG["vidaAlvoMinima"])

    def test_nunca_a_mesma_tecnica_seguida(self):
        rng = random.Random(3)
        anterior = None
        for _ in range(200):
            nova = artes.sortear_tecnica("taekwondo", anterior, rng)
            self.assertNotEqual(nova, anterior)
            anterior = nova


class TesteApiArtes(TesteComApp):
    def test_acertos_e_combo(self):
        _, r = self.post("/api/artes/partida", {"arte": "boxe"})
        ident = r["id"]
        artes.partidas.obter(ident)["inicio"] -= artes.CONFIG["contagem"]  # saltar a contagem
        _, alvo = self.post(f"/api/artes/{ident}/alvo")
        # técnica errada não conta
        outra = next(t for t in artes.ARTES["boxe"]["tecnicas"] if t != alvo["tecnica"])
        self.assertEqual(self.post(f"/api/artes/{ident}/acerto", {"indice": alvo["indice"], "tecnica": outra})[0], 409)
        _, a1 = self.post(f"/api/artes/{ident}/acerto", {"indice": alvo["indice"], "tecnica": alvo["tecnica"]})
        self.assertEqual(a1["combo"], 1)
        # o mesmo alvo não pode ser acertado duas vezes
        self.assertEqual(self.post(f"/api/artes/{ident}/acerto", {"indice": alvo["indice"], "tecnica": alvo["tecnica"]})[0], 409)
        _, alvo2 = self.post(f"/api/artes/{ident}/alvo")
        _, a2 = self.post(f"/api/artes/{ident}/acerto", {"indice": alvo2["indice"], "tecnica": alvo2["tecnica"]})
        self.assertEqual(a2["combo"], 2)
        _, alvo3 = self.post(f"/api/artes/{ident}/alvo")
        self.assertEqual(self.post(f"/api/artes/{ident}/fugiu", {"indice": alvo3["indice"]})[1]["combo"], 0)
        # o fim só é aceite depois dos 60 s
        self.assertEqual(self.post(f"/api/artes/{ident}/fim")[0], 409)
        artes.partidas.obter(ident)["inicio"] -= artes.CONFIG["duracao"]
        _, fim = self.post(f"/api/artes/{ident}/fim", {"golpes": 5, "usadas": {alvo["tecnica"]: 3, "inventada": 9}})
        self.assertEqual((fim["acertos"], fim["alvos"], fim["melhorCombo"]), (2, 3, 2))
        self.assertEqual(fim["precisao"], 40)
        self.assertEqual(fim["pontos"], a1["pontos"] + a2["pontos"])

    def test_arte_desconhecida(self):
        self.assertEqual(self.post("/api/artes/partida", {"arte": "judo"})[0], 400)


if __name__ == "__main__":
    unittest.main()
