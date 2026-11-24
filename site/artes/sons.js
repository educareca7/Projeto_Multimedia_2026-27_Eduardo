// Sons das Artes Marciais (sintetizados; ver shared/som.js).
//
// - golpe: deslocação de ar ("whoosh") a crescer até ao impacto + expiração
//   ("tss" no boxe e muay thai, "hap" curto no taekwondo).
// - impacto: um som por objeto (saco pesado, saco de reflexos, saco tailandês,
//   tronco de bananeira, tábua a partir).
// - passos: lona do ringue, estrado de madeira ou pedra, conforme o cenário.
// - ambiente: fim de tarde na cidade (grilos, carros ao longe), selva
//   (insetos, pássaros) ou montanha (vento, pássaros, sino do templo).
// - desafio: contagem, sino de início/fim, acerto (sobe de tom com o combo).

import { som } from "../shared/som.js";

const { ruido, tom, sino } = som;
const sorte = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------------------
// Golpes
// ---------------------------------------------------------------------------
function whoosh({ atraso, dur, grave = false, forca = 1 }) {
    const f0 = grave ? 260 : 420;
    const f1 = grave ? 1100 : 1900;
    // o ar "abre" até ao impacto e corta logo a seguir
    ruido({ filtro: "bandpass", freq: f0, freqFim: f1, q: 1.4, vol: 0.2 * forca, ataque: dur * 0.75, decaimento: dur * 0.35, atraso });
    ruido({ filtro: "lowpass", freq: 500, vol: 0.06 * forca, ataque: dur * 0.6, decaimento: dur * 0.3, atraso });
}

/**
 * Voz sintetizada: onda dente de serra (cordas vocais) por filtros de formantes
 * (a "vogal") com envelope curto. formantes: [[freq, q, ganho], ...]
 */
function vogal({ atraso = 0, f0 = 130, f0Fim, dur = 0.08, vol = 0.05, formantes }) {
    const ctx = som.contexto;
    if (!som.pronto()) return;
    const t0 = ctx.currentTime + atraso;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f0Fim || f0 * 0.85, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.015, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    for (const [f, q, ganho] of formantes) {
        const b = ctx.createBiquadFilter();
        b.type = "bandpass";
        b.frequency.value = f;
        b.Q.value = q;
        const gf = ctx.createGain();
        gf.gain.value = ganho;
        o.connect(b).connect(gf).connect(g);
    }
    g.connect(som.saida);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
}

const VOGAL_U = [[320, 6, 1], [800, 8, 0.5], [2400, 10, 0.15]];
const VOGAL_A = [[750, 6, 1], [1200, 7, 0.7], [2600, 10, 0.2]];
const VOGAL_E = [[480, 6, 1], [1900, 8, 0.5], [2600, 10, 0.2]];

/**
 * Expiração do lutador no golpe ("huss", "tss", "hah", kihap). Cada lutador
 * tem uma voz (altura) e há pequenas variações para não soar sempre igual.
 * forca: 0 = golpe leve (jab), 1 = golpe pesado (pontapés, giratórios).
 */
