// Artes Marciais — App 2 do Salão Arcade.
// Escolha da arte → treino livre (visualizador) → desafio de 60 s → resultado.
//
// No desafio, o servidor (servidor/artes.py) é o árbitro: sorteia cada alvo,
// confirma cada acerto e calcula os pontos, o combo e as estatísticas finais.
// Aqui ficam a animação, a física dos alvos, o som e o desenho.

import { createGameShell } from "../shared/shell.js";
import { enviar } from "../shared/api.js";
import { montarRecorde } from "../shared/recordes.js";
import { ARTES } from "./tecnicas.js";
import { Lutador, pontosDeImpacto } from "./animacao.js";
import { calcularEsqueleto, desenharLutador, paraMundo } from "./rig.js";
import { desenharCenario, desenharPrimeiroPlano } from "./cenarios.js";
import { criarObjeto, COR_CATEGORIA } from "./objetos.js";
import * as sons from "./sons.js";

// Regras do desafio: vêm do servidor quando o desafio começa.
let CONFIG = null;

// Prévias da escolha de arte: céu noturno, chão e uma linha de néon na cor da arte.
const FUNDO_PREVIA = {
    boxe: ["#3a1450", "#07061a", "#1c1f3c", "#22e8ff"],
    muaythai: ["#4a1840", "#0b0618", "#2a1a22", "#ff2bd6"],
    taekwondo: ["#173a5a", "#060a1c", "#1a2236", "#3dffa8"],
};

const $ = (id) => document.getElementById(id);
const ui = {
    hud: $("hud"),
    hudArte: $("hud-arte"),
    hudModo: $("hud-modo"),
    hudTempo: $("hud-tempo"),
    hudPontos: $("hud-pontos"),
    hudCombo: $("hud-combo"),
    hudComboChip: $("hud-combo-chip"),
    selecao: $("selecao"),
    grelha: $("selecao-grelha"),
    arena: $("arena"),
    palco: $("palco"),
    aviso: $("aviso"),
    botoesTecnicas: $("botoes-tecnicas"),
    botoesCombos: $("botoes-combos"),
    btnDesafio: $("btn-desafio"),
    btnTrocar: $("btn-trocar"),
    finalArte: $("final-arte"),
    finalScore: $("final-score"),
    finalStats: $("final-stats"),
    finalRecorde: $("final-recorde"),
};
const fmtInt = new Intl.NumberFormat("pt-PT");
const fmtMult = (m) => `×${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(m)}`;

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
let modo = "parado"; // parado | selecao | treino | contagem | desafio
let arte = null;
let lutador = null;
let impactos = {};
let desafio = null;
let camX = 0;
let tremor = 0;
let tempo = 0;
let efeitos = [];
let avisoTimer = 0;
const previas = []; // lutadores dos cartões de escolha

const shell = createGameShell({
    onStart: abrirSelecao,
    onLeaveGame: () => {
        modo = "parado";
        document.body.classList.remove("modo-arena");
        sons.pararAmbiente();
    },
});

// ---------------------------------------------------------------------------
// Escolha da arte
// ---------------------------------------------------------------------------
function construirSelecao() {
    ARTES.forEach((a, i) => {
        const cartao = document.createElement("button");
        cartao.type = "button";
        cartao.className = "arte-cartao";
        cartao.style.setProperty("--cor", a.cor);
        const canvas = document.createElement("canvas");
        const nome = document.createElement("span");
        nome.className = "arte-cartao__nome";
        nome.innerHTML = `<span></span><kbd>${i + 1}</kbd>`;
        nome.firstChild.textContent = a.nome.toUpperCase();
        const desc = document.createElement("p");
        desc.textContent = a.descricao;
        const lista = document.createElement("ul");
        lista.className = "arte-cartao__tecnicas";
        for (const t of Object.values(a.tecnicas)) {
            if (!t.tecla) continue;
            const li = document.createElement("li");
            li.textContent = t.nome;
            lista.append(li);
        }
        cartao.append(canvas, nome, desc, lista);
        cartao.addEventListener("click", () => escolherArte(a));
        ui.grelha.append(cartao);
        const l = new Lutador(a);
        l.relogio = i * 0.7;
        previas.push({ arte: a, lutador: l, canvas, proximoGolpe: 1.5 + i * 0.9 });
    });
}

function abrirSelecao() {
    modo = "selecao";
    desafio = null;
    ui.hud.hidden = true;
    ui.selecao.hidden = false;
    ui.arena.hidden = true;
    document.body.classList.remove("modo-arena");
    document.body.style.setProperty("--accent", "var(--magenta)");
    sons.pararAmbiente();
    ui.grelha.querySelector(".arte-cartao")?.focus({ preventScroll: true });
}

