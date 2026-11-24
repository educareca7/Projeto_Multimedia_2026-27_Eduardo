// Sons da Última Ficha (sintetizados; ver shared/som.js).

import { som } from "../shared/som.js";

const { ruido, tom, sino } = som;
const sorte = (a, b) => a + Math.random() * (b - a);

// Notas da jukebox (uma por cor: magenta, ciano, âmbar, verde).
export const NOTAS_JUKEBOX = [329.63, 415.3, 554.37, 659.26];

export const sons = {
    navegar() {
        // virar-se: passos abafados na alcatifa
        ruido({ filtro: "lowpass", freq: 700, vol: 0.07, decaimento: 0.07 });
        ruido({ filtro: "lowpass", freq: 600, vol: 0.05, decaimento: 0.07, atraso: 0.16 });
    },
    examinar() {
        tom({ tipo: "triangle", freq: 900, freqFim: 1200, vol: 0.04, decaimento: 0.05 });
    },
    apanhar() {
        ["C5", "G5", "C6"].forEach((n, i) => tom({ tipo: "triangle", freq: som.NOTAS[n], vol: 0.08, decaimento: 0.16, atraso: i * 0.06 }));
        sino({ freq: 2600, parciais: [1, 1.5], vol: 0.025, decaimento: 0.4, atraso: 0.14 });
    },
    selecionar() {
        tom({ tipo: "square", freq: 660, vol: 0.025, decaimento: 0.05, corte: 2000 });
    },
    trancado() {
        // puxar uma porta/gaveta trancada: dois baques metálicos
        for (const t of [0, 0.12]) {
            tom({ freq: 140, freqFim: 90, vol: 0.18, decaimento: 0.08, atraso: t });
            ruido({ filtro: "bandpass", freq: 1800, q: 4, vol: 0.06, decaimento: 0.05, atraso: t });
        }
    },
    nada() {
        tom({ tipo: "triangle", freq: 300, freqFim: 240, vol: 0.05, decaimento: 0.12 });
    },
    faisca() {
        for (let i = 0; i < 7; i += 1) {
            ruido({ filtro: "highpass", freq: sorte(2500, 5000), vol: sorte(0.08, 0.2), decaimento: sorte(0.01, 0.04), atraso: i * sorte(0.02, 0.06) });
        }
        tom({ tipo: "sawtooth", freq: 120, vol: 0.05, decaimento: 0.25, corte: 900 });
    },
    energia() {
        // disjuntor: estalo + zumbido a subir + néons a acender
        ruido({ filtro: "lowpass", freq: 600, vol: 0.4, decaimento: 0.12 });
        tom({ freq: 90, freqFim: 45, vol: 0.4, decaimento: 0.3 });
        tom({ tipo: "sawtooth", freq: 40, freqFim: 120, vol: 0.06, ataque: 0.6, decaimento: 0.8, atraso: 0.15, corte: 500 });
        for (let i = 0; i < 6; i += 1) {
            ruido({ filtro: "bandpass", freq: sorte(3000, 6000), q: 8, vol: 0.04, decaimento: 0.03, atraso: 0.5 + i * sorte(0.05, 0.12) });
        }
        ["C4", "E4", "G4", "C5"].forEach((n, i) => tom({ tipo: "square", freq: som.NOTAS[n], vol: 0.03, decaimento: 0.15, atraso: 1.0 + i * 0.08, corte: 2500 }));
    },
    nota(i, dur = 0.35) {
        const f = NOTAS_JUKEBOX[i];
        tom({ tipo: "triangle", freq: f, vol: 0.14, decaimento: dur });
        tom({ tipo: "square", freq: f, vol: 0.025, decaimento: dur * 0.8, corte: 2500 });
    },
    notaMusica(semitons) {
        // jukebox: melodia curta (onda quadrada + baixo)
        const f = 392 * 2 ** (semitons / 12);
        tom({ tipo: "square", freq: f, vol: 0.035, decaimento: 0.17, corte: 2600 });
        tom({ tipo: "triangle", freq: f / 2, vol: 0.06, decaimento: 0.18 });
    },
    encaixe() {
        tom({ freq: 180, freqFim: 120, vol: 0.2, decaimento: 0.06 });
        ruido({ filtro: "bandpass", freq: 2600, q: 3, vol: 0.08, decaimento: 0.03 });
    },
    leitor() {
        tom({ tipo: "square", freq: 1320, vol: 0.04, decaimento: 0.08, corte: 3000 });
        tom({ tipo: "square", freq: 1760, vol: 0.04, decaimento: 0.12, atraso: 0.1, corte: 3000 });
        tom({ freq: 150, vol: 0.18, decaimento: 0.08, atraso: 0.25 });
        ruido({ filtro: "bandpass", freq: 420, freqFim: 320, q: 10, vol: 0.08, ataque: 0.05, decaimento: 0.4, atraso: 0.3 });
    },
    combinar() {
        tom({ freq: 900, vol: 0.05, decaimento: 0.04 });
        tom({ freq: 1300, vol: 0.05, decaimento: 0.05, atraso: 0.08 });
        tom({ tipo: "sawtooth", freq: 120, vol: 0.02, ataque: 0.05, decaimento: 0.3, atraso: 0.15, corte: 400 });
    },
    abrirPorta() {
        // porta de madeira do escritório
        ruido({ filtro: "bandpass", freq: 520, freqFim: 380, q: 9, vol: 0.07, ataque: 0.05, decaimento: 0.45 });
        tom({ freq: 110, vol: 0.1, decaimento: 0.1, atraso: 0.4 });
    },
    erroJukebox() {
        tom({ tipo: "sawtooth", freq: 110, vol: 0.08, decaimento: 0.5, corte: 800 });
        tom({ tipo: "sawtooth", freq: 116, vol: 0.06, decaimento: 0.5, corte: 800 });
    },
    ficha() {
        // ficha a cair e a saltitar na bandeja
        [0, 0.18, 0.31, 0.4, 0.46].forEach((t, i) => sino({ freq: sorte(2900, 3300), parciais: [1, 2.4, 3.9], vol: 0.06 / (1 + i * 0.6), decaimento: 0.25, atraso: t }));
    },
    moeda() {
        // inserir a ficha numa ranhura
        sino({ freq: 2400, parciais: [1, 2.3], vol: 0.04, decaimento: 0.2 });
        tom({ freq: 160, vol: 0.12, decaimento: 0.08, atraso: 0.12 });
        ["E5", "G5", "C6"].forEach((n, i) => tom({ tipo: "square", freq: som.NOTAS[n], vol: 0.03, decaimento: 0.1, atraso: 0.25 + i * 0.08, corte: 2500 }));
    },
    motor(dur = 0.7) {
        tom({ tipo: "sawtooth", freq: 70, freqFim: 82, vol: 0.05, ataque: 0.05, decaimento: dur, corte: 700 });
        ruido({ filtro: "bandpass", freq: 900, q: 3, vol: 0.02, ataque: 0.05, decaimento: dur });
    },
    agarrar() {
        tom({ freq: 260, freqFim: 180, vol: 0.1, decaimento: 0.06 });
        ruido({ filtro: "bandpass", freq: 2000, q: 2, vol: 0.06, decaimento: 0.04 });
    },
    falhouGarra() {
        ["E4", "D4", "C4"].forEach((n, i) => tom({ tipo: "square", freq: som.NOTAS[n], vol: 0.03, decaimento: 0.14, atraso: i * 0.13, corte: 1800 }));
    },
    premio() {
        tom({ freq: 200, freqFim: 120, vol: 0.18, decaimento: 0.1 });
        sino({ freq: 2200, parciais: [1, 2.76], vol: 0.05, decaimento: 0.35, atraso: 0.08 });
        ["C5", "E5", "G5", "C6", "G5", "C6"].forEach((n, i) => tom({ tipo: "square", freq: som.NOTAS[n], vol: 0.03, decaimento: 0.1, atraso: 0.2 + i * 0.07, corte: 2500 }));
    },
    gaveta() {
        tom({ freq: 900, freqFim: 600, vol: 0.06, decaimento: 0.05 });
        ruido({ filtro: "lowpass", freq: 500, freqFim: 900, vol: 0.12, ataque: 0.05, decaimento: 0.35, atraso: 0.08 });
        tom({ freq: 120, vol: 0.12, decaimento: 0.08, atraso: 0.45 });
    },
    uv() {
        tom({ freq: 1800, vol: 0.03, decaimento: 0.03 });
        tom({ tipo: "sawtooth", freq: 120, vol: 0.02, ataque: 0.05, decaimento: 0.3, corte: 400 });
    },
    tecla() {
        tom({ tipo: "square", freq: 1046, vol: 0.03, decaimento: 0.06, corte: 3000 });
    },
    codigoErrado() {
        tom({ tipo: "square", freq: 220, vol: 0.05, decaimento: 0.15, corte: 1500 });
        tom({ tipo: "square", freq: 165, vol: 0.05, decaimento: 0.25, atraso: 0.16, corte: 1500 });
    },
    codigoCerto() {
        ["C5", "E5", "G5", "C6"].forEach((n, i) => tom({ tipo: "square", freq: som.NOTAS[n], vol: 0.04, decaimento: 0.12, atraso: i * 0.09, corte: 3000 }));
    },
    pongRaquete() {
        tom({ tipo: "square", freq: 480, vol: 0.05, decaimento: 0.05, corte: 3000 });
    },
    pongParede() {
        tom({ tipo: "square", freq: 240, vol: 0.04, decaimento: 0.05, corte: 2000 });
    },
    pongFalha() {
        tom({ tipo: "square", freq: 300, freqFim: 80, vol: 0.06, decaimento: 0.45, corte: 2000 });
    },
    destrancar() {
        tom({ freq: 160, vol: 0.22, decaimento: 0.08 });
        ruido({ filtro: "bandpass", freq: 1500, q: 3, vol: 0.1, decaimento: 0.05 });
        tom({ freq: 1400, vol: 0.05, decaimento: 0.12, atraso: 0.15 });
        tom({ freq: 1870, vol: 0.05, decaimento: 0.2, atraso: 0.27 });
    },
    porta() {
        // porta pesada a abrir (rangido) + ar de fora
        ruido({ filtro: "bandpass", freq: 420, freqFim: 300, q: 12, vol: 0.12, ataque: 0.1, decaimento: 0.7 });
        ruido({ filtro: "lowpass", freq: 900, vol: 0.06, ataque: 0.4, decaimento: 1.2, atraso: 0.3 });
    },
    alarme() {
        for (let i = 0; i < 6; i += 1) {
            tom({ tipo: "sawtooth", freq: 620, freqFim: 980, vol: 0.06, ataque: 0.02, decaimento: 0.4, atraso: i * 0.45, corte: 2600 });
        }
    },
    batimento() {
        tom({ freq: 70, freqFim: 45, vol: 0.18, decaimento: 0.12 });
        tom({ freq: 62, freqFim: 40, vol: 0.14, decaimento: 0.14, atraso: 0.18 });
    },
};

