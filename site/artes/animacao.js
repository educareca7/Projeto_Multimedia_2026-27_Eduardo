// Motor de animação do lutador: keyframes interpolados com curvas suaves,
// cadeia cinética, encadeamento de técnicas, deslocamento (passos), pausa de
// impacto e camada de idle (respiração/ritmo) por cima.
//
// Para o movimento parecer humano e não de robô:
// - Interpolação cúbica monótona (Fritsch–Carlson) entre as chaves: a
//   velocidade é contínua, sem parar em cada pose intermédia e sem passar do
//   alvo. O "easing" de uma chave (snap, in, out) deforma só o tempo desse troço.
// - Cadeia cinética: a anca arranca um pouco antes, depois o tronco e o membro
//   que bate; a cabeça e a mão de guarda vêm atrasadas (follow-through).

import { calcularEsqueleto, pontoEfetor } from "./rig.js";

export const PARAMS = [
    "px", "py", "tronco", "cabeca", "rotOmbros", "rotAnca",
    "bfO", "bfC", "btO", "btC",
    "pfX", "pfY", "pfA", "ptX", "ptY", "ptA",
    "bfP", "btP", "bfQ", "btQ", "giro", "olhar",
];

/** Valores por omissão dos parâmetros opcionais (acrescentados às guardas). */
export const POR_OMISSAO = { bfP: 1, btP: 1, bfQ: 1, btQ: 1, giro: 0, olhar: 0 };

// Avanço (+) ou atraso (−) de cada parâmetro em relação ao relógio do golpe,
// em fração da duração da técnica.
const DESFASAMENTO = {
    px: 0.035, py: 0.03, rotAnca: 0.04,
    rotOmbros: 0.015, tronco: 0.012,
    cabeca: -0.035,
};
const ATRASO_GUARDA = -0.03; // braço que não bate

const EASE = {
    linear: (u) => u,
    in: (u) => u * u * u,
    out: (u) => 1 - (1 - u) ** 3,
    // "estalo": muito rápido no início e trava no impacto (golpes)
    snap: (u) => 1 - (1 - u) ** 4,
};

/** Tangentes de Fritsch–Carlson (monótonas) para uma lista de chaves. */
function tangentes(ts, vs) {
    const n = vs.length;
    const m = new Array(n).fill(0);
    const d = [];
    for (let k = 0; k < n - 1; k += 1) d.push((vs[k + 1] - vs[k]) / Math.max(1e-6, ts[k + 1] - ts[k]));
    for (let k = 1; k < n - 1; k += 1) {
        if (d[k - 1] * d[k] <= 0) continue;
        const h0 = ts[k] - ts[k - 1];
        const h1 = ts[k + 1] - ts[k];
        const w1 = 2 * h1 + h0;
        const w2 = h1 + 2 * h0;
        m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
    }
    return m; // extremos com velocidade 0: parte e chega em repouso
}

function hermite(v0, v1, m0, m1, h, u) {
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * m1;
}

export class Lutador {
    constructor(arte) {
        this.ancora = 0;
        this.relogio = 0;
        this.congelado = 0;
        this.aoIniciar = null; // (id, def) quando uma técnica começa (sons)
        this.definirArte(arte);
    }

    definirArte(arte) {
        this.arte = arte;
        this.clip = null;
        this.fila = [];
        this.pesoIdle = 1;
        this.rasto = [];
        this.ultimaPose = { ...arte.guarda };
    }

    get ocupado() {
        return Boolean(this.clip);
    }

    /** Pede uma técnica. Se estiver ocupado, fica em espera (no máximo 1). */
    executar(id) {
        if (!this.arte.tecnicas[id]) return false;
        if (!this.clip) {
            this.iniciar(id, this.ultimaPose);
            return true;
        }
        if (this.fila.length === 0) {
            this.fila.push(id);
            return true;
        }
        return false;
    }

    executarCombo(ids) {
        if (this.clip) {
            this.fila = [...ids];
        } else {
            const [primeiro, ...resto] = ids;
            this.fila = resto;
            this.iniciar(primeiro, this.ultimaPose);
        }
    }

    /** Pausa de impacto: congela a animação durante s segundos. */
    pausar(s) {
        this.congelado = Math.max(this.congelado, s);
    }

    iniciar(id, poseInicial) {
        const def = this.arte.tecnicas[id];
        const g = this.arte.guarda;
        // a pose de partida é a atual sem a camada de idle (que é somada depois)
        const inicio = {};
        for (const k of PARAMS) inicio[k] = poseInicial[k] ?? g[k] ?? POR_OMISSAO[k];
        // depois de um giro completo (360°) recomeça em 0, sem "desenrolar" para trás
        for (const k of ["giro", "olhar"]) inicio[k] = ((((inicio[k] + 180) % 360) + 360) % 360) - 180;
        const ts = def.keys.map((k) => k.t);
        const poses = def.keys.map((k, i) => (i === 0 ? inicio : { ...g, ...k.p }));
        const tan = {};
        for (const p of PARAMS) tan[p] = tangentes(ts, poses.map((q) => q[p]));
        // braço que não bate fica atrasado (acompanha o corpo)
        const guarda = def.efetor === "maoFrente" ? ["btO", "btC"] : def.efetor === "maoTras" || def.efetor === "cotoveloTras" ? ["bfO", "bfC"] : [];
        this.clip = { id, def, t: 0, ts, poses, tan, guarda, impactou: false };
        this.rasto = [];
        this.aoIniciar?.(id, def);
    }