function escolherArte(a) {
    arte = a;
    lutador = new Lutador(a);
    // sons: deslocação de ar e expiração em cada golpe, passos ao mover
    lutador.aoIniciar = (id, def) => {
        if (def.avanco) sons.passo(a.id, def.duracao);
        else if (def.categoria === "defesa") sons.esquiva(a.id, def);
        else sons.golpe(a.id, def);
    };
    impactos = pontosDeImpacto(a);
    sons.ambiente(a.id);
    camX = lutador.ancora + 0.75;
    efeitos = [];
    construirBotoes();
    document.body.style.setProperty("--accent", a.cor);
    ui.selecao.hidden = true;
    ui.arena.hidden = false;
    ui.hud.hidden = false;
    ui.hudArte.textContent = a.nome;
    document.body.classList.add("modo-arena");
    ajustarAltura();
    entrarEmTreino();
    ui.btnDesafio.focus({ preventScroll: true });
}

function entrarEmTreino() {
    modo = "treino";
    desafio = null;
    ui.hudModo.hidden = false;
    ui.hudModo.textContent = "Treino livre";
    document.querySelectorAll("[data-desafio]").forEach((el) => (el.hidden = true));
    ui.btnDesafio.disabled = false;
    ui.btnTrocar.disabled = false;
}

function construirBotoes() {
    ui.botoesTecnicas.replaceChildren();
    for (const [id, t] of Object.entries(arte.tecnicas)) {
        if (!t.tecla) continue;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tec";
        b.dataset.tecnica = id;
        b.style.setProperty("--cor", COR_CATEGORIA[t.categoria]);
        b.innerHTML = `<span class="tec__nome"></span><kbd></kbd>`;
        b.children[0].textContent = t.nome;
        b.children[1].textContent = t.tecla;
        b.title = `${t.nome} (${t.categoria}): ${t.descricao}`;
        b.addEventListener("click", () => tecnica(id));
        ui.botoesTecnicas.append(b);
    }
    ui.botoesCombos.replaceChildren();
    arte.combos.forEach((c, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tec tec--combo";
        b.dataset.combo = String(i);
        b.innerHTML = `<span class="tec__nome"></span><kbd></kbd>`;
        b.children[0].textContent = c.nome;
        b.children[1].textContent = c.tecla;
        b.title = c.sequencia.map((id) => arte.tecnicas[id].nome).join(" → ");
        b.addEventListener("click", () => combo(i));
        ui.botoesCombos.append(b);
    });
}

// Em PC, a arena ocupa exatamente o espaço até ao fundo do ecrã (sem scroll).
function ajustarAltura() {
    if (ui.arena.hidden) return;
    if (window.innerWidth <= 900) {
        ui.arena.style.height = "";
        return;
    }
    const topo = ui.arena.getBoundingClientRect().top;
    ui.arena.style.height = `${Math.max(360, window.innerHeight - topo - 16)}px`;
}
window.addEventListener("resize", ajustarAltura);

// ---------------------------------------------------------------------------
// Ações do jogador
// ---------------------------------------------------------------------------
function podeAgir() {
    return lutador && (modo === "treino" || modo === "desafio" || modo === "contagem");
}

function tecnica(id) {
    if (!podeAgir() || modo === "contagem") return;
    if (lutador.executar(id)) destacarBotao(`[data-tecnica="${id}"]`);
}

function combo(i) {
    if (!podeAgir() || modo === "contagem") return;
    const c = arte.combos[i];
    lutador.executarCombo(c.sequencia);
    destacarBotao(`[data-combo="${i}"]`);
}

function mover(sentido) {
    if (!podeAgir()) return;
    if (lutador.executar(sentido > 0 ? "avancar" : "recuar")) destacarBotao(`[data-mover="${sentido}"]`);
}

function destacarBotao(seletor) {
    const b = document.querySelector(seletor);
    if (!b) return;
    b.classList.add("is-premido");
    setTimeout(() => b.classList.remove("is-premido"), 140);
}

function mostrarAviso(texto, duracao = 0.8) {
    ui.aviso.textContent = texto;
    ui.aviso.classList.remove("is-visivel");
    void ui.aviso.offsetWidth;
    ui.aviso.classList.add("is-visivel");
    avisoTimer = duracao;
}

