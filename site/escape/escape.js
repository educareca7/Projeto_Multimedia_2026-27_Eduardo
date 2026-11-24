// Última Ficha — App 3 do Salão Arcade (escape room).
//
// Duas divisões (salão com 4 paredes, escritório com 2), point-and-click,
// inventário com itens que se leem e se combinam, 3 dicas (−30 s cada) e
// 10 minutos até o alarme. Cadeia de enigmas (pistas cruzadas entre divisões):
//   fusível (vaso) → quadro elétrico (nota do eletricista com pistas lógicas)
//   → jukebox (hino do cartaz do torneio) → ficha → garra → cartão
//   → porta PRIVADO → computador (campeão dos recordes + ano do torneio)
//   → email → cofre (hora de fecho ao domingo, no horário) → lanterna UV
//   + pilhas do comando → marcas UV + ordem dos recordes → máquina final
//   (squash 20 s) → porta.
//
// As regras estão no servidor (servidor/escape.py): é ele que sorteia a partida,
// guarda as soluções, valida os enigmas, conta as dicas e o tempo e calcula o
// rank. Este ficheiro trata da sala, da navegação, do inventário e do desenho.

import { createGameShell } from "../shared/shell.js";
import { som } from "../shared/som.js";
import { enviar } from "../shared/api.js";
import { montarRecorde } from "../shared/recordes.js";
import { construirCena, acertarRelogio, PAREDES, SALAS, NOME_SALA, CORES_CABOS, POS_UV, PAREDES_UV, simbolo } from "./cenas.js";
import * as puzzles from "./puzzles.js";
import { sons, ligarAmbiente, pararAmbiente } from "./sons.js";

// Regras vindas do servidor no início de cada partida (duração, dicas...).
let CONFIG = null;
let idPartida = null;

const ICONES = {
    fusivel: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="13" y="4" width="14" height="32" rx="6" fill="#d8dde8" stroke="#2a2d38" stroke-width="2"/><rect x="13" y="14" width="14" height="12" fill="#e0a030"/></svg>',
    bilhete: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 6 H28 L33 11 V34 H8 Z" fill="#efe9d8" stroke="#8c8270" stroke-width="2"/><path d="M12 15 h16 M12 20 h16 M12 25 h11" stroke="#5b5470" stroke-width="2"/></svg>',
    ficha: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15" fill="#ffc53d" stroke="#8a5a00" stroke-width="3"/><circle cx="20" cy="20" r="9" fill="none" stroke="#8a5a00" stroke-width="2"/></svg>',
    cartao: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="10" width="32" height="21" rx="3" fill="#e9ecff" stroke="#0b0716" stroke-width="2"/><rect x="4" y="15" width="32" height="5" fill="#26283a"/><rect x="8" y="23" width="10" height="4" fill="#ff2bd6"/></svg>',
    lanterna: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="15" width="22" height="10" rx="3" fill="#2b2b38" stroke="#7a7a90" stroke-width="2"/><path d="M26 13 L34 9 V31 L26 27 Z" fill="#3a3a4c" stroke="#7a7a90" stroke-width="2"/></svg>',
    pilhas: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="7" y="8" width="11" height="26" rx="3" fill="#3dffa8" stroke="#0b3a26" stroke-width="2"/><rect x="22" y="8" width="11" height="26" rx="3" fill="#3dffa8" stroke="#0b3a26" stroke-width="2"/><rect x="10" y="5" width="5" height="4" fill="#cfd3e8"/><rect x="25" y="5" width="5" height="4" fill="#cfd3e8"/></svg>',
    uv: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="15" width="22" height="10" rx="3" fill="#2b2b38" stroke="#b48cff" stroke-width="2"/><path d="M26 13 L34 9 V31 L26 27 Z" fill="#3a3a4c" stroke="#b48cff" stroke-width="2"/><path d="M36 14 l3 -2 M37 20 h3 M36 26 l3 2" stroke="#d9b8ff" stroke-width="2"/></svg>',
};
const ITENS = {
    fusivel: { nome: "Fusível" },
    bilhete: { nome: "Nota do eletricista", legivel: true },
    ficha: { nome: "Ficha" },
    cartao: { nome: "Cartão de acesso" },
    lanterna: { nome: "Lanterna (sem pilhas)" },
    pilhas: { nome: "Pilhas" },
    uv: { nome: "Lanterna UV" },
};
// Onde cada item se usa (os outros só se leem ou se combinam).
const USO = { fusivel: "quadro", ficha: "garra", cartao: "privado" };

const $ = (id) => document.getElementById(id);
const ui = {
    hud: $("hud"),
    hudTempo: $("hud-tempo"),
    hudTempoChip: $("hud-tempo-chip"),
    hudDicas: $("hud-dicas"),
    jogo: $("jogo"),
    sala: $("sala"),
    svg: $("cena"),
    nomeParede: $("nome-parede"),
    nomeSala: $("nome-sala"),
    setaEsq: $("seta-esq"),
    setaDir: $("seta-dir"),
    mapa: $("mapa"),
    rotulo: $("rotulo"),
    cursorItem: $("cursor-item"),
    barra: $("barra"),
    inventario: $("inventario"),
    mensagem: $("mensagem"),
    btnDica: $("btn-dica"),
    modal: $("modal"),
    modalTitulo: $("modal-titulo"),
    modalCorpo: $("modal-corpo"),
    modalFechar: $("modal-fechar"),
    modalCaderno: $("modal-caderno"),
    caderno: $("caderno"),
    cadernoCorpo: $("caderno-corpo"),
    cadernoFechar: $("caderno-fechar"),
    btnCaderno: $("btn-caderno"),
    cadernoNovas: $("caderno-novas"),
    finalEyebrow: $("final-eyebrow"),
    finalTitulo: $("final-titulo"),
    finalRank: $("final-rank"),
    finalStats: $("final-stats"),
    finalNota: $("final-nota"),
    finalRecorde: $("final-recorde"),
    erroServidor: $("erro-servidor"),
};

let dados = null;
let estado = null;
let parede = 0;
let limpezaModal = null;
let raf = 0;

