// Som do Salão Arcade, sintetizado em tempo real com a Web Audio API.
// Não há ficheiros de áudio: cada som é feito com osciladores e ruído filtrado,
// por isso funciona sem Internet e não pesa nada.
//
//   import { som } from "../shared/som.js";
//   som.ui("clique");                 // sons de interface comuns
//   som.ruido({ ... }); som.tom({ ... })  // blocos para sons próprios de cada app
//
// O navegador só deixa tocar som depois de um clique ou tecla: o contexto é
// criado/retomado no primeiro gesto. A preferência (com/sem som) fica guardada.

const CHAVE = "salao-arcade-som";
let ctx = null;
let saida = null; // ganho mestre (mudo = 0)
let bufferRuido = null;
let mudo = localStorage.getItem(CHAVE) === "off";
const ouvintes = new Set();

function criar() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;
    saida = ctx.createGain();
    saida.gain.value = mudo ? 0 : 0.8;
    saida.connect(compressor).connect(ctx.destination);
    // 2 s de ruído branco, reutilizado por todos os sons de ruído
    bufferRuido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const dados = bufferRuido.getChannelData(0);
    for (let i = 0; i < dados.length; i += 1) dados[i] = Math.random() * 2 - 1;
    return ctx;
}

function desbloquear() {
    if (!criar()) return;
    if (ctx.state === "suspended" && !document.hidden) ctx.resume();
}
["pointerdown", "keydown", "touchstart"].forEach((ev) => window.addEventListener(ev, desbloquear, { capture: true, passive: true }));
// Separador em segundo plano: suspende tudo (ambiente incluído).
document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (!mudo) ctx.resume();
});

/** true se o som pode tocar (há contexto, não está em mudo e a página está visível). */
// (Um contexto ainda "suspended" logo após o 1.º gesto também conta: o que for
// agendado toca assim que ele arrancar.)
function pronto() {
    return Boolean(ctx && ctx.state !== "closed" && !mudo && !document.hidden);
}

function destino(pan) {
    if (!pan || !ctx.createStereoPanner) return saida;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(saida);
    return p;
}

/**
 * Envelope: sobe até vol em `ataque` s e desce exponencialmente durante `decaimento` s.
 */
function envelope(g, t0, vol, ataque, decaimento) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.max(0.001, ataque));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ataque + decaimento);
}

/**
 * Ruído filtrado com envelope.
 * { vol, ataque, decaimento, filtro: "bandpass"|"lowpass"|"highpass", freq, freqFim, q, atraso, pan, saida }
 */
function ruido({ vol = 0.3, ataque = 0.005, decaimento = 0.15, filtro = "bandpass", freq = 1000, freqFim, q = 1, atraso = 0, pan = 0, saida: dest } = {}) {
    if (!pronto()) return null;
    const t0 = ctx.currentTime + atraso;
    const fonte = ctx.createBufferSource();
    fonte.buffer = bufferRuido;
    fonte.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.setValueAtTime(freq, t0);
    if (freqFim) f.frequency.exponentialRampToValueAtTime(freqFim, t0 + ataque + decaimento);
    f.Q.value = q;
    const g = ctx.createGain();
    envelope(g, t0, vol, ataque, decaimento);
    fonte.connect(f).connect(g).connect(dest || destino(pan));
    const fim = t0 + ataque + decaimento + 0.05;
    fonte.start(t0, Math.random() * 1.5);
    fonte.stop(fim);
    return { fonte, filtro: f, ganho: g, t0, fim };
}

/**
 * Oscilador com envelope e glissando.
 * { tipo: "sine"|"triangle"|"square"|"sawtooth", freq, freqFim, vol, ataque, decaimento, atraso, pan, filtro, corte }
 */
function tom({ tipo = "sine", freq = 440, freqFim, vol = 0.2, ataque = 0.005, decaimento = 0.2, atraso = 0, pan = 0, corte, saida: dest } = {}) {
    if (!pronto()) return null;
    const t0 = ctx.currentTime + atraso;
    const o = ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t0);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t0 + ataque + decaimento);
    const g = ctx.createGain();
    envelope(g, t0, vol, ataque, decaimento);
    let no = o;
    if (corte) {
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = corte;
        no = o.connect(f);
    }
    no.connect(g).connect(dest || destino(pan));
    o.start(t0);
    o.stop(t0 + ataque + decaimento + 0.05);
    return { osc: o, ganho: g, t0 };
}

/** Sino/metal: soma de parciais inarmónicos com decaimentos diferentes. */
function sino({ freq = 600, parciais = [1, 2.76, 5.4, 8.93], vol = 0.15, decaimento = 1.5, atraso = 0, pan = 0 } = {}) {
    parciais.forEach((p, i) => tom({ freq: freq * p, vol: vol / (1 + i * 0.9), ataque: 0.002, decaimento: decaimento / (1 + i * 0.6), atraso, pan }));
}

const NOTAS = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 };