// ---------------------------------------------------------------------------
// Ambiente: sala às escuras (zumbido grave, relógio, pingos) ou com luz
// (máquinas ligadas e de vez em quando um "attract mode").
// ---------------------------------------------------------------------------
let ambiente = null;

function cama(ctx, destino, { filtro, freq, q = 0.7, vol }) {
    const f = ctx.createBufferSource();
    f.buffer = som.bufferRuido;
    f.loop = true;
    const bq = ctx.createBiquadFilter();
    bq.type = filtro;
    bq.frequency.value = freq;
    bq.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = vol;
    f.connect(bq).connect(g).connect(destino);
    f.start(0, Math.random());
    return f;
}

function zumbido(ctx, destino, freq, vol) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    const bq = ctx.createBiquadFilter();
    bq.type = "lowpass";
    bq.frequency.value = 300;
    const g = ctx.createGain();
    g.gain.value = vol;
    o.connect(bq).connect(g).connect(destino);
    o.start();
    return o;
}

export function ligarAmbiente(comLuz) {
    pararAmbiente();
    const ctx = som.contexto;
    if (!ctx) return;
    const mistura = ctx.createGain();
    mistura.gain.setValueAtTime(0.0001, ctx.currentTime);
    mistura.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2);
    mistura.connect(som.saida);
    const nos = [cama(ctx, mistura, { filtro: "lowpass", freq: 180, vol: 0.06 })];
    if (comLuz) {
        nos.push(zumbido(ctx, mistura, 60, 0.012), zumbido(ctx, mistura, 120, 0.006));
        nos.push(cama(ctx, mistura, { filtro: "bandpass", freq: 3500, q: 1, vol: 0.004 }));
    }
    const atual = { mistura, nos, temporizadores: [], ativo: true };
    const agendar = (fn, min, max) => {
        const t = setTimeout(() => {
            if (!atual.ativo) return;
            fn();
            agendar(fn, min, max);
        }, sorte(min, max) * 1000);
        atual.temporizadores.push(t);
    };
    // relógio de parede
    agendar(() => {
        if (!som.pronto()) return;
        tom({ freq: 2100, vol: 0.012, decaimento: 0.02 });
        ruido({ filtro: "bandpass", freq: 3200, q: 5, vol: 0.01, decaimento: 0.015 });
    }, 1, 1);
    if (comLuz) {
        // uma máquina em "attract mode" a chamar jogadores
        agendar(() => {
            if (!som.pronto()) return;
            const base = [523, 587, 659, 784][Math.floor(Math.random() * 4)];
            [1, 1.25, 1.5, 2].forEach((m, i) => tom({ tipo: "square", freq: base * m, vol: 0.008, decaimento: 0.08, atraso: i * 0.08, corte: 2500, pan: sorte(-0.7, 0.7) }));
        }, 5, 10);
    } else {
        // pingos de água e o edifício a ranger
        agendar(() => som.pronto() && tom({ freq: sorte(1200, 1800), freqFim: sorte(700, 900), vol: 0.02, decaimento: 0.08, pan: sorte(-0.8, 0.8) }), 3, 7);
        agendar(() => som.pronto() && ruido({ filtro: "bandpass", freq: 300, freqFim: 240, q: 15, vol: 0.03, ataque: 0.2, decaimento: 0.6, pan: sorte(-0.6, 0.6) }), 9, 16);
    }
    ambiente = atual;
}

export function pararAmbiente() {
    const a = ambiente;
    if (!a) return;
    ambiente = null;
    a.ativo = false;
    a.temporizadores.forEach(clearTimeout);
    const ctx = som.contexto;
    a.mistura.gain.cancelScheduledValues(ctx.currentTime);
    a.mistura.gain.setValueAtTime(Math.max(0.0001, a.mistura.gain.value), ctx.currentTime);
    a.mistura.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    setTimeout(() => {
        a.nos.forEach((n) => {
            try {
                n.stop();
            } catch {
                /* já parado */
            }
        });
        a.mistura.disconnect();
    }, 700);
}
