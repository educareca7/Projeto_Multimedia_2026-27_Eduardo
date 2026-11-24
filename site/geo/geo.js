// Detetive de Países — App 1 do Salão Arcade.
// Partida de 5 rondas. Em cada ronda há um país-mistério: começa-se com a pista
// mais difícil e cada clique errado revela a seguinte, mais fácil.
//
// As regras estão no servidor (servidor/geo.py): a base de dados de países, o
// sorteio, a verificação de cada clique, o tempo de cada ronda e os pontos.
// Aqui fica o mapa (D3), o relógio visível e a apresentação.

import { createGameShell } from "../shared/shell.js";
import { nomePais } from "./nomes-paises.js";
import { som } from "../shared/som.js";
import { enviar } from "../shared/api.js";
import { montarRecorde } from "../shared/recordes.js";

const { d3, topojson } = window;

const LARGURA = 960;
const ALTURA = 500;
const ANTARTIDA = "010";

const fmtInt = new Intl.NumberFormat("pt-PT");
const fmtDec = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtMult = (m) => `×${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(m)}`;

const $ = (id) => document.getElementById(id);
const ui = {
    hud: $("hud"),
    hudRound: $("hud-round"),
    hudScore: $("hud-score"),
    hudCombo: $("hud-combo"),
    hudComboChip: $("hud-combo-chip"),
    loadError: $("load-error"),
    timeLeft: $("time-left"),
    timerBar: $("timer-bar"),
    stakes: $("stakes"),
    clueList: $("clue-list"),
    roundEnd: $("round-end"),
    roundVerdict: $("round-verdict"),
    roundCountry: $("round-country"),
    roundPoints: $("round-points"),
    nextRound: $("next-round"),
    toast: $("map-toast"),
    finalScore: $("final-score"),
    finalStats: $("final-stats"),
    roundsBody: $("rounds-body"),
    finalRecorde: $("final-recorde"),
};

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
let mapa = null; // { svg, g, zoom, path, porId }
let jogo = null; // { id, rondas, segundos, pontos, comboSeguinte, indice }
let ronda = null; // estado da ronda atual (o que o servidor já revelou)
let rafId = 0;
let ultimoInstante = null;
let toastTimer = 0;

const shell = createGameShell({
    onStart: iniciarPartida,
    onLeaveGame: pararRelogio,
});

function mostrarErro(mensagem) {
    ui.loadError.hidden = false;
    ui.loadError.textContent = mensagem;
}

// ---------------------------------------------------------------------------
// Mapa
// ---------------------------------------------------------------------------
async function carregarMapa() {
    const resposta = await fetch("data/countries-110m.json");
    if (!resposta.ok) throw new Error(`o mapa devolveu HTTP ${resposta.status}`);
    mapa = criarMapa(await resposta.json());
}

const mapaPronto = carregarMapa().catch((erro) => {
    mostrarErro(`Não foi possível carregar o mapa: ${erro.message}`);
    document.querySelector('[data-action="start"]').disabled = true;
    throw erro;
});