// ---------------------------------------------------------------------------
// Sons de interface partilhados
// ---------------------------------------------------------------------------
const UI = {
    clique() {
        tom({ tipo: "triangle", freq: 1400, freqFim: 900, vol: 0.06, decaimento: 0.04 });
    },
    passo() {
        // avançar nas regras
        tom({ tipo: "triangle", freq: 880, vol: 0.05, decaimento: 0.06 });
        tom({ tipo: "triangle", freq: 1320, vol: 0.04, decaimento: 0.08, atraso: 0.05 });
    },
    comecar() {
        // "ficha inserida": moeda + arpejo curto
        sino({ freq: 1800, parciais: [1, 1.5], vol: 0.06, decaimento: 0.25 });
        ["C5", "E5", "G5", "C6"].forEach((n, i) => tom({ tipo: "square", freq: NOTAS[n], vol: 0.035, decaimento: 0.12, atraso: 0.08 + i * 0.07, corte: 3000 }));
    },
    certo() {
        ["C5", "E5", "G5"].forEach((n, i) => tom({ tipo: "triangle", freq: NOTAS[n], vol: 0.12, decaimento: 0.25, atraso: i * 0.07 }));
        tom({ tipo: "sine", freq: NOTAS.C6, vol: 0.08, decaimento: 0.6, atraso: 0.21 });
        sino({ freq: 2400, parciais: [1, 1.34], vol: 0.03, decaimento: 0.5, atraso: 0.22 });
    },
    errado() {
        tom({ tipo: "triangle", freq: 220, freqFim: 165, vol: 0.14, decaimento: 0.22 });
        tom({ tipo: "square", freq: 110, freqFim: 90, vol: 0.03, decaimento: 0.2, corte: 600 });
    },
    perdeu() {
        ["G4", "E4", "C4"].forEach((n, i) => tom({ tipo: "triangle", freq: NOTAS[n], vol: 0.11, decaimento: 0.3, atraso: i * 0.16 }));
    },
    tique(forte = false) {
        // relógio: bloco de madeira
        tom({ tipo: "sine", freq: forte ? 1250 : 950, vol: forte ? 0.12 : 0.06, decaimento: 0.05 });
        ruido({ filtro: "bandpass", freq: 3000, q: 3, vol: forte ? 0.05 : 0.025, decaimento: 0.02 });
    },
    fanfarra() {
        const seq = [["C5", 0], ["E5", 0.12], ["G5", 0.24], ["C6", 0.4]];
        for (const [n, t] of seq) {
            tom({ tipo: "square", freq: NOTAS[n], vol: 0.04, decaimento: n === "C6" ? 0.6 : 0.14, atraso: t, corte: 2500 });
            tom({ tipo: "triangle", freq: NOTAS[n] / 2, vol: 0.06, decaimento: n === "C6" ? 0.6 : 0.14, atraso: t });
        }
    },
    pagina() {
        // virar uma ficha/pista
        ruido({ filtro: "bandpass", freq: 2500, freqFim: 5000, q: 1.2, vol: 0.08, ataque: 0.02, decaimento: 0.1 });
        ruido({ filtro: "bandpass", freq: 1200, q: 1, vol: 0.04, ataque: 0.005, decaimento: 0.05, atraso: 0.09 });
    },
};

// ---------------------------------------------------------------------------
// Botão de som na barra de topo
// ---------------------------------------------------------------------------
const ICONE_LIGADO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const ICONE_MUDO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';

function montarBotao() {
    const barra = document.querySelector(".topbar");
    if (!barra || barra.querySelector(".topbar__som")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "topbar__som";
    const pintar = () => {
        b.innerHTML = mudo ? ICONE_MUDO : ICONE_LIGADO;
        b.setAttribute("aria-pressed", String(!mudo));
        b.setAttribute("aria-label", mudo ? "Ligar o som" : "Desligar o som");
        b.title = mudo ? "Som desligado (M)" : "Som ligado (M)";
    };
    b.addEventListener("click", () => {
        som.mudo = !mudo;
        pintar();
        b.blur();
    });
    ouvintes.add(pintar);
    pintar();
    // antes dos indicadores: em telemóvel fica na 1.ª linha, ao lado do título
    barra.insertBefore(b, barra.querySelector(".topbar__hud"));
}

export const som = {
    get mudo() {
        return mudo;
    },
    set mudo(valor) {
        mudo = Boolean(valor);
        localStorage.setItem(CHAVE, mudo ? "off" : "on");
        criar();
        if (saida) saida.gain.setTargetAtTime(mudo ? 0 : 0.8, ctx.currentTime, 0.05);
        if (!mudo) desbloquear();
        ouvintes.forEach((f) => f());
    },
    get contexto() {
        return ctx;
    },
    /** Nó de saída (para cadeias próprias, ex.: ambiente). */
    get saida() {
        return saida;
    },
    get bufferRuido() {
        return bufferRuido;
    },
    pronto,
    ruido,
    tom,
    sino,
    NOTAS,
    ui(nome, ...args) {
        UI[nome]?.(...args);
    },
    montarBotao,
};

// Tecla M liga/desliga o som em qualquer página.
document.addEventListener("keydown", (e) => {
    if (e.key !== "m" && e.key !== "M") return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.target.closest?.("input, textarea")) return;
    som.mudo = !mudo;
});