function expirar(idArte, atraso, forca) {
    const voz = { boxe: 112, muaythai: 124, taekwondo: 138 }[idArte] || 120;
    const f0 = voz * sorte(0.94, 1.06);
    const v = 0.85 + forca * 0.5;
    if (idArte === "taekwondo" && forca > 0.5) {
        // kihap: "hap!"/"iá!" vozeado e firme
        ruido({ filtro: "bandpass", freq: 1100, q: 1, vol: 0.05 * v, ataque: 0.005, decaimento: 0.04, atraso });
        vogal({ atraso: atraso + 0.02, f0: f0 * 1.35, f0Fim: f0 * 1.05, dur: 0.16, vol: 0.09 * v, formantes: Math.random() < 0.5 ? VOGAL_A : VOGAL_E });
        ruido({ filtro: "bandpass", freq: 1700, q: 3, vol: 0.025 * v, ataque: 0.02, decaimento: 0.12, atraso: atraso + 0.02 });
        return;
    }
    if (forca > 0.5) {
        // golpe pesado: "hah" curto com mais corpo antes do "ss"
        ruido({ filtro: "bandpass", freq: 1000, q: 0.9, vol: 0.06 * v, ataque: 0.006, decaimento: 0.06, atraso });
        vogal({ atraso: atraso + 0.01, f0: f0 * 1.1, dur: 0.09, vol: 0.06 * v, formantes: VOGAL_A });
        ruido({ filtro: "bandpass", freq: sorte(4300, 5300), q: 2.4, vol: 0.11 * v, ataque: 0.012, decaimento: 0.12, atraso: atraso + 0.06 });
        return;
    }
    // "huss"/"tss": um "hu" curto e abafado seguido do ar a sair entre os dentes
    ruido({ filtro: "bandpass", freq: 850, q: 1.1, vol: 0.05 * v, ataque: 0.005, decaimento: 0.045, atraso });
    vogal({ atraso, f0, dur: 0.06, vol: 0.035 * v, formantes: VOGAL_U });
    ruido({ filtro: "bandpass", freq: sorte(4600, 5600), q: 2.6, vol: 0.13 * v, ataque: 0.01, decaimento: idArte === "boxe" ? 0.09 : 0.12, atraso: atraso + 0.035 });
    ruido({ filtro: "highpass", freq: 6500, vol: 0.03 * v, ataque: 0.01, decaimento: 0.07, atraso: atraso + 0.04 });
}

/** Técnica a começar: agenda o whoosh e a expiração para o instante do impacto. */
export function golpe(idArte, def) {
    if (!som.pronto() || def.impacto === undefined) return;
    const tImpacto = def.impacto * def.duracao;
    const pontape = def.categoria === "pontapé" || def.categoria === "joelho";
    const giratorio = def.keys.some((k) => k.p?.giro);
    const dur = pontape ? 0.24 : 0.15;
    // nos giratórios o ar corta duas vezes: a volta do corpo e o golpe
    if (giratorio) whoosh({ atraso: Math.max(0, tImpacto * 0.45), dur: 0.22, grave: true, forca: 0.7 });
    whoosh({ atraso: Math.max(0, tImpacto - dur * 0.8), dur, grave: pontape, forca: pontape ? 1.2 : 1 });
    const pesado = pontape || giratorio || def.categoria === "cotovelo" ? 1 : def.efetor === "maoTras" ? 0.5 : 0.2;
    expirar(idArte, Math.max(0, tImpacto - 0.05), pesado);
}

/** Esquiva: o corpo desloca ar e o lutador solta o ar pelo nariz. */
export function esquiva(idArte, def) {
    if (!som.pronto()) return;
    whoosh({ atraso: def.duracao * 0.1, dur: def.duracao * 0.5, grave: true, forca: 0.55 });
    ruido({ filtro: "bandpass", freq: 2200, q: 1.5, vol: 0.05, ataque: 0.01, decaimento: 0.08, atraso: def.duracao * 0.15 });
    pe(idArte, def.duracao * 0.3, 0.6);
}

// ---------------------------------------------------------------------------
// Impactos nos objetos
// ---------------------------------------------------------------------------
function baque(f0, f1, vol, dec = 0.2) {
    tom({ freq: f0, freqFim: f1, vol, ataque: 0.002, decaimento: dec });
}

function correntes(atraso = 0.03, vol = 0.012) {
    sino({ freq: sorte(2700, 3200), parciais: [1, 1.41, 1.93, 2.6], vol, decaimento: 0.35, atraso });
    sino({ freq: sorte(2400, 2900), parciais: [1, 1.37, 2.1], vol: vol * 0.7, decaimento: 0.3, atraso: atraso + 0.07 });
}

function elastico(vol) {
    const ctx = som.contexto;
    if (!som.pronto()) return;
    // "boing" do saco de reflexos: tom grave com vibrato a acalmar
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 150;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 11;
    const prof = ctx.createGain();
    prof.gain.setValueAtTime(40, t0);
    prof.gain.exponentialRampToValueAtTime(2, t0 + 0.4);
    lfo.connect(prof).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    o.connect(g).connect(som.saida);
    o.start(t0);
    lfo.start(t0);
    o.stop(t0 + 0.5);
    lfo.stop(t0 + 0.5);
}