function criarMapa(atlas) {
    const objeto = atlas.objects.countries;
    const mundo = topojson.feature(atlas, objeto);
    const features = mundo.features.filter((f) => f.id !== ANTARTIDA);
    const projecao = d3.geoNaturalEarth1().fitExtent(
        [[10, 10], [LARGURA - 10, ALTURA - 10]],
        { type: "FeatureCollection", features }
    );
    const path = d3.geoPath(projecao);

    const svg = d3.select("#map");

    // Padrão tracejado para os países já tentados.
    svg.append("defs").html(`
        <pattern id="hatch-wrong" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#2a0f2e"></rect>
            <line x1="0" y1="0" x2="0" y2="6" stroke="#ff2bd6" stroke-width="2"></line>
        </pattern>`);

    const g = svg.append("g");
    g.append("path").datum({ type: "Sphere" }).attr("class", "map__sphere").attr("d", path);
    g.append("path").datum(d3.geoGraticule10()).attr("class", "map__graticule").attr("d", path);
    // Linha de costa (fronteiras exteriores) desenhada grossa e clara por baixo: halo de baixios.
    g.append("path")
        .datum(topojson.mesh(atlas, objeto, (a, b) => a === b && a.id !== ANTARTIDA))
        .attr("class", "map__shallows")
        .attr("d", path);

    const porId = new Map();
    g.append("g")
        .selectAll("path")
        .data(features)
        .join("path")
        .attr("class", "country")
        .attr("d", path)
        .each(function guardar(feature) {
            if (feature.id) porId.set(feature.id, { feature, node: this });
        })
        .on("click", (_evento, feature) => cliquePais(feature));

    const zoom = d3.zoom()
        .scaleExtent([1, 14])
        .translateExtent([[0, 0], [LARGURA, ALTURA]])
        .on("zoom", (evento) => {
            g.attr("transform", evento.transform);
        });
    svg.call(zoom).on("dblclick.zoom", null);

    return { svg, g, zoom, path, porId };
}

function zoomPara(feature) {
    const [[x0, y0], [x1, y1]] = mapa.path.bounds(feature);
    const escala = Math.max(1, Math.min(8, 0.6 / Math.max((x1 - x0) / LARGURA, (y1 - y0) / ALTURA)));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const alvo = d3.zoomIdentity
        .translate(LARGURA / 2 - escala * cx, ALTURA / 2 - escala * cy)
        .scale(escala);
    mapa.svg.transition().duration(900).call(mapa.zoom.transform, alvo);
}

function reporZoom() {
    mapa.svg.transition().duration(600).call(mapa.zoom.transform, d3.zoomIdentity);
}

function limparMarcasMapa() {
    mapa.g.selectAll(".country").classed("is-correct is-answer is-wrong is-flash", false);
}

// ---------------------------------------------------------------------------
// Partida
// ---------------------------------------------------------------------------
async function iniciarPartida() {
    ui.loadError.hidden = true;
    try {
        await mapaPronto;
        const r = await enviar("geo/partida");
        jogo = { id: r.id, rondas: r.config.rondas, segundos: r.config.segundosPorRonda, pontos: 0, comboSeguinte: 1, indice: 0 };
    } catch (erro) {
        shell.show("intro");
        mostrarErro(erro.message);
        return;
    }
    ui.hud.hidden = false;
    iniciarRonda();
}

// ---------------------------------------------------------------------------
// Ronda
// ---------------------------------------------------------------------------
async function iniciarRonda() {
    let r;
    try {
        r = await enviar(`geo/${jogo.id}/ronda`);
    } catch (erro) {
        mostrarToast(erro.message);
        return;
    }
    jogo.indice = r.indice;
    jogo.pontos = r.pontosTotal;
    jogo.comboSeguinte = r.comboSeguinte;
    ronda = {
        total: r.totalPistas,
        pistas: r.pistas, // só as que o servidor já revelou
        valeAgora: r.valeAgora,
        decorrido: 0,
        tentados: new Set(),
        estado: "a-jogar",
        aEsperar: false,
    };

    limparMarcasMapa();
    reporZoom();
    criarListaPistas();
    ui.roundEnd.hidden = true;
    ui.stakes.hidden = false;
    atualizarHud();
    atualizarPistas();
    atualizarRelogio();
    iniciarRelogio();
    som.ui("pagina");
}

function criarListaPistas() {
    ui.clueList.replaceChildren(
        ...Array.from({ length: ronda.total }, (_v, i) => {
            const li = document.createElement("li");
            li.className = "clue";
            const numero = document.createElement("span");
            numero.className = "clue__n";
            numero.textContent = String(i + 1);
            const texto = document.createElement("span");
            texto.className = "clue__text";
            li.append(numero, texto);
            return li;
        })
    );
}