// ---------------------------------------------------------------------------
// Desafio
// ---------------------------------------------------------------------------
async function iniciarDesafio() {
    if (modo !== "treino") return;
    modo = "a-preparar";
    ui.btnDesafio.disabled = true;
    let r;
    try {
        r = await enviar("artes/partida", { arte: arte.id });
    } catch (erro) {
        mostrarAviso("Sem servidor", 1.5);
        flutuante(lutador.ancora, 2.1, erro.message, "#ffd2c8");
        entrarEmTreino();
        return;
    }
    CONFIG = r.config;
    modo = "contagem";
    lutador.fila = [];
    desafio = {
        id: r.id,
        restante: CONFIG.duracao,
        contagem: CONFIG.contagem + 0.6,
        pontos: 0,
        combo: 0,
        melhorCombo: 0,
        acertos: 0,
        alvosTotal: 0,
        golpes: 0,
        usadas: {},
        alvo: null,
        proximoEm: 0.2,
        pedindo: false, // à espera do próximo alvo do servidor
        decorrido: 0,
    };
    ui.hudModo.hidden = true;
    document.querySelectorAll("[data-desafio]").forEach((el) => (el.hidden = false));
    ui.btnDesafio.disabled = true;
    ui.btnTrocar.disabled = true;
    mostrarAviso(String(CONFIG.contagem));
    sons.desafio.contagem();
    atualizarHud();
}

/** Pede o próximo alvo ao servidor (técnica, tempo de espera e sorteio da posição). */
async function criarAlvo() {
    const d = desafio;
    d.pedindo = true;
    let r;
    try {
        r = await enviar(`artes/${d.id}/alvo`);
    } catch {
        r = null;
    }
    d.pedindo = false;
    if (desafio !== d || modo !== "desafio" || !r) {
        if (desafio === d) d.proximoEm = 1;
        return;
    }
    const id = r.tecnica;
    const ponto = impactos[id];
    const opcoes = CONFIG.desvios.filter((x) => x + ponto.x >= 0.42);
    const desvio = opcoes[Math.floor(r.sorteio * opcoes.length)];
    const posicao = Math.round((lutador.ancora + desvio) / 0.25) * 0.25;
    const vida = r.vida;
    desafio.alvo = {
        indice: r.indice,
        id,
        def: arte.tecnicas[id],
        posicao,
        obj: criarObjeto(arte.id, id, { x: posicao + ponto.x, y: ponto.y }, (tipo, k) => sons.balanco(tipo, k)),
        vida,
        duracao: vida,
        estado: "ativo",
        anim: 0,
    };
    desafio.alvosTotal += 1;
    sons.desafio.novoAlvo();
}

function aoImpactar(def, ponto, id) {
    poeira(ponto, 0.5);
    if (modo !== "desafio" || !desafio) return;
    desafio.golpes += 1;
    desafio.usadas[id] = (desafio.usadas[id] || 0) + 1;
    const alvo = desafio.alvo;
    if (!alvo || alvo.estado !== "ativo") return;

    if (alvo.obj.testar(ponto)) {
        if (id === alvo.id) {
            acertar(alvo, ponto);
        } else {
            // bate no objeto, mas não é o golpe pedido: mexe-o, sem pontos
            alvo.obj.atingir(ponto, 1.2);
            sons.impacto(alvo.obj.tipo, 0.45);
            sons.desafio.aviso();
            lutador.pausar(0.03);
            flutuante(ponto.x, ponto.y + 0.25, `Usa ${alvo.def.nome}!`, "#ffd2c8");
        }
    } else if (id === alvo.id) {
        const falta = alvo.posicao - lutador.ancora;
        sons.desafio.aviso();
        flutuante(ponto.x, ponto.y + 0.25, falta > 0 ? "Longe demais ▶" : "◀ Perto demais", "#ffd2c8");
    }
}

async function acertar(alvo, ponto) {
    const d = desafio;
    alvo.estado = "atingido";
    alvo.anim = 0;
    alvo.obj.atingir(ponto, alvo.obj.forca);
    d.proximoEm = CONFIG.pausaEntreAlvos;
    tremor = 0.16;
    // pausa de impacto: o lutador "fica" no golpe uns centésimos de segundo
    lutador.pausar(alvo.obj.tipo === "tabua" ? 0.09 : 0.065);
    sons.impacto(alvo.obj.tipo, 1);
    sons.desafio.acerto(d.combo);
    efeitos.push({ tipo: "estrela", x: ponto.x, y: ponto.y, vida: 0.22, max: 0.22 });
    poeira(ponto, 1);
    if (alvo.obj.tipo === "tabua") lascas(ponto, "#c99a5f");
    if (alvo.obj.tipo === "bananeira") lascas(ponto, "#9db35c");
    // o servidor confirma o acerto e diz quantos pontos vale
    let r;
    try {
        r = await enviar(`artes/${d.id}/acerto`, { indice: alvo.indice, tecnica: alvo.id });
    } catch (erro) {
        flutuante(ponto.x, ponto.y + 0.3, erro.estado === 409 ? "Fora de tempo" : "Sem servidor", "#ffd2c8");
        return;
    }
    if (desafio !== d) return;
    d.pontos = r.pontosTotal;
    d.combo = r.combo;
    d.melhorCombo = Math.max(d.melhorCombo, d.combo);
    d.acertos += 1;
    flutuante(ponto.x, ponto.y + 0.3, `+${fmtInt.format(r.pontos)}`, "#fff3b0");
    if (d.combo >= 2) flutuante(ponto.x, ponto.y + 0.52, `Combo ${fmtMult(r.multiplicador)}`, "#ffffff");
    atualizarHud();
}