/** tipo: pesado | uppercut | thai | reflexos | bananeira | tabua; forca 0–1 */
export function impacto(tipo, forca = 1) {
    if (!som.pronto()) return;
    const k = forca;
    switch (tipo) {
        case "reflexos":
            ruido({ filtro: "bandpass", freq: 2300, q: 1, vol: 0.32 * k, decaimento: 0.03 });
            baque(280, 170, 0.18 * k, 0.07);
            elastico(0.05 * k);
            break;
        case "bananeira":
            baque(85, 52, 0.5 * k, 0.16);
            ruido({ filtro: "lowpass", freq: 700, vol: 0.32 * k, decaimento: 0.08 });
            ruido({ filtro: "bandpass", freq: 900, freqFim: 380, q: 3, vol: 0.14 * k, decaimento: 0.1 });
            break;
        case "tabua":
            if (k < 0.8) {
                // tábua tocada mas não partida: só um toque seco
                tom({ freq: 480, vol: 0.12 * k, decaimento: 0.06 });
                ruido({ filtro: "highpass", freq: 1800, vol: 0.12 * k, decaimento: 0.02 });
                break;
            }
            ruido({ filtro: "highpass", freq: 1700, vol: 0.55, decaimento: 0.03 });
            ruido({ filtro: "highpass", freq: 2400, vol: 0.32, decaimento: 0.025, atraso: 0.018 });
            tom({ freq: 520, vol: 0.16, decaimento: 0.09 });
            tom({ freq: 790, vol: 0.1, decaimento: 0.07 });
            ruido({ filtro: "bandpass", freq: 3600, q: 1, vol: 0.1, decaimento: 0.2, atraso: 0.03 });
            // metades a cair no chão
            for (const t of [0.48, 0.6, 0.66]) {
                tom({ freq: sorte(260, 340), vol: 0.06, decaimento: 0.07, atraso: t });
                ruido({ filtro: "bandpass", freq: 1500, q: 1.5, vol: 0.04, decaimento: 0.04, atraso: t });
            }
            break;
        case "uppercut":
            baque(125, 62, 0.5 * k);
            ruido({ filtro: "lowpass", freq: 1100, vol: 0.3 * k, decaimento: 0.07 });
            ruido({ filtro: "bandpass", freq: 1700, q: 0.8, vol: 0.22 * k, decaimento: 0.03 });
            correntes(0.04, 0.01 * k);
            break;
        case "thai":
            baque(90, 48, 0.55 * k, 0.24);
            ruido({ filtro: "lowpass", freq: 900, vol: 0.34 * k, decaimento: 0.09 });
            ruido({ filtro: "bandpass", freq: 1500, q: 0.7, vol: 0.28 * k, decaimento: 0.035 });
            correntes(0.05, 0.016 * k);
            correntes(0.32, 0.008 * k);
            break;
        default: // saco pesado
            baque(98, 50, 0.55 * k);
            ruido({ filtro: "lowpass", freq: 1000, vol: 0.34 * k, decaimento: 0.08 });
            ruido({ filtro: "bandpass", freq: 1600, q: 0.7, vol: 0.24 * k, decaimento: 0.03 });
            correntes(0.04, 0.012 * k);
    }
}

/**
 * Fim de cada balanço do objeto (k = amplitude 0–1): correntes a chiar e o
 * saco a ranger; a bola de reflexos a bater e o elástico; o tronco a estalar.
 */
export function balanco(tipo, k) {
    if (!som.pronto() || k < 0.05) return;
    switch (tipo) {
        case "reflexos":
            ruido({ filtro: "bandpass", freq: 2000, q: 1, vol: 0.09 * k, decaimento: 0.02 });
            tom({ freq: 220, freqFim: 170, vol: 0.05 * k, decaimento: 0.05 });
            tom({ tipo: "triangle", freq: sorte(150, 175), vol: 0.02 * k, decaimento: 0.12 });
            break;
        case "bananeira":
            ruido({ filtro: "bandpass", freq: 360, freqFim: 300, q: 10, vol: 0.07 * k, ataque: 0.02, decaimento: 0.15 });
            ruido({ filtro: "highpass", freq: 3000, vol: 0.03 * k, ataque: 0.03, decaimento: 0.2 });
            break;
        case "tabua":
            break;
        default:
            // sacos pendurados: correntes + couro/gancho a ranger
            correntes(0, 0.012 * k);
            ruido({ filtro: "bandpass", freq: sorte(480, 560), freqFim: 420, q: 14, vol: 0.06 * k, ataque: 0.04, decaimento: 0.18 });
            tom({ freq: 72, vol: 0.04 * k, decaimento: 0.12 });
    }
}