function preencherPista(li, pista) {
    const texto = li.querySelector(".clue__text");
    const rotulo = document.createElement("small");
    rotulo.textContent = pista.dificuldade;
    texto.replaceChildren(rotulo, document.createTextNode(pista.texto));
}

/** Mostra as pistas reveladas; no fim da ronda o servidor envia todas (revelarTodas). */
function atualizarPistas({ vistas = ronda.pistas.length } = {}) {
    const itens = ui.clueList.children;
    for (let i = 0; i < ronda.total; i += 1) {
        const li = itens[i];
        const pista = ronda.pistas[i];
        if (i < vistas) {
            if (!li.classList.contains("is-revealed")) {
                li.classList.remove("is-locked");
                li.classList.add("is-revealed");
                if (i > 0) li.classList.add("is-new");
                preencherPista(li, pista);
            }
        } else if (pista) {
            li.classList.remove("is-locked");
            li.classList.add("is-unused");
            preencherPista(li, pista);
        } else {
            li.classList.add("is-locked");
            li.querySelector(".clue__text").textContent = i === vistas ? "Aparece se errares" : "Bloqueada";
        }
    }

    // Quanto vale acertar agora (calculado pelo servidor).
    ui.stakes.replaceChildren(
        document.createTextNode("Vale agora: "),
        Object.assign(document.createElement("strong"), { textContent: `${fmtInt.format(ronda.valeAgora)} pts` }),
        document.createTextNode(" + bónus")
    );
}

function atualizarRelogio() {
    const total = jogo.segundos;
    const restante = Math.max(0, total - ronda.decorrido);
    const baixo = restante <= 15;
    ui.timerBar.style.width = `${(restante / total) * 100}%`;
    ui.timerBar.classList.toggle("is-low", baixo);
    ui.timeLeft.classList.toggle("is-low", baixo);
    const segundos = String(Math.ceil(restante));
    if (ui.timeLeft.textContent !== segundos) {
        // últimos 10 s: tique-taque (mais forte nos últimos 5)
        if (ronda.estado === "a-jogar" && restante > 0 && restante <= 10 && ui.timeLeft.textContent !== "") som.ui("tique", restante <= 5);
        ui.timeLeft.textContent = segundos;
    }
    if (restante <= 0 && ronda.estado === "a-jogar") acabouOTempo();
}

function iniciarRelogio() {
    pararRelogio();
    ultimoInstante = null;
    const passo = (agora) => {
        // O 1.º fotograma só fixa a referência: o instante do rAF pode ser anterior
        // a performance.now(), o que daria um dt negativo.
        // Limitar o salto a 0,25 s evita perder tempo com o separador em segundo plano.
        const dt = ultimoInstante === null ? 0 : Math.min(0.25, Math.max(0, (agora - ultimoInstante) / 1000));
        ultimoInstante = agora;
        if (ronda?.estado !== "a-jogar") return;
        ronda.decorrido += dt;
        atualizarRelogio();
        if (ronda.estado === "a-jogar") rafId = requestAnimationFrame(passo);
    };
    rafId = requestAnimationFrame(passo);
}

function pararRelogio() {
    cancelAnimationFrame(rafId);
    rafId = 0;
}

/** O relógio do browser chegou a zero: o servidor confirma pelo relógio dele. */
async function acabouOTempo() {
    ronda.estado = "a-confirmar";
    pararRelogio();
    try {
        const r = await enviar(`geo/${jogo.id}/tempo`);
        terminarRonda(r);
    } catch (erro) {
        // o servidor ainda conta uns segundos: espera e volta a perguntar
        setTimeout(acabouOTempo, 800);
    }
}