const shell = createGameShell({
    onStart: novaPartida,
    onLeaveGame: () => {
        terminarLoop();
        fecharModal();
        fecharCaderno();
        pararAmbiente();
        document.body.classList.remove("modo-sala");
    },
});

// ---------------------------------------------------------------------------
// Partida
// ---------------------------------------------------------------------------
/** Pede ao servidor uma partida nova (dados públicos + regras). */
async function novaPartida() {
    ui.erroServidor.hidden = true;
    let resposta;
    try {
        resposta = await enviar("escape/partida");
    } catch (erro) {
        shell.show("intro");
        ui.erroServidor.textContent = erro.message;
        ui.erroServidor.hidden = false;
        return;
    }
    idPartida = resposta.id;
    dados = resposta.dados;
    CONFIG = resposta.config;
    estado = {
        ativo: true,
        restante: CONFIG.duracao,
        ultimoSegundo: CONFIG.duracao,
        dicasUsadas: 0,
        fusivelNoVaso: true,
        fusivel: false,
        bilheteNoBalcao: true,
        energia: false,
        fichasGanhas: 0,
        fichaInserida: false,
        tentativasGarra: 0,
        cartao: false,
        privadoAberto: false,
        computador: false,
        cofre: false,
        pilhasNoComando: true,
        uv: false,
        codigoCerto: false,
        portaAberta: false,
        inventario: [],
        selecionado: null,
        visitadas: new Set([0]),
        // caderno e progresso dos enigmas (não se perde ao fechar a janela)
        notas: [], // ids pela ordem em que foram descobertas
        notasNovas: 0,
        uvVistas: new Set(),
        cabosQuadro: {},
        tentativasCabos: [],
        discosOuvidos: new Set(),
        tentativasSenha: [],
        tentativasCodigo: { cofre: [], maquina: [] },
        aEsperar: false, // à espera de uma resposta do servidor
    };
    construirCena(ui.svg, dados);
    fecharCaderno();
    desenharCaderno();
    ui.svg.setAttribute("class", "cena is-escuro");
    ui.sala.classList.remove("is-alarme", "is-saida");
    parede = 0;
    mostrarParede(null);
    desenharInventario();
    atualizarHud();
    ui.btnDica.disabled = false;
    ui.hud.hidden = false;
    document.body.classList.add("modo-sala");
    mensagem("Acordaste às escuras. Só a luz de emergência e o sinal de SAÍDA estão acesos.");
    ajustarTamanho();
    ligarAmbiente(false);
    iniciarLoop();
}