// ---------------------------------------------------------------------------
// Passos
// ---------------------------------------------------------------------------
function pe(idArte, atraso, k = 1) {
    if (idArte === "muaythai") {
        // estrado de madeira
        tom({ freq: 125, freqFim: 85, vol: 0.12 * k, decaimento: 0.08, atraso });
        ruido({ filtro: "lowpass", freq: 1400, vol: 0.06 * k, decaimento: 0.04, atraso });
    } else if (idArte === "taekwondo") {
        // pés descalços na pedra
        ruido({ filtro: "bandpass", freq: 1100, q: 0.8, vol: 0.08 * k, decaimento: 0.045, atraso });
        ruido({ filtro: "highpass", freq: 2600, vol: 0.03 * k, decaimento: 0.015, atraso });
    } else {
        // botas na lona (e às vezes um chiar de sola)
        ruido({ filtro: "lowpass", freq: 900, vol: 0.13 * k, decaimento: 0.06, atraso });
        if (Math.random() < 0.35) tom({ freq: sorte(2400, 2900), freqFim: sorte(2900, 3300), vol: 0.008 * k, ataque: 0.01, decaimento: 0.05, atraso });
    }
}

export function passo(idArte, duracao) {
    if (!som.pronto()) return;
    pe(idArte, duracao * 0.5);
    pe(idArte, duracao * 0.85);
}

// ---------------------------------------------------------------------------
// Desafio
// ---------------------------------------------------------------------------
function sinoRingue(atraso = 0, vol = 0.11) {
    sino({ freq: 830, parciais: [1, 2.32, 4.25, 6.63], vol, decaimento: 1.6, atraso });
}

export const desafio = {
    contagem() {
        tom({ tipo: "square", freq: 660, vol: 0.035, decaimento: 0.12, corte: 2200 });
        tom({ freq: 660, vol: 0.06, decaimento: 0.15 });
    },
    inicio() {
        sinoRingue();
    },
    fim() {
        sinoRingue(0);
        sinoRingue(0.3);
        sinoRingue(0.6);
    },
    acerto(combo) {
        const f = 880 * 2 ** (Math.min(combo, 12) / 12);
        tom({ tipo: "triangle", freq: f, vol: 0.07, decaimento: 0.18, atraso: 0.04 });
        tom({ freq: f * 2, vol: 0.03, decaimento: 0.25, atraso: 0.04 });
    },
    novoAlvo() {
        tom({ freq: 520, freqFim: 900, vol: 0.035, decaimento: 0.07 });
    },
    fugiu() {
        tom({ tipo: "triangle", freq: 320, freqFim: 180, vol: 0.07, decaimento: 0.2 });
    },
    aviso() {
        // técnica errada ou fora de distância
        tom({ tipo: "triangle", freq: 440, freqFim: 370, vol: 0.045, decaimento: 0.1 });
    },
};

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------
let ambienteAtual = null;

function cama(ctx, saida, { filtro = "lowpass", freq = 400, q = 0.7, vol = 0.04, lfoGanho, lfoFreq }) {
    const fonte = ctx.createBufferSource();
    fonte.buffer = som.bufferRuido;
    fonte.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = vol;
    fonte.connect(f).connect(g).connect(saida);
    const extra = [];
    if (lfoGanho) {
        // [frequência Hz, profundidade (fração do volume)]
        const lfo = ctx.createOscillator();
        lfo.frequency.value = lfoGanho[0];
        const p = ctx.createGain();
        p.gain.value = vol * lfoGanho[1];
        lfo.connect(p).connect(g.gain);
        lfo.start();
        extra.push(lfo);
    }
    if (lfoFreq) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = lfoFreq[0];
        const p = ctx.createGain();
        p.gain.value = lfoFreq[1];
        lfo.connect(p).connect(f.frequency);
        lfo.start();
        extra.push(lfo);
    }
    fonte.start(0, Math.random() * 1.5);
    return [fonte, ...extra];
}