async function cliquePais(feature) {
    if (ronda?.estado !== "a-jogar" || ronda.aEsperar) return;
    const nome = nomePais(feature.id, feature.properties?.name);
    const chave = feature.id || feature.properties?.name;
    if (ronda.tentados.has(chave)) {
        som.ui("clique");
        mostrarToast(`Já tentaste ${nome}.`);
        return;
    }

    ronda.aEsperar = true;
    let r;
    try {
        r = await enviar(`geo/${jogo.id}/tentativa`, { pais: feature.id || "" });
    } catch (erro) {
        mostrarToast(erro.message);
        return;
    } finally {
        ronda.aEsperar = false;
    }
    if (ronda.estado !== "a-jogar") return;

    if (r.resultado === "certo" || r.resultado === "perdeu") {
        if (r.resultado === "perdeu") marcarErrado(feature);
        terminarRonda(r);
        return;
    }
    if (r.resultado === "repetido") {
        som.ui("clique");
        mostrarToast(`Já tentaste ${nome}.`);
        return;
    }
    // errado: o servidor mandou mais uma pista
    ronda.tentados.add(chave);
    marcarErrado(feature);
    ronda.pistas = r.pistas;
    ronda.valeAgora = r.valeAgora;
    som.ui("errado");
    setTimeout(() => som.ui("pagina"), 260);
    mostrarToast(`Não é ${nome}.`, "Nova pista!");
    atualizarPistas();
}

function marcarErrado(feature) {
    const no = feature.id ? mapa.porId.get(feature.id)?.node : null;
    if (!no) return;
    no.classList.add("is-wrong");
    no.classList.remove("is-flash");
    void no.getBoundingClientRect(); // reiniciar a animação
    no.classList.add("is-flash");
}

function mostrarToast(mensagem, destaque = "") {
    ui.toast.replaceChildren(document.createTextNode(mensagem));
    if (destaque) {
        ui.toast.append(" ", Object.assign(document.createElement("strong"), { textContent: destaque }));
    }
    ui.toast.hidden = false;
    ui.toast.classList.remove("is-showing");
    void ui.toast.offsetWidth;
    ui.toast.classList.add("is-showing");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        ui.toast.hidden = true;
    }, 1800);
}

/** Mostra o fim da ronda com o que o servidor devolveu (país, pistas, pontos). */
function terminarRonda(r) {
    pararRelogio();
    const acertou = r.resultado === "certo";
    ronda.estado = acertou ? "ganha" : "perdida";
    ronda.ultima = r.ultima;
    if (acertou) som.ui("certo");
    else if (r.motivo === "pistas") {
        som.ui("errado");
        setTimeout(() => som.ui("perdeu"), 250);
    } else som.ui("perdeu");

    jogo.pontos = r.pontosTotal;
    jogo.comboSeguinte = r.comboSeguinte;

    // Mapa: destacar o país certo e aproximar.
    const alvo = mapa.porId.get(r.pais.id);
    if (alvo) {
        alvo.node.classList.remove("is-wrong", "is-flash");
        alvo.node.classList.add(acertou ? "is-correct" : "is-answer");
        zoomPara(alvo.feature);
    }

    // Painel de fim de ronda: agora o servidor mostra todas as pistas.
    ronda.pistas = r.pistas;
    atualizarPistas({ vistas: r.pistasVistas });
    ui.stakes.hidden = true;
    ui.roundEnd.hidden = false;
    ui.roundEnd.classList.toggle("is-win", acertou);
    ui.roundVerdict.textContent = acertou
        ? "✓ Certo!"
        : r.motivo === "tempo" ? "✗ Acabou o tempo — era…" : "✗ Acabaram as pistas — era…";
    ui.roundCountry.textContent = r.pais.nome;
    ui.roundPoints.replaceChildren();
    if (acertou) {
        const c = r.conta;
        const totalPontos = document.createElement("strong");
        totalPontos.textContent = `+${fmtInt.format(c.pontos)} pts`;
        const linha = document.createElement("span");
        linha.textContent = `${fmtInt.format(c.base)} (${r.pistasVistas} ${r.pistasVistas === 1 ? "pista" : "pistas"})` +
            ` + ${fmtInt.format(c.bonus)} (tempo)` +
            (c.mult > 1 ? ` × ${fmtMult(c.mult).slice(1)} (combo)` : "");
        ui.roundPoints.append(totalPontos, linha);
    } else {
        ui.roundPoints.textContent = "Sem pontos nesta ronda. O combo voltou a ×1.";
    }
    ui.nextRound.textContent = r.ultima ? "Ver resultado ▸" : "Próxima ronda ▸";
    atualizarHud();
    ui.nextRound.focus();
}

