// Caixa "Guarda o teu recorde" nos ecrãs finais. O servidor deu um bilhete com
// a pontuação que ele próprio calculou; aqui só se junta o nome.

import { enviar, obter } from "./api.js";

const fmt = new Intl.NumberFormat("pt-PT");
const CHAVE_NOME = "salao-arcade-nome";

function linhaTabela(l, meuId) {
    const li = document.createElement("li");
    li.classList.toggle("is-meu", l.id === meuId);
    const campos = [
        ["recordes-lista__pos", String(l.posicao)],
        ["recordes-lista__nome", l.nome],
        ["recordes-lista__pontos", fmt.format(l.pontos)],
        ["recordes-lista__detalhe", l.detalhe],
    ];
    for (const [classe, texto] of campos) {
        const el = document.createElement(classe.endsWith("pontos") ? "strong" : "span");
        el.className = classe;
        el.textContent = texto;
        li.append(el);
    }
    return li;
}

function desenharTabela(lista, tabela, meuId) {
    lista.replaceChildren(...tabela.map((l) => linhaTabela(l, meuId)));
}

/**
 * Prepara a caixa de recordes dentro de `caixa` (um elemento vazio).
 * jogo: "geo" | "artes" | "escape"; bilhete: dado pelo servidor (ou null).
 */
export function montarRecorde(caixa, { jogo, bilhete }) {
    caixa.className = "recorde-caixa";
    caixa.hidden = false;
    caixa.innerHTML = `
        <p class="recorde-caixa__titulo">Recordes</p>
        <form>
            <input name="nome" maxlength="12" autocomplete="off" spellcheck="false" placeholder="O teu nome" aria-label="O teu nome">
            <button class="btn btn--primary" type="submit">Guardar</button>
        </form>
        <p class="recorde-caixa__msg" aria-live="polite"></p>
        <ol class="recordes-lista"></ol>`;
    const form = caixa.querySelector("form");
    const campo = caixa.querySelector("input");
    const msg = caixa.querySelector(".recorde-caixa__msg");
    const lista = caixa.querySelector("ol");
    campo.value = localStorage.getItem(CHAVE_NOME) || "";
    // as teclas escritas aqui não devem chegar aos atalhos do jogo
    campo.addEventListener("keydown", (e) => e.stopPropagation());

    if (!bilhete) {
        form.hidden = true;
        msg.textContent = "Esta partida não entra nos recordes.";
    }

    obter(`recordes/${jogo}?limite=5`)
        .then((r) => desenharTabela(lista, r.tabela))
        .catch(() => {});

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.classList.remove("is-erro");
        msg.textContent = "A guardar…";
        try {
            const r = await enviar("recordes", { bilhete, nome: campo.value });
            localStorage.setItem(CHAVE_NOME, campo.value.trim());
            form.hidden = true;
            msg.textContent = `Ficaste em ${r.posicao}.º lugar!`;
            desenharTabela(lista, r.tabela, r.id);
        } catch (erro) {
            msg.classList.add("is-erro");
            msg.textContent = erro.message;
        }
    });
}
