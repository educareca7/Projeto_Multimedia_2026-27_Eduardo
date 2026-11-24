/**
 * Ciclo de vida comum a todas as apps: intro → jogo → resultado → (de novo | sair).
 *
 * A página tem três elementos com data-screen="intro" | "game" | "result".
 * Botões com data-action="start" (intro) ou data-action="again" (resultado)
 * iniciam uma nova partida. A saída é um link normal para o dashboard.
 *
 *   const shell = createGameShell({ onStart: () => jogo.iniciar() });
 *   // ...quando a partida acaba:
 *   shell.show("result");
 */
import { ativarRegras } from "./regras.js";
import { som } from "./som.js";

export function createGameShell({ onStart, onLeaveGame } = {}) {
    ativarRegras(); // regras da intro passo a passo (ol.how-to[data-passos])
    som.montarBotao(); // botão de som na barra de topo (tecla M)
    const screens = [...document.querySelectorAll("[data-screen]")];
    let current = null;

    function show(name) {
        if (current === "game" && name !== "game") onLeaveGame?.();
        current = name;
        for (const screen of screens) {
            screen.hidden = screen.dataset.screen !== name;
        }
        const active = screens.find((screen) => screen.dataset.screen === name);
        // Leva o foco para o novo ecrã (teclado e leitores de ecrã).
        const focusTarget = active?.querySelector("[data-autofocus]") || active?.querySelector("h1, h2");
        if (focusTarget) {
            if (!focusTarget.hasAttribute("tabindex") && !focusTarget.matches("button, a, input")) {
                focusTarget.setAttribute("tabindex", "-1");
            }
            focusTarget.focus({ preventScroll: false });
        }
    }

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) {
            if (event.target.closest(".btn:not(.rules__next):not(.rules__prev)")) som.ui("clique");
            return;
        }
        const action = button.dataset.action;
        if (action === "start" || action === "again") {
            som.ui("comecar");
            show("game");
            onStart?.();
        }
    });

    show("intro");
    return {
        show,
        get current() {
            return current;
        },
    };
}