function proximaRonda() {
    if (!jogo || !ronda || ronda.estado === "a-jogar" || ronda.estado === "a-confirmar") return;
    if (ronda.ultima) mostrarResultado();
    else iniciarRonda();
}

function atualizarHud() {
    ui.hudRound.textContent = `${jogo.indice + 1}/${jogo.rondas}`;
    ui.hudScore.textContent = fmtInt.format(jogo.pontos);
    // Mostra o multiplicador que o próximo acerto vai receber.
    ui.hudCombo.textContent = fmtMult(jogo.comboSeguinte);
    ui.hudComboChip.classList.toggle("is-active", jogo.comboSeguinte > 1);
}

// ---------------------------------------------------------------------------
// Resultado (calculado pelo servidor)
// ---------------------------------------------------------------------------
async function mostrarResultado() {
    let r;
    try {
        r = await enviar(`geo/${jogo.id}/fim`);
    } catch (erro) {
        mostrarToast(erro.message);
        return;
    }
    ui.finalScore.textContent = fmtInt.format(r.pontos);
    const stats = [
        ["Acertos", `${r.acertos}/${r.rondas}`],
        ["Melhor sequência", String(r.melhorSequencia)],
        ["Pistas por acerto", r.mediaPistas === null ? "—" : fmtDec.format(r.mediaPistas)],
        ["Cliques errados", String(r.erros)],
    ];
    ui.finalStats.replaceChildren(...stats.map(([rotulo, valor]) => {
        const div = document.createElement("div");
        div.className = "stat";
        const span = document.createElement("span");
        span.textContent = rotulo;
        const strong = document.createElement("strong");
        strong.textContent = valor;
        div.append(span, strong);
        return div;
    }));

    ui.roundsBody.replaceChildren(...r.resumo.map((x, i) => {
        const tr = document.createElement("tr");
        tr.className = x.acertou ? "is-win" : "is-loss";
        const celulas = [
            String(i + 1),
            x.pais,
            x.acertou ? "✓ Certo" : "✗ Falhou",
            `${x.pistas}/${x.totalPistas}`,
            x.acertou ? `${fmtDec.format(x.tempo)} s` : "—",
            fmtInt.format(x.pontos),
        ];
        for (const texto of celulas) {
            const td = document.createElement("td");
            td.textContent = texto;
            tr.append(td);
        }
        return tr;
    }));

    montarRecorde(ui.finalRecorde, { jogo: "geo", bilhete: r.bilhete });
    ui.hud.hidden = true;
    shell.show("result");
    som.ui("fanfarra");
}

// ---------------------------------------------------------------------------
// Controlos
// ---------------------------------------------------------------------------
ui.nextRound.addEventListener("click", proximaRonda);
$("zoom-in").addEventListener("click", () => mapa?.svg.transition().duration(300).call(mapa.zoom.scaleBy, 1.6));
$("zoom-out").addEventListener("click", () => mapa?.svg.transition().duration(300).call(mapa.zoom.scaleBy, 1 / 1.6));
$("zoom-reset").addEventListener("click", () => mapa && reporZoom());

// Acesso para testes automáticos (só com ?depurar no endereço).
if (new URLSearchParams(location.search).has("depurar")) {
    window.__geo = { jogo: () => jogo, ronda: () => ronda, mapa: () => mapa, cliquePais, proximaRonda };
}