    /** Valor de um parâmetro no instante t (0–1) do clip atual. */
    valor(p, t) {
        const { def, ts, poses, tan } = this.clip;
        let i = 0;
        while (i < ts.length - 2 && t > ts[i + 1]) i += 1;
        const h = ts[i + 1] - ts[i] || 1;
        let u = Math.max(0, Math.min(1, (t - ts[i]) / h));
        const e = EASE[def.keys[i + 1].e];
        if (e) u = e(u);
        return hermite(poses[i][p], poses[i + 1][p], tan[p][i], tan[p][i + 1], h, u);
    }

    amostrar() {
        const { t, guarda } = this.clip;
        const entrada = Math.min(1, t / 0.12); // o desfasamento entra aos poucos
        const r = {};
        for (const p of PARAMS) {
            let d = DESFASAMENTO[p] || 0;
            if (guarda.includes(p)) d = ATRASO_GUARDA;
            r[p] = this.valor(p, Math.max(0, Math.min(1, t + d * entrada)));
        }
        return r;
    }

    /**
     * Avança a animação. aoImpactar(def, ponto, id) é chamado no instante de
     * impacto com o ponto do corpo que bate (mundo, metros).
     */
    atualizar(dt, aoImpactar) {
        if (this.congelado > 0) {
            this.congelado -= dt;
            return;
        }
        this.relogio += dt;
        const alvoIdle = this.clip ? 0.15 : 1;
        this.pesoIdle += (alvoIdle - this.pesoIdle) * Math.min(1, dt * 8);

        if (!this.clip) return;
        const { def } = this.clip;
        this.clip.t += dt / def.duracao;

        // impacto
        if (!this.clip.impactou && def.impacto !== undefined && this.clip.t >= def.impacto) {
            this.clip.impactou = true;
            const esq = calcularEsqueleto(this.amostrar(), this.ancora);
            aoImpactar?.(def, pontoEfetor(esq, def.efetor), this.clip.id);
        }

        // rasto do membro que bate (entre a antecipação e a recuperação)
        if (def.efetor && this.clip.t > def.impacto - 0.2 && this.clip.t < def.impacto + 0.08) {
            const esq = calcularEsqueleto(this.amostrar(), this.ancora);
            this.rasto.push({ ...pontoEfetor(esq, def.efetor), vida: 0.12 });
        }

        // encadear a próxima técnica a meio da recuperação (combos fluidos);
        // as esquivas (sem impacto) também se encadeiam
        const podeCancelar = def.impacto !== undefined
            ? this.clip.impactou && this.clip.t >= (def.cancelar ?? 0.72)
            : !def.avanco && this.clip.t >= (def.cancelar ?? 0.7);
        if (this.fila.length && podeCancelar) {
            this.iniciar(this.fila.shift(), this.amostrar());
            return;
        }

        if (this.clip.t >= 1) {
            if (def.avanco) this.ancora += def.avanco;
            this.clip = null;
            if (this.fila.length) this.iniciar(this.fila.shift(), this.arte.guarda);
        }
    }

    atualizarRasto(dt) {
        for (const p of this.rasto) p.vida -= dt;
        this.rasto = this.rasto.filter((p) => p.vida > 0);
    }

    /** Pose atual completa, com a camada de idle somada. */
    pose() {
        const base = this.clip ? this.amostrar() : { ...this.arte.guarda };
        const semIdle = { ...base };
        const idle = this.arte.idle(this.relogio);
        for (const [k, v] of Object.entries(idle)) base[k] += v * this.pesoIdle;
        this.ultimaPose = semIdle;
        return base;
    }

    /** Membros de trás que devem ser desenhados à frente do corpo neste instante. */
    camadas() {
        const f = this.clip?.def.frente;
        if (!f) return {};
        const t = this.clip.t;
        const r = {};
        for (const [membro, [a, b]] of Object.entries(f)) r[membro] = t >= a && t <= b;
        return r;
    }
}

/** Ponto de impacto de cada técnica em relação à âncora (para colocar os alvos). */
export function pontosDeImpacto(arte) {
    const pontos = {};
    for (const [id, def] of Object.entries(arte.tecnicas)) {
        if (def.impacto === undefined) continue;
        const l = new Lutador(arte);
        l.iniciar(id, arte.guarda);
        l.clip.t = def.impacto;
        const esq = calcularEsqueleto(l.amostrar(), 0);
        pontos[id] = pontoEfetor(esq, def.efetor);
    }
    return pontos;
}