// ---------------------------------------------------------------------------
// Relógio
// ---------------------------------------------------------------------------
let ultimoInstante = null;
function iniciarLoop() {
    terminarLoop();
    ultimoInstante = null;
    const passo = (agora) => {
        const dt = ultimoInstante === null ? 0 : Math.min(0.25, Math.max(0, (agora - ultimoInstante) / 1000));
        ultimoInstante = agora;
        if (!estado?.ativo) return;
        estado.restante -= dt;
        const s = Math.ceil(estado.restante);
        if (s !== estado.ultimoSegundo) {
            estado.ultimoSegundo = s;
            if (s <= 60 && s > 0) sons.batimento();
        }
        acertarRelogio(ui.svg, CONFIG.duracao - Math.max(0, estado.restante));
        atualizarHud();
        if (estado.restante <= 0) {
            perder();
            return;
        }
        raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
}

function terminarLoop() {
    cancelAnimationFrame(raf);
    raf = 0;
}

const mmss = (s) => {
    const t = Math.max(0, Math.ceil(s));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function atualizarHud() {
    ui.hudTempo.textContent = mmss(estado.restante);
    ui.hudTempoChip.classList.toggle("is-urgente", estado.restante <= 60);
    const restam = CONFIG.dicas - estado.dicasUsadas;
    ui.hudDicas.textContent = String(restam);
    ui.btnDica.querySelector("[data-dicas]").textContent = String(restam);
}

// ---------------------------------------------------------------------------
// Navegação: paredes, divisões e planta
// ---------------------------------------------------------------------------
const salaDe = (i) => PAREDES[i].sala;

function vizinhas(i) {
    const lista = SALAS[salaDe(i)];
    const k = lista.indexOf(i);
    return { esq: lista[(k - 1 + lista.length) % lista.length], dir: lista[(k + 1) % lista.length] };
}

/** Mostra a parede atual. transicao: "esq" | "dir" | "porta" | null */
function mostrarParede(transicao = "dir") {
    ui.svg.querySelectorAll(".parede").forEach((g) => {
        const atual = Number(g.dataset.parede) === parede;
        g.classList.toggle("is-visivel", atual);
        g.classList.remove("entra-esq", "entra-dir", "entra-porta");
        if (atual && transicao) {
            void g.getBoundingClientRect();
            g.classList.add(`entra-${transicao}`);
        }
    });
    const v = vizinhas(parede);
    ui.nomeParede.textContent = PAREDES[parede].nome;
    ui.nomeSala.textContent = NOME_SALA[salaDe(parede)];
    ui.setaEsq.querySelector("span").textContent = PAREDES[v.esq].nome;
    ui.setaDir.querySelector("span").textContent = PAREDES[v.dir].nome;
    ui.setaEsq.setAttribute("aria-label", `Olhar para: ${PAREDES[v.esq].nome}`);
    ui.setaDir.setAttribute("aria-label", `Olhar para: ${PAREDES[v.dir].nome}`);
    estado?.visitadas.add(parede);
    desenharMapa();
    esconderRotulo();
    if (transicao) sons.navegar();
}

function rodar(d) {
    if (!estado?.ativo || !ui.modal.hidden) return;
    const v = vizinhas(parede);
    parede = d < 0 ? v.esq : v.dir;
    mostrarParede(d < 0 ? "esq" : "dir");
}

function irPara(i) {
    if (!estado?.ativo || i === parede) return;
    const mudaSala = salaDe(i) !== salaDe(parede);
    if (mudaSala && !estado.privadoAberto) return;
    if (mudaSala) sons.abrirPorta();
    parede = i;
    mostrarParede(mudaSala ? "porta" : "dir");
}

// Planta: salão (quadrado grande) e escritório (à esquerda, ligado pelo balcão).
// Cada parede: segmento [x1, y1, x2, y2], posição do nome [x, y, alinhamento].
const MAPA = {
    0: { seg: [104, 26, 228, 26], txt: [166, 43, "middle"] },
    1: { seg: [228, 26, 228, 150], txt: [223, 72, "end"] },
    2: { seg: [228, 150, 104, 150], txt: [166, 142, "middle"] },
    3: { seg: [104, 150, 104, 26], txt: [109, 72, "start"] },
    4: { seg: [8, 118, 8, 58], txt: [12, 72, "start"] },
    5: { seg: [82, 58, 82, 118], txt: [78, 112, "end"] },
};
const CENTRO_SALA = { salao: [166, 88], escritorio: [45, 88] };
const NOME_CURTO = { 0: "SAÍDA", 1: "JUKEBOX", 2: "GARRA", 3: "BALCÃO", 4: "SECRETÁRIA", 5: "CACIFOS" };

function desenharMapa() {
    if (!estado) return;
    const aberto = estado.privadoAberto;
    const [cx, cy] = CENTRO_SALA[salaDe(parede)];
    const [x1, y1, x2, y2] = MAPA[parede].seg;
    // cone de visão: do centro da divisão até às pontas da parede para onde olhas
    const cone = `<path class="mapa__cone" d="M${cx} ${cy} L${x1 + (cx - x1) * 0.06} ${y1 + (cy - y1) * 0.06} L${x2 + (cx - x2) * 0.06} ${y2 + (cy - y2) * 0.06} Z"/>`;
    const paredes = Object.entries(MAPA).map(([i, m]) => {
        const n = Number(i);
        const bloqueado = salaDe(n) === "escritorio" && !aberto;
        const classes = ["mapa__parede", n === parede ? "is-atual" : "", estado.visitadas.has(n) ? "is-visto" : "", bloqueado ? "is-bloqueado" : ""].join(" ");
        const [a, b, c, d] = m.seg;
        const [tx, ty, al] = m.txt;
        const pequeno = salaDe(n) === "escritorio" ? ' font-size="9.5"' : "";
        return `<g class="${classes}" data-ir="${n}">
          <path class="mapa__alvo" d="M${a} ${b} L${c} ${d}"/>
          <path class="mapa__linha" d="M${a} ${b} L${c} ${d}"/>
          <text x="${tx}" y="${ty}" text-anchor="${al}"${pequeno}>${bloqueado ? "?" : NOME_CURTO[n]}</text>
        </g>`;
    }).join("");
    ui.mapa.innerHTML = `<p class="mapa__titulo">Planta</p>
    <svg viewBox="0 0 236 156" aria-hidden="true">
      <text class="mapa__divisao" x="166" y="16" text-anchor="middle">SALÃO</text>
      <text class="mapa__divisao" x="45" y="48" text-anchor="middle">ESCRITÓRIO</text>
      <rect x="8" y="58" width="74" height="60" class="mapa__sala ${aberto ? "" : "is-fechada"}"/>
      <rect x="104" y="26" width="124" height="124" class="mapa__sala"/>
      <path d="M82 82 H104 M82 94 H104" class="mapa__porta ${aberto ? "is-aberta" : ""}"/>
      ${aberto ? "" : '<g class="mapa__cadeado"><rect x="38" y="85" width="14" height="12" rx="2"/><path d="M41 85 v-4 a4 4 0 0 1 8 0 v4"/></g>'}
      ${cone}
      ${paredes}
      <circle class="mapa__tu" cx="${cx}" cy="${cy}" r="5"/>
    </svg>
    <p class="mapa__legenda" id="mapa-legenda"></p>`;
    legendaMapa(null);
}

function legendaMapa(i) {
    const p = ui.mapa.querySelector(".mapa__legenda");
    if (!p) return;
    if (i === null || i === parede) {
        p.innerHTML = `Estás a olhar para <b></b>`;
        p.querySelector("b").textContent = PAREDES[parede].nome;
    } else if (salaDe(i) === "escritorio" && !estado.privadoAberto) {
        p.textContent = "Divisão trancada";
    } else {
        p.innerHTML = `Ir para <b></b>`;
        p.querySelector("b").textContent = PAREDES[i].nome;
    }
}

ui.mapa.addEventListener("pointerover", (e) => {
    const lado = e.target.closest?.("[data-ir]");
    legendaMapa(lado ? Number(lado.dataset.ir) : null);
});
ui.mapa.addEventListener("pointerleave", () => legendaMapa(null));

ui.mapa.addEventListener("click", (e) => {
    const lado = e.target.closest("[data-ir]");
    if (!lado || !ui.modal.hidden) return;
    const i = Number(lado.dataset.ir);
    if (salaDe(i) === "escritorio" && !estado.privadoAberto) {
        sons.nada();
        mensagem("Ainda não sabes o que há para lá da porta PRIVADO.");
        return;
    }
    irPara(i);
});

// ---------------------------------------------------------------------------
// Rótulo dos objetos e item no cursor
// ---------------------------------------------------------------------------
function posicaoNaSala(e) {
    const r = ui.sala.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width };
}

function esconderRotulo() {
    ui.rotulo.hidden = true;
}

ui.svg.addEventListener("pointermove", (e) => {
    const p = posicaoNaSala(e);
    const alvo = e.target.closest?.("[data-rotulo]");
    if (alvo && e.pointerType !== "touch") {
        ui.rotulo.textContent = alvo.dataset.rotulo;
        ui.rotulo.hidden = false;
        const esquerda = p.x > p.w - 180;
        ui.rotulo.style.left = `${esquerda ? p.x - 14 : p.x + 18}px`;
        ui.rotulo.style.top = `${p.y + 18}px`;
        ui.rotulo.classList.toggle("is-esquerda", esquerda);
    } else {
        esconderRotulo();
    }
    if (estado?.selecionado && estado.selecionado !== "uv") {
        ui.cursorItem.style.left = `${p.x}px`;
        ui.cursorItem.style.top = `${p.y}px`;
        ui.cursorItem.hidden = false;
    }
    if (estado?.selecionado === "uv") {
        const q = pontoSVG(e);
        if (q) {
            moverLuz(q.x, q.y);
            verificarMarcaUV(q.x, q.y);
        }
    }
});

/** A marca UV desta parede fica apontada no caderno quando a luz passa por cima. */
function verificarMarcaUV(x, y) {
    if (!PAREDES_UV.includes(parede) || estado.uvVistas.has(parede)) return;
    const [mx, my] = POS_UV[parede];
    if (Math.hypot(x - (mx - 20), y - (my - 12)) > 95) return;
    estado.uvVistas.add(parede);
    sons.apanhar();
    anotar("uv");
    mensagem(`Apareceu uma marca na parede! Apontaste-a no caderno (${estado.uvVistas.size} de ${PAREDES_UV.length}).`, "bom");
}
ui.svg.addEventListener("pointerleave", () => {
    esconderRotulo();
    ui.cursorItem.hidden = true;
    moverLuz(-999, -999);
});

// ---------------------------------------------------------------------------
// Inventário: selecionar, ler e combinar
// ---------------------------------------------------------------------------
function adicionarItem(id) {
    if (!estado.inventario.includes(id)) estado.inventario.push(id);
    desenharInventario();
    const slot = ui.inventario.querySelector(`[data-item="${id}"]`);
    slot?.classList.add("is-novo");
    setTimeout(() => slot?.classList.remove("is-novo"), 900);
}

function removerItem(id) {
    estado.inventario = estado.inventario.filter((i) => i !== id);
    if (estado.selecionado === id) definirSelecao(null);
    desenharInventario();
}

function definirSelecao(id) {
    estado.selecionado = id;
    const uv = id === "uv";
    ui.svg.classList.toggle("modo-uv", uv);
    ui.svg.classList.toggle("com-item", Boolean(id) && !uv);
    if (!uv) moverLuz(-999, -999);
    ui.cursorItem.hidden = true;
    if (id && !uv) ui.cursorItem.innerHTML = ICONES[id];
    desenharInventario();
}

function clicarItem(id) {
    if (!estado?.ativo) return;
    const sel = estado.selecionado;
    if (sel && sel !== id) {
        const par = [sel, id].sort().join("+");
        if (par === "lanterna+pilhas") {
            removerItem("lanterna");
            removerItem("pilhas");
            estado.uv = true;
            adicionarItem("uv");
            sons.combinar();
            mensagem("Meteste as pilhas na lanterna. Acende uma luz roxa estranha.", "bom");
            return;
        }
    }
    if (ITENS[id].legivel) {
        if (sel) definirSelecao(null);
        som.ui("pagina");
        // com um enigma aberto, a nota abre no caderno ao lado (sem fechar o enigma)
        if (!ui.modal.hidden) abrirCaderno(id);
        else abrirModal(ITENS[id].nome, puzzles.bilhete);
        return;
    }
    if (sel === id) {
        definirSelecao(null);
        return;
    }
    definirSelecao(id);
    sons.selecionar();
    if (id === "uv") {
        sons.uv();
        mensagem("Lanterna UV ligada. Passa-a devagar pelas paredes.");
    } else if (id === "lanterna") {
        mensagem("Carregas no botão e… nada. A lanterna não tem pilhas.");
    } else if (sel && sel !== id) {
        mensagem(`Isso não se junta com ${ITENS[sel].nome.toLowerCase()}.`);
    } else {
        mensagem(`${ITENS[id].nome} na mão.`);
    }
}

function desenharInventario() {
    const slots = [];
    for (let i = 0; i < 6; i += 1) {
        const id = estado.inventario[i];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "slot";
        if (id) {
            b.dataset.item = id;
            b.innerHTML = `${ICONES[id]}<span></span>`;
            b.lastChild.textContent = ITENS[id].nome;
            b.title = (ITENS[id].legivel ? `${ITENS[id].nome}: clica para ler` : `${ITENS[id].nome}: clica para pegar (ou para juntar ao item na mão)`) + ` · tecla ${i + 1}`;
            b.classList.toggle("is-selecionado", estado.selecionado === id);
            b.classList.toggle("is-legivel", Boolean(ITENS[id].legivel));
            b.setAttribute("aria-pressed", String(estado.selecionado === id));
            b.addEventListener("click", () => clicarItem(id));
        } else {
            b.disabled = true;
            b.setAttribute("aria-label", "Espaço vazio");
        }
        slots.push(b);
    }
    ui.inventario.replaceChildren(...slots);
}

// ---------------------------------------------------------------------------
// Lanterna UV
// ---------------------------------------------------------------------------
function moverLuz(x, y) {
    ui.svg.querySelectorAll(".uv-circulo, .uv-luz").forEach((c) => {
        c.setAttribute("cx", x);
        c.setAttribute("cy", y);
    });
}

function pontoSVG(e) {
    const m = ui.svg.getScreenCTM();
    return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : null;
}

// ---------------------------------------------------------------------------
// Mensagens e dicas
// ---------------------------------------------------------------------------
function mensagem(texto, tipo = "") {
    ui.mensagem.textContent = texto;
    ui.mensagem.className = `mensagem ${tipo ? `mensagem--${tipo}` : ""}`;
    void ui.mensagem.offsetWidth;
    ui.mensagem.classList.add("is-nova");
}

function dicaAtual() {
    const e = estado;
    const tem = (i) => e.inventario.includes(i);
    if (!e.fusivel) {
        if (!tem("fusivel")) return "O quadro elétrico não tem fusível. Às escuras, há qualquer coisa a brilhar num sítio onde ninguém costuma mexer… como um vaso.";
        return "Pega no fusível (clica nele no inventário) e depois clica no quadro elétrico.";
    }
    if (!e.energia) {
        if (e.bilheteNoBalcao) return "Em cima do balcão há um papel do eletricista. Vai dar jeito para ligar os cabos.";
        return "Lê a nota do eletricista (clica nela no inventário): cada pista elimina hipóteses. As lâmpadas do quadro dizem quantas ligações estão certas.";
    }
    if (!e.fichasGanhas) return "O cartaz do torneio diz qual é o hino oficial: na jukebox, procura a canção desse ano e desse lado do disco.";
    if (!e.cartao) {
        if (tem("ficha")) return "Pega na ficha e usa-a na máquina de garra. Larga a garra mesmo por cima do cartão.";
        return "Larga a garra mesmo por cima do cartão: a garra pára onde estiver quando carregas.";
    }
    if (!e.privadoAberto) return "O cartão de acesso abre a porta PRIVADO, ao lado do balcão.";
    if (!e.computador) return "A senha do computador é o campeão do quadro de recordes (as iniciais do 1.º lugar) seguido do ano do torneio, tudo junto.";
    if (!e.cofre) return "O email fala na hora a que o salão fecha ao domingo. Está no horário, na parede do escritório. Escreve só os números.";
    if (!e.uv) {
        if (!tem("pilhas")) return "A lanterna do cofre não tem pilhas. Há um aparelho no escritório que tem.";
        return "Pega nas pilhas e clica na lanterna, no inventário, para as juntar.";
    }
    if (!e.codigoCerto) return "Com a lanterna UV ligada, procura 4 símbolos com números: 2 no salão e 2 no escritório. O código são esses números pela ordem dos símbolos no quadro de recordes.";
    if (!e.portaAberta) return "Na máquina ÚLTIMA FICHA, aguenta 20 segundos sem deixar passar a bola.";
    return "A porta de saída já está aberta. Sai!";
}

ui.btnDica.addEventListener("click", async () => {
    if (!estado?.ativo || estado.dicasUsadas >= CONFIG.dicas) return;
    let r;
    try {
        r = await enviar(`escape/${idPartida}/dica`);
    } catch (erro) {
        mensagem(erro.message, "mau");
        return;
    }
    estado.dicasUsadas = r.dicasUsadas;
    estado.restante -= r.custo;
    som.ui("pagina");
    mensagem(`Dica: ${dicaAtual()}`, "dica");
    if (estado.dicasUsadas >= CONFIG.dicas) ui.btnDica.disabled = true;
    atualizarHud();
});

// ---------------------------------------------------------------------------
// Interações com os objetos
// ---------------------------------------------------------------------------
function horaRelogio() {
    const seg = 50 * 60 + (CONFIG.duracao - Math.max(0, estado.restante));
    return `2:${String(Math.floor(seg / 60) % 60).padStart(2, "0")}`;
}

function negar(texto) {
    sons.nada();
    mensagem(texto);
}

function interagir(id) {
    if (!estado?.ativo) return;
    const sel = estado.selecionado;
    if (sel && sel !== "uv" && USO[sel] !== id) {
        return negar(sel === "lanterna" || sel === "pilhas" ? "Isso não serve aqui." : "Não parece servir aqui.");
    }
    sons.examinar();
    const tem = (i) => estado.inventario.includes(i);
    switch (id) {
        // ----- Salão: saída
        case "relogio":
            return mensagem(`O relógio marca ${horaRelogio()}. O alarme do salão dispara às 3:00 em ponto.`);
        case "cartaz":
            anotar("cartaz");
            return abrirModal("Cartaz", puzzles.cartazTorneio);
        case "maquina":
            if (!estado.energia) return negar("A máquina ÚLTIMA FICHA está apagada.");
            if (estado.portaAberta) return mensagem("No ecrã: PORTA ABERTA.");
            return abrirModal("ÚLTIMA FICHA", puzzles.maquinaFinal);
        case "porta":
            if (estado.portaAberta) return fugir();
            sons.trancado();
            return mensagem("Trancada. A fechadura é eletrónica e tem um cabo que corre pelo chão.");
        // ----- Salão: jukebox
        case "quadro":
            if (!estado.fusivel) {
                if (sel === "fusivel") {
                    removerItem("fusivel");
                    estado.fusivel = true;
                    ui.svg.classList.add("com-fusivel");
                    sons.encaixe();
                    return mensagem("O fusível encaixa com um estalo. Os cabos continuam soltos.", "bom");
                }
                return mensagem("O quadro elétrico. Falta o fusível principal e os cabos estão todos desligados.");
            }
            return abrirModal("Quadro elétrico", puzzles.quadro);
        case "jukebox":
            if (!estado.energia) return negar("A jukebox está desligada.");
            if (tem("ficha") || (estado.fichaInserida && estado.tentativasGarra > 0) || estado.cartao) {
                return mensagem("A jukebox já te deu o que tinha. Mas ainda toca bem.");
            }
            return abrirModal("Jukebox", puzzles.jukebox);
        case "banco":
            return mensagem("Um banco alto que abana. Ninguém se sentaria aqui de propósito.");
        // ----- Salão: garra
        case "plantas":
            if (estado.fusivelNoVaso) {
                estado.fusivelNoVaso = false;
                ui.svg.classList.add("sem-fusivel-vaso");
                adicionarItem("fusivel");
                sons.apanhar();
                return mensagem("Enterrado na terra do vaso estava… um fusível!", "bom");
            }
            return mensagem("Só terra e folhas de plástico.");
        case "garra":
            if (!estado.energia) return negar("A máquina de garra está apagada. Lá dentro há peluches e um cartão branco.");
            if (estado.cartao) return mensagem("Já tiraste o cartão. O resto são peluches.");
            if (estado.fichaInserida && estado.tentativasGarra > 0) return abrirModal("Máquina de garra", puzzles.garra);
            if (sel === "ficha") {
                removerItem("ficha");
                estado.fichaInserida = true;
                estado.tentativasGarra = CONFIG.tentativasGarra;
                sons.moeda();
                mensagem(`A ficha cai lá dentro: ${CONFIG.tentativasGarra} tentativas.`);
                setTimeout(() => estado.ativo && abrirModal("Máquina de garra", puzzles.garra), 500);
                return undefined;
            }
            return mensagem("A máquina de garra só funciona com fichas. No meio dos peluches há um cartão branco.");
        case "poster":
            return mensagem("Um poster de um jogo antigo. O fantasma azul parece estar a olhar para ti.");
        // ----- Salão: balcão
        case "caixa":
            return mensagem("A caixa registadora está vazia. O visor marca 0,00.");
        case "frasco":
            return mensagem("O frasco das fichas está vazio. Nem uma para amostra.");
        case "gavetas":
            return mensagem("Papéis de rebuçado e talões antigos. Nada de útil.");
        case "bilhete":
            if (!estado.bilheteNoBalcao) return undefined;
            estado.bilheteNoBalcao = false;
            ui.svg.classList.add("sem-bilhete");
            adicionarItem("bilhete");
            anotar("bilhete");
            sons.apanhar();
            mensagem("Apanhaste uma nota do eletricista.", "bom");
            return abrirModal(ITENS.bilhete.nome, puzzles.bilhete);
        case "recordes":
            if (!estado.energia) return negar("O quadro de recordes está apagado.");
            anotar("recordes");
            return abrirModal("Recordes", puzzles.recordes);
        case "privado":
            if (estado.privadoAberto) return irPara(4);
            if (sel === "cartao") {
                removerItem("cartao");
                estado.privadoAberto = true;
                ui.svg.classList.add("privado-aberto");
                sons.leitor();
                desenharMapa();
                return mensagem("O leitor apita a verde e a porta PRIVADO abre-se. Há luz lá dentro.", "bom");
            }
            sons.trancado();
            return mensagem(estado.energia ? "Trancada. Ao lado há um leitor de cartões com um LED vermelho." : "Trancada. Ao lado há uma caixinha apagada.");
        // ----- Escritório
        case "horario":
            anotar("horario");
            return abrirModal("Horário", puzzles.horario);
        case "arquivo":
            return mensagem("Faturas, contratos e manuais de máquinas. Nada que ajude agora.");
        case "computador":
            anotar("postit");
            return abrirModal("Computador", puzzles.computador);
        case "candeeiro":
            return mensagem("Um candeeiro de secretária verde, daqueles antigos.");
        case "cadeira":
            return mensagem("A cadeira do gerente. Ainda está quente… ou é impressão tua?");
        case "cacifos":
            return mensagem("Os cacifos dos funcionários têm cadeados. Não são para ti.");
        case "tv":
            return mensagem(estado.pilhasNoComando ? "Uma televisão pequena. Não liga sem o comando." : "Sem pilhas no comando, não há televisão.");
        case "comando":
            if (estado.pilhasNoComando) {
                estado.pilhasNoComando = false;
                ui.svg.classList.add("sem-comando-pilhas");
                adicionarItem("pilhas");
                sons.apanhar();
                return mensagem("Abres a tampa do comando e tiras duas pilhas.", "bom");
            }
            return mensagem("O comando está sem pilhas.");
        case "cofre":
            if (estado.cofre) return mensagem("O cofre está vazio.");
            return abrirModal("Cofre", puzzles.cofre);
        case "cortica":
            anotar("cortica");
            return abrirModal("Quadro de cortiça", puzzles.cortica);
        case "voltar":
            sons.abrirPorta();
            parede = 3;
            return mostrarParede("porta");
        default:
            return undefined;
    }
}

/** Eventos enviados pelos mini-puzzles. */
function concluir(evento) {
    switch (evento) {
        case "energia":
            estado.energia = true;
            sons.energia();
            ui.svg.classList.remove("is-escuro");
            ui.svg.classList.add("a-ligar");
            setTimeout(() => ui.svg.classList.remove("a-ligar"), 1600);
            ligarAmbiente(true);
            mensagem("Luz! O salão acordou: as máquinas estão todas ligadas.", "bom");
            break;
        case "ficha":
            estado.fichasGanhas += 1;
            adicionarItem("ficha");
            sons.ficha();
            mensagem("Clinc! Caiu uma ficha no tabuleiro da jukebox.", "bom");
            break;
        case "garraSemTentativas":
            estado.fichaInserida = false;
            mensagem("Acabaram as tentativas. Se a jukebox tocar outra vez a música certa…");
            break;
        case "cartao":
            estado.cartao = true;
            ui.svg.classList.add("sem-cartao");
            adicionarItem("cartao");
            sons.premio();
            mensagem("Apanhaste um cartão de acesso. Diz «PESSOAL AUTORIZADO».", "bom");
            break;
        case "computador":
            estado.computador = true;
            ui.svg.classList.add("pc-ligado");
            anotar("email");
            mensagem("Entraste no computador do gerente. Há um email (fica no caderno).", "bom");
            break;
        case "cofre":
            estado.cofre = true;
            ui.svg.classList.add("cofre-aberto");
            sons.destrancar();
            adicionarItem("lanterna");
            mensagem("Dentro do cofre está uma lanterna de luz negra… sem pilhas.", "bom");
            break;
        case "codigo":
            estado.codigoCerto = true;
            ui.svg.classList.add("codigo-certo");
            break;
        case "porta":
            estado.portaAberta = true;
            ui.svg.classList.add("porta-aberta");
            sons.destrancar();
            mensagem("Lá do salão ouve-se a fechadura da porta de saída a abrir!", "bom");
            break;
        default:
    }
}

// ---------------------------------------------------------------------------
// Janela dos puzzles
// ---------------------------------------------------------------------------
function abrirModal(titulo, construir) {
    fecharModal();
    esconderRotulo();
    ui.cursorItem.hidden = true;
    ui.modalTitulo.textContent = titulo;
    ui.modalCorpo.replaceChildren();
    ui.modal.hidden = false;
    const ctx = { dados, estado, concluir, mensagem, anotar, validar, fechar: fecharModal };
    limpezaModal = construir(ui.modalCorpo, ctx) || null;
    if (!ui.modalCorpo.querySelector("input")) ui.modalFechar.focus({ preventScroll: true });
}

/**
 * Envia uma tentativa ao servidor (cabos, disco, senha, cofre, codigo) e
 * devolve a resposta. Em caso de erro de ligação avisa e devolve null.
 */
async function validar(enigma, dadosTentativa) {
    try {
        return await enviar(`escape/${idPartida}/${enigma}`, dadosTentativa);
    } catch (erro) {
        mensagem(erro.message, "mau");
        return null;
    }
}

function fecharModal() {
    if (ui.modal.hidden) return;
    limpezaModal?.();
    limpezaModal = null;
    ui.modal.hidden = true;
    ui.modalCorpo.replaceChildren();
}

ui.modalFechar.addEventListener("click", fecharModal);
ui.modal.addEventListener("pointerdown", (e) => {
    if (e.target === ui.modal) fecharModal();
});

// ---------------------------------------------------------------------------
// Caderno: guarda o que já leste e as tentativas, para não teres de voltar
// atrás nem de decorar. Abre por cima de tudo, até com um enigma aberto.
// ---------------------------------------------------------------------------
const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const iconeSimbolo = (s) => `<svg class="caderno__simbolo" viewBox="0 0 40 40" aria-label="${s}">${simbolo(s, 20, 20, 16, 'fill="currentColor"')}</svg>`;

/** Regista uma entrada (ou avisa que mudou). id: bilhete, cartaz, recordes, ... */
function anotar(id) {
    if (!estado) return;
    if (id && !estado.notas.includes(id)) {
        estado.notas.unshift(id);
        if (ui.caderno.hidden) estado.notasNovas += 1;
    }
    desenharCaderno();
}

function entradaCaderno(id) {
    const d = dados;
    const e = estado;
    switch (id) {
        case "bilhete":
            return ["Nota do eletricista", `<ul>${d.pistasCabos.map((p) => `<li>${escapar(p)}</li>`).join("")}</ul>
              <p class="caderno__obs">Tomadas de cima para baixo: 1, 2, 3, 4.</p>`];
        case "cabos":
            return ["Quadro elétrico: tentativas", `<ul class="caderno__tentativas">${e.tentativasCabos.map((t) =>
                `<li>${CORES_CABOS.map((c) => `<span class="caderno__cabo" style="--cor:${c.cor}" title="${c.nome}">${t.lig[c.id]}</span>`).join("")}<b>${t.certas}/4 certas</b></li>`).join("")}</ul>`];
        case "cartaz":
            return ["Cartaz do torneio", `<p>Torneio <b>${d.ano}</b> · O Rei do Salão</p><p>Hino oficial: a canção desse ano, <b>lado ${d.ladoHino}</b> do disco.</p>`];
        case "recordes":
            return ["Quadro de recordes", `<ol class="caderno__recordes">${d.ranking.map((s, k) =>
                `<li>${iconeSimbolo(s)}<b>${d.iniciais[k]}</b><span>${d.pontuacoes[k]}</span></li>`).join("")}</ol>`];
        case "postit":
            return ["Post-it no computador", "<p>«senha: campeão + ano»</p>"];
        case "senha":
            return ["Senhas que já tentaste", `<p>${e.tentativasSenha.map((s) => `<s>${escapar(s)}</s>`).join(" · ")}</p>`];
        case "email":
            return ["Email do gerente", "<p>«Mudei o código do cofre. Agora é a hora a que fechamos ao domingo (só os números). E não deixem a lanterna sem pilhas outra vez!»</p>"];
        case "horario":
            return ["Horário do salão", `<table class="caderno__horario">${["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((dia, k) =>
                `<tr><th>${dia}</th><td>${d.horario[k]}</td></tr>`).join("")}</table>`];
        case "cortica":
            return ["Recados da cortiça", `<ul><li>Desligar SEMPRE o disjuntor antes de sair.</li><li>As pilhas do comando foram parar à lanterna?</li><li>A última ficha ficou na jukebox.</li></ul>`];
        case "uv":
            return ["Marcas na parede (luz UV)", `<ul class="caderno__uv">${PAREDES_UV.filter((p) => e.uvVistas.has(p)).map((p) => {
                const s = d.simbolos[PAREDES_UV.indexOf(p)];
                return `<li>${iconeSimbolo(s)}<b>${d.digitos[s]}</b><span>${PAREDES[p].nome}</span></li>`;
            }).join("")}</ul>`];
        case "codigos": {
            const linha = (nome, l) => (l.length ? `<p>${nome}: ${l.map((c) => `<s>${c}</s>`).join(" · ")}</p>` : "");
            return ["Códigos que já tentaste", linha("Cofre", e.tentativasCodigo.cofre) + linha("Máquina final", e.tentativasCodigo.maquina)];
        }
        default:
            return null;
    }
}

function desenharCaderno() {
    if (!estado) return;
    const n = estado.notasNovas;
    ui.cadernoNovas.textContent = n ? `+${n}` : "";
    ui.cadernoNovas.hidden = !n;
    ui.btnCaderno.classList.toggle("tem-novas", n > 0);
    ui.modalCaderno.classList.toggle("tem-novas", n > 0);
    if (!estado.notas.length) {
        ui.cadernoCorpo.innerHTML = '<p class="caderno__vazio">Ainda não apontaste nada. O que leres e o que tentares fica guardado aqui.</p>';
        return;
    }
    ui.cadernoCorpo.innerHTML = estado.notas.map((id) => {
        const [titulo, corpo] = entradaCaderno(id);
        return `<section class="caderno__entrada" data-nota="${id}"><h3>${titulo}</h3>${corpo}</section>`;
    }).join("");
}

function abrirCaderno(foco = null) {
    if (!estado) return;
    estado.notasNovas = 0;
    desenharCaderno();
    ui.caderno.hidden = false;
    ui.sala.classList.add("com-caderno");
    ui.btnCaderno.setAttribute("aria-expanded", "true");
    const alvo = foco && ui.cadernoCorpo.querySelector(`[data-nota="${foco}"]`);
    if (alvo) {
        alvo.scrollIntoView({ block: "nearest" });
        alvo.classList.add("is-destaque");
        setTimeout(() => alvo.classList.remove("is-destaque"), 1200);
    } else {
        ui.cadernoCorpo.scrollTop = 0;
    }
}

function fecharCaderno() {
    ui.caderno.hidden = true;
    ui.sala.classList.remove("com-caderno");
    ui.btnCaderno.setAttribute("aria-expanded", "false");
}

function alternarCaderno() {
    if (!estado?.ativo) return;
    som.ui("pagina");
    if (ui.caderno.hidden) abrirCaderno();
    else fecharCaderno();
}

ui.btnCaderno.addEventListener("click", alternarCaderno);
ui.modalCaderno.addEventListener("click", alternarCaderno);
ui.cadernoFechar.addEventListener("click", fecharCaderno);

// ---------------------------------------------------------------------------
// Fim
// ---------------------------------------------------------------------------
function fugir() {
    estado.ativo = false;
    terminarLoop();
    fecharModal();
    fecharCaderno();
    sons.porta();
    setTimeout(() => som.ui("fanfarra"), 600);
    ui.sala.classList.add("is-saida");
    pararAmbiente();
    setTimeout(() => mostrarResultado(true), 1700);
}

function perder() {
    estado.ativo = false;
    estado.restante = 0;
    terminarLoop();
    fecharModal();
    fecharCaderno();
    atualizarHud();
    sons.alarme();
    ui.sala.classList.add("is-alarme");
    pararAmbiente();
    mensagem("O alarme disparou! As luzes vermelhas giram e a porta continua trancada…", "mau");
    setTimeout(() => mostrarResultado(false), 2600);
}

/** Passos feitos no browser (itens) que contam como enigmas resolvidos. */
function passosResolvidos() {
    const e = estado;
    return Object.entries({ cartao: e.cartao, privado: e.privadoAberto, uv: e.uv, porta: e.portaAberta })
        .filter(([, feito]) => feito)
        .map(([id]) => id);
}

async function mostrarResultado(escapou) {
    let r;
    try {
        r = await enviar(`escape/${idPartida}/fim`, { escapou, passos: passosResolvidos() });
    } catch (erro) {
        r = { escapou, rank: "?", tempoUsado: CONFIG.duracao - Math.max(0, estado.restante), tempoSobra: 0, dicasUsadas: estado.dicasUsadas, dicas: CONFIG.dicas, enigmas: "?", totalEnigmas: 9, pontos: 0, bilhete: null };
        mensagem(erro.message, "mau");
    }
    document.body.classList.remove("modo-sala");
    ui.hud.hidden = true;
    ui.finalEyebrow.textContent = r.escapou ? "Escapaste!" : "O alarme tocou";
    ui.finalTitulo.textContent = r.escapou ? "Rank" : "Apanhado";
    ui.finalRank.textContent = r.rank;
    ui.finalRank.dataset.rank = r.rank;
    const stats = [
        ["Tempo usado", mmss(r.tempoUsado)],
        ["Tempo que sobrou", r.escapou ? mmss(r.tempoSobra) : "0:00"],
        ["Dicas usadas", `${r.dicasUsadas}/${r.dicas}`],
        ["Enigmas resolvidos", `${r.enigmas}/${r.totalEnigmas}`],
        ["Pontuação", new Intl.NumberFormat("pt-PT").format(r.pontos)],
    ];
    ui.finalStats.replaceChildren(...stats.map(([rotulo, valor]) => {
        const div = document.createElement("div");
        div.className = "stat";
        div.append(Object.assign(document.createElement("span"), { textContent: rotulo }), Object.assign(document.createElement("strong"), { textContent: valor }));
        return div;
    }));
    ui.finalNota.textContent = r.escapou
        ? "S: sem dicas e pelo menos 4 min de sobra · A: até 1 dica e 2:30 de sobra · B: 1 min de sobra · C: saíste mesmo à justa. Pontos: 100 por enigma, 10 por segundo que sobra e 300 por dica que não usaste."
        : "Às 3:00 o alarme disparou com a porta ainda trancada. Tenta outra vez: as pistas e as soluções mudam em cada partida.";
    montarRecorde(ui.finalRecorde, { jogo: "escape", bilhete: r.bilhete });
    shell.show("result");
}

// ---------------------------------------------------------------------------
// Tamanho: a sala ocupa o espaço até ao fundo do ecrã, sem scroll (PC)
// ---------------------------------------------------------------------------
function ajustarTamanho() {
    if (shell.current !== "game") return;
    if (window.innerWidth <= 900) {
        ui.sala.style.width = "";
        return;
    }
    const topo = ui.sala.getBoundingClientRect().top + window.scrollY;
    const disponivel = window.innerHeight - topo - ui.barra.offsetHeight - 28;
    const largura = Math.min(ui.jogo.clientWidth, Math.max(320, disponivel) * (16 / 9));
    ui.sala.style.width = `${Math.floor(largura)}px`;
}
window.addEventListener("resize", ajustarTamanho);

// ---------------------------------------------------------------------------
// Controlos
// ---------------------------------------------------------------------------
ui.setaEsq.addEventListener("click", () => rodar(-1));
ui.setaDir.addEventListener("click", () => rodar(1));

ui.svg.addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-alvo]");
    if (alvo) interagir(alvo.dataset.alvo);
});
ui.svg.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const alvo = e.target.closest?.("[data-alvo]");
    if (!alvo) return;
    e.preventDefault();
    interagir(alvo.dataset.alvo);
});

document.addEventListener("keydown", (e) => {
    if (shell.current !== "game" || !estado?.ativo || e.ctrlKey || e.metaKey || e.altKey) return;
    const aEscrever = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (e.key === "Escape") {
        if (!ui.modal.hidden) fecharModal();
        else if (!ui.caderno.hidden) fecharCaderno();
        else if (estado.selecionado) definirSelecao(null);
        return;
    }
    if (!aEscrever && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        alternarCaderno();
        return;
    }
    if (!ui.modal.hidden) return;
    if (/^[1-6]$/.test(e.key)) {
        const id = estado.inventario[Number(e.key) - 1];
        if (id) clicarItem(id);
        return;
    }
    if (e.key === "ArrowLeft") {
        e.preventDefault();
        rodar(-1);
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        rodar(1);
    }
});

// Acesso para testes automáticos (só com ?depurar no endereço).
if (new URLSearchParams(location.search).has("depurar")) {
    window.__escape = { estado: () => estado, dados: () => dados, id: () => idPartida, interagir, concluir, clicarItem, definirSelecao, rodar, irPara, adicionarItem };
}