function grilos() {
    const pan = sorte(-0.8, 0.8);
    const f = sorte(4200, 4700);
    for (let i = 0; i < 3; i += 1) tom({ freq: f, vol: 0.01, ataque: 0.004, decaimento: 0.025, atraso: i * 0.055, pan });
}

function carro() {
    ruido({ filtro: "bandpass", freq: 320, freqFim: 520, q: 0.8, vol: 0.03, ataque: 1.6, decaimento: 2.2, pan: sorte(-0.5, 0.5) });
}

function passaro(grave = false) {
    const pan = sorte(-0.9, 0.9);
    const n = 2 + Math.floor(Math.random() * 4);
    const base = grave ? sorte(1500, 2200) : sorte(2400, 3600);
    let t = 0;
    for (let i = 0; i < n; i += 1) {
        const sobe = Math.random() < 0.5;
        const d = sorte(0.05, 0.11);
        tom({ freq: base * sorte(0.9, 1.1), freqFim: base * (sobe ? 1.35 : 0.72), vol: sorte(0.014, 0.028), ataque: 0.008, decaimento: d, atraso: t, pan });
        t += d + sorte(0.03, 0.09);
    }
}

function sinoTemplo() {
    // sino coreano: grave, inarmónico e muito longo
    sino({ freq: 128, parciais: [1, 2.0, 2.76, 4.1, 5.4], vol: 0.05, decaimento: 6, pan: -0.3 });
}

const AMBIENTES = {
    boxe: {
        camas: [
            { filtro: "lowpass", freq: 260, vol: 0.05, lfoGanho: [0.05, 0.3] }, // cidade ao longe
            { filtro: "bandpass", freq: 800, q: 0.5, vol: 0.008 },
        ],
        eventos: [
            [grilos, 0.7, 1.6],
            [carro, 9, 17],
        ],
    },
    muaythai: {
        camas: [
            { filtro: "bandpass", freq: 5600, q: 6, vol: 0.016, lfoGanho: [13, 0.8] }, // insetos
            { filtro: "lowpass", freq: 380, vol: 0.03, lfoGanho: [0.07, 0.4] }, // brisa
        ],
        eventos: [
            [() => passaro(false), 1.8, 4.5],
            [() => passaro(true), 5, 11],
        ],
    },
    taekwondo: {
        camas: [
            { filtro: "lowpass", freq: 420, vol: 0.05, lfoGanho: [0.06, 0.5], lfoFreq: [0.09, 180] }, // vento na montanha
            { filtro: "bandpass", freq: 3200, q: 0.8, vol: 0.004, lfoGanho: [0.11, 0.8] }, // folhas
        ],
        eventos: [
            [() => passaro(true), 4, 9],
            [sinoTemplo, 18, 30, 3],
        ],
    },
};

/** Liga o ambiente de um cenário (desliga o anterior com fade). */
export function ambiente(idArte) {
    pararAmbiente();
    const ctx = som.contexto;
    const def = AMBIENTES[idArte];
    if (!ctx || !def) return;
    const mistura = ctx.createGain();
    mistura.gain.setValueAtTime(0.0001, ctx.currentTime);
    mistura.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.5);
    mistura.connect(som.saida);
    const nos = def.camas.flatMap((c) => cama(ctx, mistura, c));
    const temporizadores = [];
    const atual = { mistura, nos, temporizadores, ativo: true };
    for (const [fn, min, max, primeiro] of def.eventos) {
        const agendar = (espera) => {
            const id = setTimeout(() => {
                if (!atual.ativo) return;
                fn();
                agendar(sorte(min, max));
            }, espera * 1000);
            temporizadores.push(id);
        };
        agendar(primeiro ?? sorte(min * 0.3, max * 0.6));
    }
    ambienteAtual = atual;
}

export function pararAmbiente() {
    const a = ambienteAtual;
    if (!a) return;
    ambienteAtual = null;
    a.ativo = false;
    a.temporizadores.forEach(clearTimeout);
    const ctx = som.contexto;
    const t = ctx.currentTime;
    a.mistura.gain.cancelScheduledValues(t);
    a.mistura.gain.setValueAtTime(Math.max(0.0001, a.mistura.gain.value), t);
    a.mistura.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    setTimeout(() => {
        a.nos.forEach((n) => {
            try {
                n.stop();
            } catch {
                /* já parado */
            }
        });
        a.mistura.disconnect();
    }, 800);
}