function poeira(p, intensidade) {
    for (let i = 0; i < 6 * intensidade; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const vel = 0.3 + Math.random() * 0.6;
        efeitos.push({ tipo: "po", x: p.x, y: p.y, vx: Math.cos(a) * vel, vy: Math.sin(a) * vel, r: 0.03 + Math.random() * 0.04, vida: 0.45, max: 0.45 });
    }
}

function lascas(p, cor) {
    for (let i = 0; i < 12; i += 1) {
        const a = -Math.PI / 3 + Math.random() * (Math.PI * 2 / 3);
        const vel = 1.5 + Math.random() * 2;
        efeitos.push({ tipo: "lasca", x: p.x, y: p.y, vx: Math.cos(a) * vel, vy: Math.sin(a) * vel, ang: Math.random() * 6, cor, vida: 0.7, max: 0.7 });
    }
}

function flutuante(x, y, texto, cor) {
    efeitos.push({ tipo: "texto", x, y, texto, cor, vida: 1, max: 1 });
}

function atualizarDesafio(dt) {
    const d = desafio;
    if (modo === "contagem") {
        const antes = Math.ceil(d.contagem - 0.6);
        d.contagem -= dt;
        const agora = Math.ceil(d.contagem - 0.6);
        if (agora !== antes && agora > 0) {
            mostrarAviso(String(agora));
            sons.desafio.contagem();
        }
        if (d.contagem <= 0.6 && antes > 0) {
            mostrarAviso("Já!", 0.6);
            sons.desafio.inicio();
        }
        if (d.contagem <= 0) modo = "desafio";
        return;
    }
    d.restante -= dt;
    d.decorrido += dt;

    const alvo = d.alvo;
    if (alvo) {
        alvo.anim += dt;
        alvo.obj.atualizar(dt);
        if (alvo.estado === "ativo") {
            alvo.vida -= dt;
            if (alvo.vida <= 0) {
                alvo.estado = "fugiu";
                alvo.anim = 0;
                if (d.combo > 0) flutuante(alvo.obj.topo.x, alvo.obj.topo.y, "Combo perdido", "#ffd2c8");
                sons.desafio.fugiu();
                d.combo = 0;
                enviar(`artes/${d.id}/fugiu`, { indice: alvo.indice }).catch(() => {});
                d.proximoEm = CONFIG.pausaEntreAlvos;
                atualizarHud();
            }
        } else if ((alvo.estado === "atingido" && alvo.anim > 1.1) || (alvo.estado === "fugiu" && alvo.anim > 0.4)) {
            d.alvo = null;
        }
    } else {
        d.proximoEm -= dt;
        if (d.proximoEm <= 0 && d.restante > 1 && !d.pedindo) criarAlvo();
    }

    if (d.restante <= 0) terminarDesafio();
    else atualizarHud();
}

async function terminarDesafio() {
    const d = desafio;
    modo = "parado";
    document.body.classList.remove("modo-arena");
    sons.pararAmbiente();
    sons.desafio.fim();
    let r;
    try {
        r = await enviar(`artes/${d.id}/fim`, { golpes: d.golpes, usadas: d.usadas });
    } catch {
        r = { pontos: d.pontos, acertos: d.acertos, alvos: d.alvosTotal, melhorCombo: d.melhorCombo, precisao: null, favorita: null, bilhete: null };
    }
    ui.finalArte.textContent = `${arte.nome} · fim do desafio`;
    ui.finalScore.textContent = fmtInt.format(r.pontos);
    const stats = [
        ["Alvos acertados", `${r.acertos}/${r.alvos}`],
        ["Melhor combo", String(r.melhorCombo)],
        ["Precisão", r.precisao === null ? "—" : `${r.precisao}%`],
        ["Técnica favorita", r.favorita ? arte.tecnicas[r.favorita].nome : "—"],
    ];
    ui.finalStats.replaceChildren(...stats.map(([rotulo, valor]) => {
        const div = document.createElement("div");
        div.className = "stat";
        div.append(
            Object.assign(document.createElement("span"), { textContent: rotulo }),
            Object.assign(document.createElement("strong"), { textContent: valor })
        );
        return div;
    }));
    montarRecorde(ui.finalRecorde, { jogo: "artes", bilhete: r.bilhete });
    ui.hud.hidden = true;
    shell.show("result");
}

