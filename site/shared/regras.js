/**
 * Regras passo a passo no ecrã de intro.
 *
 * Transforma <ol class="how-to" data-passos> num tutorial: uma regra de cada
 * vez, com barra de progresso, "Seguinte"/"Anterior", teclado (→ / Enter / ←)
 * e "Saltar regras". O botão de começar (data-action="start") só aparece na
 * última regra. Cada <li> pode começar com um <svg class="rule-icon">.
 * Sem JavaScript, a lista normal continua visível.
 */
import { som } from "./som.js";

export function criarRegras(lista) {
    const ecra = lista.closest("[data-screen]");
    const acoes = ecra?.querySelector(".actions");
    const itens = [...lista.children];
    if (!itens.length) return;

    // ---- construir a estrutura ----
    const raiz = document.createElement("div");
    raiz.className = "rules";
    raiz.innerHTML = `
        <div class="rules__head">
            <span class="rules__count"></span>
            <button type="button" class="rules__skip">Saltar regras »</button>
        </div>
        <div class="rules__bar" role="tablist" aria-label="Regras"></div>
        <div class="rules__stage" aria-live="polite"></div>
        <div class="rules__nav">
            <button type="button" class="btn btn--ghost rules__prev" aria-label="Regra anterior">◀</button>
            <button type="button" class="btn rules__next">Seguinte ▶</button>
        </div>`;
    const contador = raiz.querySelector(".rules__count");
    const barra = raiz.querySelector(".rules__bar");
    const palco = raiz.querySelector(".rules__stage");
    const anterior = raiz.querySelector(".rules__prev");
    const seguinte = raiz.querySelector(".rules__next");
    const saltar = raiz.querySelector(".rules__skip");

    const passos = itens.map((li, i) => {
        const regra = document.createElement("div");
        regra.className = "rule";
        regra.hidden = true;
        const icone = li.querySelector(".rule-icon");
        const numero = document.createElement("span");
        numero.className = "rule__n pixel";
        numero.textContent = String(i + 1).padStart(2, "0");
        const texto = document.createElement("p");
        texto.className = "rule__text";
        if (icone) icone.remove();
        texto.append(...li.childNodes);
        const lado = document.createElement("div");
        lado.className = "rule__side";
        lado.append(icone || document.createElement("span"), numero);
        regra.append(lado, texto);
        palco.append(regra);

        const segmento = document.createElement("button");
        segmento.type = "button";
        segmento.className = "rules__seg";
        segmento.setAttribute("aria-label", `Regra ${i + 1}`);
        segmento.addEventListener("click", () => irPara(i));
        barra.append(segmento);
        return { regra, segmento };
    });

    lista.replaceWith(raiz);

    let atual = -1;

    function irPara(indice, { focar = true } = {}) {
        const novo = Math.max(0, Math.min(indice, passos.length - 1));
        if (atual >= 0 && novo !== atual) som.ui("passo");
        const direcao = novo >= atual ? "is-forward" : "is-back";
        atual = novo;
        passos.forEach(({ regra, segmento }, i) => {
            regra.hidden = i !== atual;
            regra.classList.remove("is-forward", "is-back");
            segmento.classList.toggle("is-done", i < atual);
            segmento.classList.toggle("is-current", i === atual);
            segmento.setAttribute("aria-current", i === atual ? "step" : "false");
        });
        void passos[atual].regra.offsetWidth; // reiniciar a animação de entrada
        passos[atual].regra.classList.add(direcao);

        contador.textContent = `Regra ${atual + 1} de ${passos.length}`;
        anterior.disabled = atual === 0;
        const ultima = atual === passos.length - 1;
        seguinte.hidden = ultima;
        saltar.hidden = ultima;
        if (acoes) {
            acoes.hidden = !ultima;
            acoes.classList.toggle("is-ready", ultima);
        }
        if (focar) {
            const alvo = ultima ? acoes?.querySelector("[data-action='start']") : seguinte;
            alvo?.focus({ preventScroll: true });
        }
    }

    anterior.addEventListener("click", () => irPara(atual - 1));
    seguinte.addEventListener("click", () => irPara(atual + 1));
    saltar.addEventListener("click", () => irPara(passos.length - 1));

    // Setas do teclado enquanto o ecrã de intro estiver visível.
    document.addEventListener("keydown", (evento) => {
        if (ecra.hidden || evento.ctrlKey || evento.metaKey || evento.altKey) return;
        if (evento.key === "ArrowRight") {
            evento.preventDefault();
            irPara(atual + 1);
        } else if (evento.key === "ArrowLeft") {
            evento.preventDefault();
            irPara(atual - 1);
        }
    });

    irPara(0, { focar: false });
    requestAnimationFrame(() => seguinte.focus({ preventScroll: true }));
}

/** Ativa todas as listas de regras marcadas com data-passos na página. */
export function ativarRegras() {
    document.querySelectorAll("ol.how-to[data-passos]").forEach(criarRegras);
}