function atualizarHud() {
    if (!desafio) return;
    ui.hudTempo.textContent = String(Math.max(0, Math.ceil(desafio.restante)));
    ui.hudPontos.textContent = fmtInt.format(desafio.pontos);
    const m = Math.min(CONFIG.comboMax, 1 + CONFIG.comboPasso * desafio.combo);
    ui.hudCombo.textContent = fmtMult(m);
    ui.hudComboChip.classList.toggle("is-active", desafio.combo > 0);
}

// ---------------------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------------------
function ajustarCanvas(canvas) {
    const caixa = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(caixa.width * dpr);
    const h = Math.round(caixa.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    return { w, h, dpr };
}

function fonte(peso, tamanho) {
    return `${peso} ${tamanho}px "Chakra Petch", system-ui, sans-serif`;
}

function desenharArena() {
    const canvas = ui.palco;
    const { w, h } = ajustarCanvas(canvas);
    if (!w || !h) return;
    const ctx = canvas.getContext("2d");
    const ppm = h / 3.3; // ~3,3 m de altura visível: lutador a meia altura do palco
    const chao = h * 0.85;
    const v = {
        w, h, ppm, chao, camX,
        X: (x) => (x - camX) * ppm + w * 0.5,
        Y: (y) => chao - y * ppm,
    };

    ctx.save();
    if (tremor > 0) ctx.translate((Math.random() - 0.5) * 10 * tremor, (Math.random() - 0.5) * 10 * tremor);
    desenharCenario(ctx, arte.id, v, tempo);

    const alvo = desafio?.alvo;
    if (alvo?.estado === "ativo") desenharMarcaChao(ctx, v, alvo);
    if (alvo) {
        const alfa = alvo.estado === "ativo" ? Math.min(1, alvo.anim / 0.2)
            : alvo.estado === "fugiu" ? Math.max(0, 1 - alvo.anim / 0.4)
            : Math.max(0, 1 - Math.max(0, alvo.anim - 0.7) / 0.4);
        alvo.obj.desenhar(ctx, v, alfa);
    }
    const esq = calcularEsqueleto(lutador.pose(), lutador.ancora);
    desenharSombra(ctx, v, esq);
    desenharRasto(ctx, v);
    desenharLutadorIluminado(ctx, v, esq);
    desenharPrimeiroPlano(ctx, arte.id, v, tempo);
    if (alvo?.estado === "ativo") {
        desenharEtiqueta(ctx, v, alvo);
        desenharIndicacao(ctx, v, alvo);
    }
    desenharEfeitos(ctx, v);
    ctx.restore();
}

// Iluminação noturna do lutador: contorno de luz (uma cor de cada lado, como os
// néones atrás dele) e um tom frio por cima, para não parecer colado ao fundo.
// O lutador é desenhado numa imagem à parte, só à volta dele (barato).
const LUZ_LUTADOR = {
    boxe: { esq: "rgb(34,232,255)", dir: "rgb(255,43,214)", tom: "rgba(25,30,90,0.2)" },
    muaythai: { esq: "rgb(255,197,61)", dir: "rgb(255,43,214)", tom: "rgba(60,20,70,0.18)" },
    taekwondo: { esq: "rgb(34,232,255)", dir: "rgb(255,120,200)", tom: "rgba(20,30,80,0.2)" },
};
let figura = null;
let silhueta = null;

function desenharLutadorIluminado(ctx, v, esq) {
    const luz = LUZ_LUTADOR[arte.id] || LUZ_LUTADOR.boxe;
    const m = v.ppm;
    const bx = Math.floor(v.X(esq.P.x) - 2.1 * m);
    const bw = Math.ceil(4.2 * m);
    const bh = Math.ceil(v.h);
    if (!figura) {
        figura = document.createElement("canvas");
        silhueta = document.createElement("canvas");
    }
    for (const c of [figura, silhueta]) {
        if (c.width !== bw || c.height !== bh) {
            c.width = bw;
            c.height = bh;
        }
    }
    const f = figura.getContext("2d");
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.globalCompositeOperation = "source-over";
    f.clearRect(0, 0, bw, bh);
    f.translate(-bx, 0);
    desenharLutador(f, v, esq, arte.aparencia, lutador.camadas());
    f.setTransform(1, 0, 0, 1, 0, 0);
    // contorno: a silhueta pintada de cor, um pouco deslocada para cada lado
    const s = silhueta.getContext("2d");
    const d = Math.max(1, m * 0.008);
    for (const [cor, dx] of [[luz.esq, -d], [luz.dir, d]]) {
        s.globalCompositeOperation = "copy";
        s.drawImage(figura, 0, 0);
        s.globalCompositeOperation = "source-in";
        s.fillStyle = cor;
        s.fillRect(0, 0, bw, bh);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(silhueta, bx + dx, -d * 0.5);
        ctx.globalAlpha = 1;
    }
    // tom frio da noite, só por cima do lutador
    f.globalCompositeOperation = "source-atop";
    f.fillStyle = luz.tom;
    f.fillRect(0, 0, bw, bh);
    ctx.drawImage(figura, bx, 0);
}

// Sombra de contacto: uma sob cada pé (menor e mais clara se o pé estiver no
// ar) e uma suave sob o corpo, que acompanha a bacia.
function desenharSombra(ctx, v, esq) {
    ctx.save();
    ctx.fillStyle = "rgba(2,2,10,0.35)";
    ctx.beginPath();
    ctx.ellipse(v.X(esq.P.x), v.chao + 2, 0.42 * v.ppm, 0.045 * v.ppm, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const pe of [esq.pf, esq.pt]) {
        const x = paraMundo(esq, { x: (pe.calcanhar.x + pe.dedos.x) / 2, y: 0 }).x;
        const altura = Math.max(0, Math.min(pe.calcanhar.y, pe.dedos.y) - 0.05);
        const k = Math.max(0, 1 - altura / 0.9);
        if (k <= 0) continue;
        ctx.fillStyle = `rgba(2,2,10,${0.45 * k})`;
        ctx.beginPath();
        ctx.ellipse(v.X(x), v.chao + 2, (0.1 + 0.06 * k) * v.ppm, 0.025 * v.ppm, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Duas pegadas de giz no chão: onde pôr os pés para o golpe chegar ao alvo.
function desenharMarcaChao(ctx, v, alvo) {
    const alinhado = Math.abs(lutador.ancora - alvo.posicao) < 0.01 && !lutador.ocupado;
    const g = arte.guarda;
    ctx.save();
    ctx.fillStyle = alinhado ? "rgba(61,255,168,0.8)" : "rgba(233,236,255,0.55)";
    ctx.strokeStyle = alinhado ? "rgba(61,255,168,1)" : "rgba(233,236,255,0.8)";
    ctx.shadowColor = alinhado ? "#3dffa8" : "rgba(0,0,0,0)";
    ctx.shadowBlur = alinhado ? 10 : 0;
    ctx.lineWidth = 1.5;
    for (const pe of [g.pfX, g.ptX]) {
        const x = v.X(alvo.posicao + pe + 0.06);
        ctx.beginPath();
        ctx.ellipse(x, v.chao + 0.035 * v.ppm, 0.11 * v.ppm, 0.028 * v.ppm, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    ctx.font = fonte(700, Math.max(11, v.ppm * 0.065));
    ctx.textAlign = "center";
    ctx.shadowBlur = 0;
    ctx.fillStyle = alinhado ? "#3dffa8" : "rgba(233,236,255,0.75)";
    ctx.fillText(alinhado ? "Em posição" : "Posição", v.X(alvo.posicao), v.chao + v.ppm * 0.16);
    ctx.restore();
}

// Etiqueta de papel pendurada no objeto, com o golpe pedido e o tempo restante.
function desenharEtiqueta(ctx, v, alvo) {
    const cor = COR_CATEGORIA[alvo.def.categoria];
    const topo = alvo.obj.topo;
    const x = v.X(topo.x);
    const y = v.Y(topo.y) - v.ppm * 0.08;
    const texto = alvo.def.nome;
    ctx.save();
    ctx.font = fonte(700, Math.max(13, v.ppm * 0.085));
    const tw = ctx.measureText(texto).width;
    const kw = Math.max(20, v.ppm * 0.11);
    const lw = tw + kw + 26;
    const lh = Math.max(30, v.ppm * 0.16);
    // fio
    ctx.strokeStyle = "rgba(233,236,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, v.Y(topo.y) - 2);
    ctx.stroke();
    // placa de vidro escuro com contorno de néon na cor da categoria
    ctx.fillStyle = "rgba(10,10,28,0.88)";
    ctx.strokeStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(x - lw / 2, y - lh, lw, lh, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = cor;
    ctx.fillRect(x - lw / 2 + 1, y - lh + 4, 4, lh - 8);
    ctx.fillStyle = "#e9ecff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(texto, x - lw / 2 + 12, y - lh / 2 - 2);
    // tecla
    const kx = x + lw / 2 - kw - 8;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.roundRect(kx, y - lh / 2 - kw / 2 - 2, kw, kw, 4);
    ctx.fill();
    ctx.fillStyle = "#0a0a1c";
    ctx.textAlign = "center";
    ctx.font = fonte(700, Math.max(11, v.ppm * 0.07));
    ctx.fillText(alvo.def.tecla, kx + kw / 2, y - lh / 2 - 1);
    // tempo restante
    const f = Math.max(0, alvo.vida / alvo.duracao);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x - lw / 2 + 8, y - 6, lw - 16, 3);
    ctx.fillStyle = f < 0.3 ? "#ff4d6d" : cor;
    ctx.fillRect(x - lw / 2 + 8, y - 6, (lw - 16) * f, 3);
    ctx.restore();
}

function desenharIndicacao(ctx, v, alvo) {
    const falta = alvo.posicao - lutador.ancora;
    if (Math.abs(falta) < 0.01) return;
    const texto = falta > 0 ? "Avança ▶" : "◀ Recua";
    ctx.save();
    ctx.font = fonte(700, Math.max(12, v.ppm * 0.08));
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(30,20,10,0.7)";
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.65 + 0.35 * Math.abs(Math.sin(tempo * 5));
    const y = v.chao + v.ppm * 0.3;
    ctx.strokeText(texto, v.X(lutador.ancora), y);
    ctx.fillText(texto, v.X(lutador.ancora), y);
    ctx.restore();
}

function desenharRasto(ctx, v) {
    const r = lutador.rasto;
    if (r.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#bff6ff";
    for (let i = 1; i < r.length; i += 1) {
        const a = Math.max(0, r[i].vida / 0.14);
        ctx.globalAlpha = a * 0.28;
        ctx.lineWidth = 0.1 * v.ppm * a;
        ctx.beginPath();
        ctx.moveTo(v.X(r[i - 1].x), v.Y(r[i - 1].y));
        ctx.lineTo(v.X(r[i].x), v.Y(r[i].y));
        ctx.stroke();
    }
    ctx.restore();
}

function desenharEfeitos(ctx, v) {
    ctx.save();
    for (const e of efeitos) {
        const k = Math.max(0, e.vida / e.max);
        ctx.globalAlpha = k;
        if (e.tipo === "po") {
            ctx.fillStyle = "rgba(235,225,205,0.8)";
            ctx.beginPath();
            ctx.arc(v.X(e.x), v.Y(e.y), (e.r + (1 - k) * 0.06) * v.ppm, 0, Math.PI * 2);
            ctx.fill();
        } else if (e.tipo === "estrela") {
            // estrela de impacto (banda desenhada)
            const x = v.X(e.x);
            const y = v.Y(e.y);
            const r = (0.12 + (1 - k) * 0.1) * v.ppm;
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#22e8ff";
            ctx.shadowColor = "#22e8ff";
            ctx.shadowBlur = 14;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let i = 0; i < 16; i += 1) {
                const a = (i / 16) * Math.PI * 2;
                const rr = i % 2 ? r * 0.45 : r;
                ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (e.tipo === "lasca") {
            ctx.strokeStyle = e.cor;
            ctx.lineWidth = 3;
            const x = v.X(e.x);
            const y = v.Y(e.y);
            ctx.beginPath();
            ctx.moveTo(x - Math.cos(e.ang) * 6, y - Math.sin(e.ang) * 6);
            ctx.lineTo(x + Math.cos(e.ang) * 6, y + Math.sin(e.ang) * 6);
            ctx.stroke();
        } else if (e.tipo === "texto") {
            ctx.font = fonte(700, Math.max(14, v.ppm * 0.1));
            ctx.textAlign = "center";
            const x = v.X(e.x);
            const y = v.Y(e.y + (1 - k) * 0.25);
            ctx.lineWidth = 5;
            ctx.strokeStyle = "rgba(30,20,10,0.8)";
            ctx.strokeText(e.texto, x, y);
            ctx.fillStyle = e.cor;
            ctx.fillText(e.texto, x, y);
        }
    }
    ctx.restore();
}

function desenharPrevias(dt) {
    for (const p of previas) {
        const { w, h } = ajustarCanvas(p.canvas);
        if (!w || !h) continue;
        // de vez em quando a prévia mostra uma técnica
        p.proximoGolpe -= dt;
        if (p.proximoGolpe <= 0) {
            const ids = Object.keys(p.arte.tecnicas).filter((id) => p.arte.tecnicas[id].tecla);
            p.lutador.executar(ids[Math.floor(Math.random() * ids.length)]);
            p.proximoGolpe = 2.2 + Math.random() * 1.5;
        }
        p.lutador.atualizar(dt);
        const ctx = p.canvas.getContext("2d");
        const ppm = h / 2.25;
        const chao = h * 0.9;
        const [ceuA, ceuB, solo, neon] = FUNDO_PREVIA[p.arte.id];
        const g = ctx.createLinearGradient(0, 0, 0, chao);
        g.addColorStop(0, ceuB);
        g.addColorStop(1, ceuA);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, chao);
        const luz = ctx.createRadialGradient(w * 0.45, chao, 0, w * 0.45, chao, h * 0.9);
        luz.addColorStop(0, "rgba(200,225,255,0.18)");
        luz.addColorStop(1, "rgba(200,225,255,0)");
        ctx.fillStyle = luz;
        ctx.fillRect(0, 0, w, chao);
        ctx.fillStyle = solo;
        ctx.fillRect(0, chao, w, h - chao);
        ctx.save();
        ctx.shadowColor = neon;
        ctx.shadowBlur = 10;
        ctx.fillStyle = neon;
        ctx.fillRect(0, chao, w, 2);
        ctx.restore();
        const v = { ppm, X: (x) => w * 0.4 + x * ppm, Y: (y) => chao - y * ppm };
        desenharLutador(ctx, v, calcularEsqueleto(p.lutador.pose(), 0), p.arte.aparencia, p.lutador.camadas());
    }
}

// ---------------------------------------------------------------------------
// Ciclo principal
// ---------------------------------------------------------------------------
let ultimo = null;
function ciclo(agora) {
    const dt = ultimo === null ? 0 : Math.min(0.05, Math.max(0, (agora - ultimo) / 1000));
    ultimo = agora;
    tempo += dt;

    if (modo === "selecao") desenharPrevias(dt);

    if (lutador && (modo === "treino" || modo === "a-preparar" || modo === "contagem" || modo === "desafio")) {
        lutador.atualizar(dt, aoImpactar);
        lutador.atualizarRasto(dt);
        if (desafio && (modo === "contagem" || modo === "desafio")) atualizarDesafio(dt);
        camX += (lutador.ancora + 0.75 - camX) * Math.min(1, dt * 5);
        tremor = Math.max(0, tremor - dt);
        for (const e of efeitos) {
            e.vida -= dt;
            if (e.vx !== undefined) {
                e.x += e.vx * dt;
                e.y += e.vy * dt;
                if (e.tipo === "lasca") {
                    e.vy -= 9.8 * dt;
                    e.ang += dt * 10;
                }
            }
        }
        efeitos = efeitos.filter((e) => e.vida > 0);
        if (avisoTimer > 0) {
            avisoTimer -= dt;
            if (avisoTimer <= 0) ui.aviso.classList.remove("is-visivel");
        }
        if (modo !== "parado") desenharArena();
    }
    requestAnimationFrame(ciclo);
}

// ---------------------------------------------------------------------------
// Controlos
// ---------------------------------------------------------------------------
construirSelecao();
document.querySelectorAll("[data-mover]").forEach((b) => b.addEventListener("click", () => mover(Number(b.dataset.mover))));
ui.btnDesafio.addEventListener("click", iniciarDesafio);
ui.btnTrocar.addEventListener("click", abrirSelecao);

document.addEventListener("keydown", (e) => {
    if (shell.current !== "game" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (modo === "selecao") {
        const n = Number(e.key);
        if (n >= 1 && n <= ARTES.length) escolherArte(ARTES[n - 1]);
        return;
    }
    if (!lutador) return;
    const tecla = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (tecla === "ArrowRight" || tecla === "D") {
        e.preventDefault();
        mover(1);
        return;
    }
    if (tecla === "ArrowLeft" || tecla === "A") {
        e.preventDefault();
        mover(-1);
        return;
    }
    if (tecla === "Enter" && modo === "treino" && document.activeElement?.tagName !== "BUTTON") {
        e.preventDefault();
        iniciarDesafio();
        return;
    }
    if (e.repeat) return;
    const tec = Object.entries(arte.tecnicas).find(([, t]) => t.tecla === tecla);
    if (tec) {
        e.preventDefault();
        tecnica(tec[0]);
        return;
    }
    const ic = arte.combos.findIndex((c) => c.tecla === tecla);
    if (ic >= 0) {
        e.preventDefault();
        combo(ic);
    }
});

requestAnimationFrame(ciclo);

// Acesso para testes automáticos (só com ?depurar no endereço).
if (new URLSearchParams(location.search).has("depurar")) {
    window.__artes = { lutador: () => lutador, desafio: () => desafio, impactos: () => impactos, tecnica, mover, combo };
}
