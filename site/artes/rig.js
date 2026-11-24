// Rig 2D de um lutador visto de lado (virado para a direita).
//
// Proporções antropométricas para uma pessoa de 1,80 m (frações da altura H,
// segundo as tabelas clássicas de Drillis & Contini / Winter). Unidades: metros,
// y para cima, x para a frente. Ângulos em graus.
//
// - Tronco, pescoço e braços: FK (cinemática direta) com ângulos.
// - Pernas: IK de 2 ossos com alvo no tornozelo, para os pés ficarem cravados
//   no chão sem deslizar; nos pontapés o alvo sobe no ar.
// - "rotOmbros"/"rotAnca": rotação em profundidade (0 = de frente para o
//   adversário, 90 = completamente de lado). Projetada no plano lateral, faz o
//   ombro/anca da frente avançar e o de trás recuar. É o que dá a rotação de
//   tronco e anca nos golpes.
// - "bfQ"/"btQ" e "bfP"/"btP": projeção do braço e do antebraço (1 = de lado; ~0,3 = a apontar para a
//   câmara/para dentro, como no gancho, em que o antebraço fica "encurtado").
// - "giro": rotação do corpo inteiro em torno da bacia (golpes giratórios).
//   0 = virado para a direita, 180 = de costas/virado para a esquerda. O
//   esqueleto é calculado sempre virado para a direita e o giro aplica-se no
//   fim como cos(giro) em x (paraMundo), como nos jogos 2D. "olhar" roda só a
//   cabeça (ex.: olhar por cima do ombro a meio do giro).
//
// Desenho: figura humana ilustrada (volumes musculares, perfil da cabeça,
// cabelo e roupa de cada arte), com contorno escuro fino. O lado mais afastado
// da câmara é desenhado primeiro e mais escuro.

export const ALTURA = 1.8;
const H = ALTURA;

export const MEDIDAS = {
    tronco: 0.29 * H, // anca → base do pescoço
    pescoco: 0.05 * H,
    cabeca: 0.058 * H, // raio
    braco: 0.186 * H,
    antebraco: 0.146 * H,
    mao: 0.035 * H,
    coxa: 0.245 * H,
    perna: 0.246 * H,
    pe: 0.14 * H,
    ombro: 0.1 * H, // meia largura dos ombros
    anca: 0.05 * H, // meia distância entre articulações da anca
};

const RAD = Math.PI / 180;
const soma = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const vezes = (v, k) => ({ x: v.x * k, y: v.y * k });
const lerpP = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
// Direção de um segmento: 0° = para baixo, 90° = para a frente, 180° = para cima.
const direcao = (graus) => ({ x: Math.sin(graus * RAD), y: -Math.cos(graus * RAD) });

/** Calcula as posições de todas as articulações para uma pose. */
export function calcularEsqueleto(p, ancora = 0) {
    const M = MEDIDAS;
    const P = { x: ancora + p.px, y: p.py };
    const s = p.tronco * RAD;
    const cima = { x: Math.sin(s), y: Math.cos(s) };
    const frente = { x: Math.cos(s), y: -Math.sin(s) };
    const C = soma(P, vezes(cima, M.tronco)); // centro dos ombros

    const desvioOmbro = M.ombro * Math.sin(p.rotOmbros * RAD);
    const SF = soma(C, vezes(frente, desvioOmbro));
    const ST = soma(C, vezes(frente, -desvioOmbro));

    const angPescoco = (p.tronco + p.cabeca) * RAD;
    const dirPescoco = { x: Math.sin(angPescoco), y: Math.cos(angPescoco) };
    const N = soma(C, vezes(dirPescoco, M.pescoco));
    const cabeca = soma(N, vezes(dirPescoco, M.cabeca * 0.95));

    const desvioAnca = M.anca * Math.sin(p.rotAnca * RAD);
    const HF = { x: P.x + desvioAnca, y: P.y };
    const HT = { x: P.x - desvioAnca, y: P.y };

    return {
        P, C, N, cabeca, cima, frente, SF, ST, HF, HT,
        tronco: p.tronco, cabecaAng: p.tronco + p.cabeca,
        rotOmbros: p.rotOmbros, rotAnca: p.rotAnca,
        giro: p.giro || 0, olhar: p.olhar || 0, pivo: P.x,
        bf: braco(SF, p.tronco + p.bfO, p.bfC, p.bfP ?? 1, p.bfQ ?? 1),
        bt: braco(ST, p.tronco + p.btO, p.btC, p.btP ?? 1, p.btQ ?? 1),
        pf: perna(HF, { x: ancora + p.pfX, y: p.pfY }, p.pfA),
        pt: perna(HT, { x: ancora + p.ptX, y: p.ptY }, p.ptA),
    };
}

function braco(S, angBraco, angCotovelo, projecao = 1, projBraco = 1) {
    const angAnte = angBraco + angCotovelo;
    const E = soma(S, vezes(direcao(angBraco), MEDIDAS.braco * projBraco));
    const W = soma(E, vezes(direcao(angAnte), MEDIDAS.antebraco * projecao));
    const punho = soma(W, vezes(direcao(angAnte), MEDIDAS.mao));
    return { S, E, W, punho };
}

// IK de 2 ossos: o joelho dobra sempre "para a frente" (rotação anti-horária
// a partir da linha anca→tornozelo), tanto em guarda como em pontapés.
function perna(Hp, alvo, angPe) {
    // Pé apoiado: se a ponta ou o calcanhar entrarem no chão (ex.: calcanhar
    // levantado), o tornozelo sobe o necessário para o pé rodar sobre a ponta.
    if (alvo.y < 0.35) {
        const a = angPe * RAD;
        const pontaY = -0.045 * Math.cos(a) - MEDIDAS.pe * 0.78 * Math.sin(a) - 0.032;
        const calcY = -0.045 * Math.cos(a) + 0.045 * Math.sin(a) - 0.042;
        const baixo = alvo.y + Math.min(pontaY, calcY);
        if (baixo < 0) alvo = { x: alvo.x, y: alvo.y - baixo };
    }
    const L1 = MEDIDAS.coxa;
    const L2 = MEDIDAS.perna;
    let dx = alvo.x - Hp.x;
    let dy = alvo.y - Hp.y;
    let d = Math.hypot(dx, dy) || 1e-6;
    const max = L1 + L2 - 1e-4;
    const min = 0.08;
    if (d > max) {
        dx *= max / d;
        dy *= max / d;
        d = max;
    } else if (d < min) {
        dx *= min / d;
        dy *= min / d;
        d = min;
    }
    const a = Math.atan2(dy, dx);
    const cosT = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
    const t = Math.acos(cosT);
    const K = { x: Hp.x + L1 * Math.cos(a + t), y: Hp.y + L1 * Math.sin(a + t) };
    const A = { x: Hp.x + dx, y: Hp.y + dy };

    // Pé: 0° = assente na horizontal; positivo = dedos para baixo (pé em ponta).
    const vf = { x: Math.cos(-angPe * RAD), y: Math.sin(-angPe * RAD) };
    const vb = { x: vf.y, y: -vf.x }; // perpendicular, "para baixo" do pé
    const calcanhar = soma(soma(A, vezes(vb, 0.045)), vezes(vf, -0.045));
    const dedos = soma(soma(A, vezes(vb, 0.045)), vezes(vf, MEDIDAS.pe * 0.78));
    return { H: Hp, K, A, calcanhar, dedos, vf };
}

/** Fator horizontal do giro (cos), com um mínimo para a figura nunca desaparecer. */
export function fatorGiro(esq) {
    const k = Math.cos((esq.giro || 0) * RAD);
    // perto dos 90° a figura não chega a ficar "de papel": vira de um lado para o outro
    return Math.abs(k) < 0.22 ? Math.sign(k || 1) * 0.22 : k;
}

/** Ponto do esqueleto (calculado virado para a direita) → posição real no mundo. */
export function paraMundo(esq, q) {
    if (!esq.giro) return q;
    return { x: esq.pivo + (q.x - esq.pivo) * fatorGiro(esq), y: q.y };
}

/** Ponto do corpo usado para testar o impacto de cada técnica (no mundo). */
export function pontoEfetor(esq, efetor) {
    return paraMundo(esq, pontoLocal(esq, efetor));
}

function pontoLocal(esq, efetor) {
    switch (efetor) {
        case "maoFrente": return esq.bf.punho;
        case "maoTras": return esq.bt.punho;
        case "cotoveloTras": return esq.bt.E;
        case "joelhoTras": return esq.pt.K;
        case "canelaTras": return lerpP(esq.pt.K, esq.pt.A, 0.75);
        case "peTras": return lerpP(esq.pt.A, esq.pt.dedos, 0.45);
        case "peFrente": return esq.pf.dedos;
        case "peitoPeFrente": return lerpP(esq.pf.A, esq.pf.dedos, 0.45);
        case "calcanharFrente": return esq.pf.calcanhar;
        case "calcanharTras": return esq.pt.calcanhar;
        default: return esq.bf.punho;
    }
}

// ===========================================================================
// Desenho
// ===========================================================================

const CONTORNO = "#21140d";
const LARGURA_CONTORNO = 0.013; // m
const LUZ = { x: 0.45, y: 0.89 }; // luz vem de cima e da frente

/** Escurece (f<1) ou clareia (f>1) uma cor #rrggbb; devolve #rrggbb. */
export function tom(hex, f) {
    const n = parseInt(hex.slice(1, 7), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0");
    return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

/**
 * Cápsula com volume muscular: de A (raio ra) a B (raio rb), com o ventre
 * (raio rm) a 40% do comprimento, deslocado para o lado "frente" (+n) ou
 * "trás" (-n) com assimetria (ex.: gémeo atrás da canela). Devolve pontos.
 */
function capsula(a, b, ra, rb, rm = (ra + rb) / 2, assimetria = 0, { retoA = false, retoB = false } = {}) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1e-6;
    const u = { x: dx / L, y: dy / L };
    const n = { x: -u.y, y: u.x };
    const pts = [];
    const lado = (s) => {
        const amostras = s > 0 ? [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] : [1, 0.9, 0.75, 0.6, 0.45, 0.3, 0.15, 0];
        for (const t of amostras) {
            // perfil: interpolação suave ra → rm → rb
            const base = t < 0.4 ? ra + (rm - ra) * Math.sin((t / 0.4) * Math.PI / 2) : rm + (rb - rm) * (1 - Math.cos(((t - 0.4) / 0.6) * Math.PI / 2));
            const r = base * (1 + s * assimetria * Math.sin(t * Math.PI));
            pts.push({ x: a.x + dx * t + n.x * r * s, y: a.y + dy * t + n.y * r * s });
        }
    };
    lado(1);
    for (let i = 1; i < 10 && !retoB; i += 1) {
        const t = (i / 10) * Math.PI; // tampa em B: +n → u → -n
        pts.push({ x: b.x + rb * (n.x * Math.cos(t) + u.x * Math.sin(t)), y: b.y + rb * (n.y * Math.cos(t) + u.y * Math.sin(t)) });
    }
    lado(-1);
    for (let i = 1; i < 10 && !retoA; i += 1) {
        const t = (i / 10) * Math.PI; // tampa em A: -n → -u → +n
        pts.push({ x: a.x - ra * (n.x * Math.cos(t) + u.x * Math.sin(t)), y: a.y - ra * (n.y * Math.cos(t) + u.y * Math.sin(t)) });
    }
    return pts;
}

function unit(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1e-6;
    return { x: dx / L, y: dy / L };
}

/** Converte pontos locais (frente, cima) de um referencial para o mundo. */
function local(origem, frente, cima, lista) {
    return lista.map(([f, c]) => ({ x: origem.x + frente.x * f + cima.x * c, y: origem.y + frente.y * f + cima.y * c }));
}

// Perfil do tronco ao longo da coluna (t: 0 = anca, 1 = base do pescoço).
// f = barriga/peito, b = costas/glúteos (de perfil), w = meia largura (de frente).
// Os ombros (deltoides) não entram aqui: são a "cintura escapular", à parte.
const PERFIL_TRONCO = [
    { t: -0.14, f: 0.08, b: 0.1, w: 0.15 },
    { t: -0.02, f: 0.095, b: 0.125, w: 0.165 },
    { t: 0.14, f: 0.09, b: 0.108, w: 0.15 },
    { t: 0.3, f: 0.088, b: 0.09, w: 0.14 },
    { t: 0.46, f: 0.094, b: 0.088, w: 0.146 },
    { t: 0.6, f: 0.108, b: 0.096, w: 0.152 },
    { t: 0.72, f: 0.128, b: 0.106, w: 0.162 },
    { t: 0.84, f: 0.124, b: 0.112, w: 0.17 },
    { t: 0.94, f: 0.092, b: 0.1, w: 0.15 },
    { t: 1.02, f: 0.055, b: 0.068, w: 0.09 },
];

// A torção entre a anca e os ombros distribui-se pela cintura.
function rotacaoEm(esq, t) {
    const k = Math.max(0, Math.min(1, (t - 0.05) / 0.6));
    return esq.rotAnca + (esq.rotOmbros - esq.rotAnca) * k * k * (3 - 2 * k);
}

// Projeção de uma elipse (meia largura w, meia profundidade d) rodada em profundidade.
const projetar = (w, d, rot) => Math.hypot(w * Math.sin(rot * RAD), d * Math.cos(rot * RAD));

function troncoPts(esq, tMin = -1, tMax = 2, folga = 0) {
    const frente = [];
    const tras = [];
    for (const n of PERFIL_TRONCO) {
        if (n.t < tMin - 1e-6 || n.t > tMax + 1e-6) continue;
        const rot = rotacaoEm(esq, n.t);
        const base = soma(esq.P, vezes(esq.cima, MEDIDAS.tronco * n.t));
        frente.push(soma(base, vezes(esq.frente, projetar(n.w, n.f, rot) + folga)));
        tras.unshift(soma(base, vezes(esq.frente, -(projetar(n.w, n.b, rot) + folga))));
    }
    return [...frente, ...tras];
}

function troncoLargura(esq, t) {
    let i = 0;
    while (i < PERFIL_TRONCO.length - 2 && PERFIL_TRONCO[i + 1].t < t) i += 1;
    const a = PERFIL_TRONCO[i];
    const b = PERFIL_TRONCO[i + 1];
    const k = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
    const L = (x, y) => x + (y - x) * k;
    const rot = rotacaoEm(esq, t);
    return { f: projetar(L(a.w, b.w), L(a.f, b.f), rot), b: projetar(L(a.w, b.w), L(a.b, b.b), rot) };
}

const RAIO_OMBRO = 0.066;

/** Cintura escapular: cápsula entre os dois ombros (os deltoides). */
function ombrosPts(esq, folga = 0) {
    const baixo = vezes(esq.cima, -0.022);
    return capsula(soma(esq.ST, baixo), soma(esq.SF, baixo), RAIO_OMBRO + folga, RAIO_OMBRO + folga);
}

// Perfil da cabeça (virada para a frente): [frente, cima] em metros.
const PERFIL_CABECA = [
    [-0.1, 0.0], [-0.097, 0.06], [-0.058, 0.106], [0.0, 0.123], [0.056, 0.106], [0.086, 0.062],
    [0.095, 0.024], [0.1, 0.006], [0.12, -0.022], [0.1, -0.036], [0.104, -0.05], [0.097, -0.066],
    [0.092, -0.09], [0.062, -0.104], [0.022, -0.098], [-0.03, -0.078], [-0.07, -0.056], [-0.096, -0.03],
];

const CABELOS = {
    curto: [[-0.105, -0.01], [-0.102, 0.066], [-0.061, 0.116], [0.0, 0.133], [0.059, 0.116], [0.089, 0.07], [0.076, 0.06], [0.03, 0.086], [-0.03, 0.08], [-0.07, 0.04], [-0.08, -0.01]],
    rapado: [[-0.103, 0.0], [-0.098, 0.063], [-0.058, 0.11], [0.0, 0.127], [0.057, 0.109], [0.083, 0.068], [0.07, 0.07], [0.0, 0.1], [-0.06, 0.08], [-0.085, 0.01]],
    farto: [[-0.112, -0.045], [-0.11, 0.07], [-0.066, 0.127], [0.0, 0.144], [0.066, 0.122], [0.101, 0.06], [0.081, 0.055], [0.06, 0.083], [0.0, 0.09], [-0.06, 0.06], [-0.076, -0.025]],
};

function referencialCabeca(esq) {
    const a = esq.cabecaAng * RAD;
    // fh: a cabeça pode estar virada para o outro lado do corpo (olhar)
    const fh = esq.fh ?? 1;
    return { c: esq.cabeca, frente: { x: Math.cos(a) * fh, y: -Math.sin(a) }, cima: { x: Math.sin(a) * fh, y: Math.cos(a) } };
}

// ---------------------------------------------------------------------------
// Construção das formas: { pts, cor (#hex), eixo?: [a, b], raio?, suave?, tronco? }
// eixo/raio dão o sombreado de volume (gradiente perpendicular ao osso).
// ---------------------------------------------------------------------------

function forma(pts, cor, extra = {}) {
    return { pts, cor, ...extra };
}

function formasBraco(b, ap, lado) {
    const escuro = lado === "tras";
    const pele = escuro ? ap.peleSombra : ap.pele;
    const d = unit(b.W, b.punho);
    const f = [];
    if (ap.dobok) {
        const pano = escuro ? ap.dobokSombra : ap.dobok;
        f.push(forma(capsula(b.S, b.E, 0.068, 0.056, 0.068), pano, { eixo: [b.S, b.E], raio: 0.068 }));
        const fimManga = lerpP(b.E, b.W, 0.86);
        f.push(forma(capsula(b.E, fimManga, 0.056, 0.052, 0.057, 0, { retoB: true }), pano, { eixo: [b.E, b.W], raio: 0.056 }));
        f.push(forma(capsula(fimManga, b.W, 0.032, 0.029), pele, { eixo: [b.E, b.W], raio: 0.032 }));
    } else {
        // deltoide + bíceps/tríceps; antebraço mais largo junto ao cotovelo
        f.push(forma(capsula(b.S, b.E, 0.06, 0.041, 0.058, 0.07), pele, { eixo: [b.S, b.E], raio: 0.058 }));
        f.push(forma(capsula(b.E, b.W, 0.043, 0.031, 0.048, 0.05), pele, { eixo: [b.E, b.W], raio: 0.046 }));
    }
    if (ap.luvas) {
        const cor = escuro ? ap.luvasSombra : ap.luvas;
        // punho de ligadura/elástico e luva oval (mais comprida que alta)
        f.push(forma(capsula(lerpP(b.E, b.W, 0.8), soma(b.W, vezes(d, 0.02)), 0.044, 0.05, 0.048), escuro ? tom(ap.punho, 0.78) : ap.punho, { eixo: [b.E, b.W], raio: 0.05 }));
        f.push(forma(capsula(soma(b.W, vezes(d, 0.035)), soma(b.W, vezes(d, 0.09)), 0.064, 0.068, 0.073), cor, { eixo: [b.W, b.punho], raio: 0.072, luva: true }));
    } else {
        f.push(forma(capsula(soma(b.W, vezes(d, 0.012)), soma(b.W, vezes(d, 0.062)), 0.036, 0.04, 0.042), pele, { eixo: [b.W, b.punho], raio: 0.04 }));
    }
    return f;
}

function formasPerna(pn, ap, lado) {
    const escuro = lado === "tras";
    const pele = escuro ? ap.peleSombra : ap.pele;
    const f = [];
    const pe = (cor, ra, rb) => forma(capsula(pn.calcanhar, pn.dedos, ra, rb, (ra + rb) / 2 + 0.004), cor, { eixo: [pn.calcanhar, pn.dedos], raio: ra });
    if (ap.dobok) {
        const pano = escuro ? ap.dobokSombra : ap.dobok;
        f.push(forma(capsula(pn.H, pn.K, 0.104, 0.072, 0.1), pano, { eixo: [pn.H, pn.K], raio: 0.1 }));
        f.push(forma(capsula(pn.K, lerpP(pn.K, pn.A, 1.02), 0.072, 0.064, 0.07, 0, { retoB: true }), pano, { eixo: [pn.K, pn.A], raio: 0.07 }));
        f.push(pe(pele, 0.04, 0.027));
        return f;
    }
    // coxa (quadricípite à frente) e perna (gémeo atrás)
    f.push(forma(capsula(pn.H, pn.K, 0.092, 0.056, 0.09, 0.06), pele, { eixo: [pn.H, pn.K], raio: 0.09 }));
    f.push(forma(capsula(pn.K, pn.A, 0.055, 0.034, 0.059, -0.12), pele, { eixo: [pn.K, pn.A], raio: 0.056 }));
    if (ap.botas) {
        const cor = escuro ? ap.botasSombra : ap.botas;
        f.push(forma(capsula(lerpP(pn.K, pn.A, 0.6), pn.A, 0.049, 0.045, 0.049, 0, { retoA: true }), cor, { eixo: [pn.K, pn.A], raio: 0.049 }));
        f.push(pe(cor, 0.046, 0.034));
    } else {
        if (ap.tornozeleira) {
            const cor = escuro ? tom(ap.tornozeleira, 0.8) : ap.tornozeleira;
            f.push(forma(capsula(lerpP(pn.K, pn.A, 0.8), lerpP(pn.K, pn.A, 1.0), 0.043, 0.043, 0.043, 0, { retoA: true, retoB: true }), cor, { eixo: [pn.K, pn.A], raio: 0.043 }));
        }
        f.push(pe(pele, 0.04, 0.026));
    }
    // calções: manga na coxa
    if (ap.calcoes) {
        const cor = escuro ? ap.calcoesSombra : ap.calcoes;
        const fim = lerpP(pn.H, pn.K, ap.comprimentoCalcoes);
        f.push(forma(capsula(pn.H, fim, 0.104, ap.bocaCalcoes, 0.106, 0, { retoB: true }), cor, { eixo: [pn.H, pn.K], raio: 0.105 }));
    }
    return f;
}

function formaOmbros(esq, ap, folga = 0) {
    const cor = ap.dobok || ap.pele;
    return forma(ombrosPts(esq, folga), cor, { tronco: true });
}

function formasTronco(esq, ap) {
    const f = [];
    const corTronco = ap.dobok || ap.pele;
    // pescoço (entra no tronco e na cabeça para não haver juntas)
    const dirPescoco = unit(esq.C, esq.N);
    f.push(forma(capsula(soma(esq.C, vezes(dirPescoco, -0.04)), soma(esq.N, vezes(dirPescoco, 0.05)), 0.062, 0.054), ap.pele, { eixo: [esq.C, esq.N], raio: 0.06 }));
    f.push(forma(troncoPts(esq), corTronco, { suave: true, tronco: true }));
    f.push(formaOmbros(esq, ap));
    if (ap.calcoes) f.push(forma(troncoPts(esq, -0.14, 0.16, 0.012), ap.calcoes, { suave: true, tronco: true }));
    return f;
}

function formasCabeca(esq, ap) {
    const { c, frente, cima } = referencialCabeca(esq);
    const f = [forma(local(c, frente, cima, PERFIL_CABECA), ap.pele, { suave: true, cabeca: true })];
    if (ap.cabelo) f.push(forma(local(c, frente, cima, CABELOS[ap.cortecabelo || "curto"]), ap.cabelo, { suave: true }));
    return f;
}

// ---------------------------------------------------------------------------
// Pintura
// ---------------------------------------------------------------------------

function caminho(ctx, v, pts, suave) {
    const p = pts.map((q) => ({ x: v.X(q.x), y: v.Y(q.y) }));
    ctx.beginPath();
    if (!suave) {
        p.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    } else {
        const meio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        const ini = meio(p[p.length - 1], p[0]);
        ctx.moveTo(ini.x, ini.y);
        for (let i = 0; i < p.length; i += 1) {
            const m = meio(p[i], p[(i + 1) % p.length]);
            ctx.quadraticCurveTo(p[i].x, p[i].y, m.x, m.y);
        }
    }
    ctx.closePath();
}

/** Preenchimento com volume: claro do lado da luz, escuro do outro. */
function tinta(ctx, v, f, esq) {
    if (f.tronco && esq) {
        const a = soma(esq.C, vezes(esq.frente, 0.2));
        const b = soma(esq.C, vezes(esq.frente, -0.2));
        const g = ctx.createLinearGradient(v.X(a.x), v.Y(a.y), v.X(b.x), v.Y(b.y));
        g.addColorStop(0, tom(f.cor, 1.1));
        g.addColorStop(0.5, f.cor);
        g.addColorStop(1, tom(f.cor, 0.76));
        return g;
    }
    if (f.cabeca) {
        const [q] = f.pts;
        const c = f.pts.reduce((acc, p) => ({ x: acc.x + p.x / f.pts.length, y: acc.y + p.y / f.pts.length }), { x: 0, y: 0 });
        const g = ctx.createRadialGradient(v.X(c.x + 0.04), v.Y(c.y + 0.05), 0, v.X(c.x), v.Y(c.y), Math.hypot(q.x - c.x, q.y - c.y) * v.ppm * 1.1);
        g.addColorStop(0, tom(f.cor, 1.1));
        g.addColorStop(0.6, f.cor);
        g.addColorStop(1, tom(f.cor, 0.8));
        return g;
    }
    if (!f.eixo) return f.cor;
    const [a, b] = f.eixo;
    const m = lerpP(a, b, 0.4);
    const u = unit(a, b);
    let n = { x: -u.y, y: u.x };
    if (n.x * LUZ.x + n.y * LUZ.y < 0) n = { x: -n.x, y: -n.y };
    const r = f.raio || 0.05;
    const p0 = soma(m, vezes(n, r));
    const p1 = soma(m, vezes(n, -r));
    const g = ctx.createLinearGradient(v.X(p0.x), v.Y(p0.y), v.X(p1.x), v.Y(p1.y));
    g.addColorStop(0, tom(f.cor, f.luva ? 1.25 : 1.14));
    g.addColorStop(0.42, f.cor);
    g.addColorStop(1, tom(f.cor, 0.74));
    return g;
}

/**
 * Desenha um grupo de formas como uma só silhueta: primeiro o contorno de
 * todas (engordado), depois o preenchimento de cada uma pela ordem. Assim só
 * fica contorno à volta do grupo, não entre formas sobrepostas.
 */
function desenharGrupo(ctx, v, formas, esq) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = CONTORNO;
    ctx.fillStyle = CONTORNO;
    ctx.lineWidth = LARGURA_CONTORNO * 2 * v.ppm;
    for (const f of formas) {
        caminho(ctx, v, f.pts, f.suave);
        ctx.stroke();
        ctx.fill();
    }
    preencher(ctx, v, formas, esq);
    ctx.restore();
}

function preencher(ctx, v, formas, esq) {
    for (const f of formas) {
        caminho(ctx, v, f.pts, f.suave);
        ctx.fillStyle = tinta(ctx, v, f, esq);
        ctx.fill();
    }
}

/**
 * Membro que passa à frente do corpo: tem contorno próprio (está à frente),
 * mas na zona de ligação (ombro ou anca) volta a pintar-se o corpo e o membro
 * sem contorno, para o membro "sair" do corpo sem costura.
 */
function desenharMembroLigado(ctx, v, formas, ligacao, zona, corpo, esq) {
    desenharGrupo(ctx, v, formas, esq);
    ctx.save();
    caminho(ctx, v, zona, true);
    ctx.clip();
    preencher(ctx, v, corpo, esq);
    preencher(ctx, v, ligacao, esq);
    ctx.restore();
}

function linha(ctx, v, a, b, cor, largura) {
    ctx.strokeStyle = cor;
    ctx.lineWidth = largura * v.ppm;
    ctx.beginPath();
    ctx.moveTo(v.X(a.x), v.Y(a.y));
    ctx.lineTo(v.X(b.x), v.Y(b.y));
    ctx.stroke();
}

function curva(ctx, v, a, c, b) {
    ctx.beginPath();
    ctx.moveTo(v.X(a.x), v.Y(a.y));
    ctx.quadraticCurveTo(v.X(c.x), v.Y(c.y), v.X(b.x), v.Y(b.y));
    ctx.stroke();
}

function pontoTronco(esq, t, lado) {
    // lado: fração da largura projetada (+ frente, − costas)
    const l = troncoLargura(esq, t);
    const base = soma(esq.P, vezes(esq.cima, MEDIDAS.tronco * t));
    return soma(base, vezes(esq.frente, lado >= 0 ? l.f * lado : l.b * lado));
}

/** completo = false: só o cós/cinto (volta a desenhar-se por cima de uma perna). */
function detalhesCorpo(ctx, v, esq, ap, completo = true) {
    ctx.save();
    ctx.lineCap = "round";
    if (!ap.dobok && completo) {
        // musculatura (traço leve): peitoral, linha alba e umbigo
        ctx.strokeStyle = "rgba(60,30,15,0.28)";
        ctx.lineWidth = Math.max(1, 0.008 * v.ppm);
        curva(ctx, v, pontoTronco(esq, 0.66, 0.98), pontoTronco(esq, 0.6, 0.55), pontoTronco(esq, 0.7, 0.05));
        ctx.strokeStyle = "rgba(60,30,15,0.16)";
        curva(ctx, v, pontoTronco(esq, 0.52, 0.8), pontoTronco(esq, 0.44, 0.83), pontoTronco(esq, 0.36, 0.82));
        ctx.fillStyle = "rgba(60,30,15,0.35)";
        const u = pontoTronco(esq, 0.3, 0.86);
        ctx.beginPath();
        ctx.ellipse(v.X(u.x), v.Y(u.y), 0.006 * v.ppm, 0.009 * v.ppm, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    // cós dos calções
    if (ap.calcoes) {
        const lt = troncoLargura(esq, 0.15);
        const base = soma(esq.P, vezes(esq.cima, MEDIDAS.tronco * 0.15));
        ctx.lineCap = "butt";
        linha(ctx, v, soma(base, vezes(esq.frente, lt.f + 0.014)), soma(base, vezes(esq.frente, -lt.b - 0.014)), CONTORNO, 0.058);
        linha(ctx, v, soma(base, vezes(esq.frente, lt.f + 0.008)), soma(base, vezes(esq.frente, -lt.b - 0.008)), ap.faixa, 0.04);
        // faixa lateral dos calções
        if (completo) {
            ctx.strokeStyle = "rgba(255,255,255,0.22)";
            ctx.lineWidth = 0.012 * v.ppm;
            curva(ctx, v, pontoTronco(esq, 0.12, 0.1), pontoTronco(esq, 0.0, 0.18), lerpP(esq.pf.H, esq.pf.K, ap.comprimentoCalcoes * 0.9));
        }
    }
    // dobok: gola em V, lapela e cinto com nó e pontas
    if (ap.dobok && completo) {
        const gola = soma(esq.C, vezes(esq.frente, troncoLargura(esq, 0.95).f * 0.55));
        const fundoVf = pontoTronco(esq, 0.6, 0.78);
        ctx.fillStyle = ap.pele;
        ctx.beginPath();
        const pescocoF = soma(esq.C, vezes(esq.frente, 0.02));
        ctx.moveTo(v.X(gola.x), v.Y(gola.y));
        ctx.lineTo(v.X(pescocoF.x), v.Y(pescocoF.y));
        ctx.lineTo(v.X(fundoVf.x), v.Y(fundoVf.y));
        ctx.closePath();
        ctx.fill();
        linha(ctx, v, gola, fundoVf, ap.gola, 0.024);
        // pregas do tecido
        ctx.strokeStyle = "rgba(90,85,70,0.25)";
        ctx.lineWidth = Math.max(1, 0.007 * v.ppm);
        curva(ctx, v, pontoTronco(esq, 0.5, 0.6), pontoTronco(esq, 0.38, 0.2), pontoTronco(esq, 0.3, -0.4));
        curva(ctx, v, pontoTronco(esq, 0.75, -0.2), pontoTronco(esq, 0.55, -0.5), pontoTronco(esq, 0.4, -0.7));
    }
    if (ap.dobok) {
        const cinto = soma(esq.P, vezes(esq.cima, MEDIDAS.tronco * 0.14));
        const lt = troncoLargura(esq, 0.14);
        ctx.lineCap = "butt";
        linha(ctx, v, soma(cinto, vezes(esq.frente, lt.f + 0.012)), soma(cinto, vezes(esq.frente, -lt.b - 0.012)), ap.cinto, 0.05);
        ctx.lineCap = "round";
        const no = soma(cinto, vezes(esq.frente, lt.f * 0.7));
        linha(ctx, v, no, { x: no.x + 0.035, y: no.y - 0.17 }, ap.cinto, 0.034);
        linha(ctx, v, no, { x: no.x - 0.02, y: no.y - 0.15 }, ap.cinto, 0.034);
        ctx.fillStyle = ap.cinto;
        ctx.beginPath();
        ctx.arc(v.X(no.x), v.Y(no.y), 0.028 * v.ppm, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function detalhesCabeca(ctx, v, esq, ap) {
    const { c, frente, cima } = referencialCabeca(esq);
    const [olho, orelha, sobrancelha, boca, nariz] = local(c, frente, cima, [[0.064, 0.018], [-0.018, -0.004], [0.058, 0.04], [0.088, -0.062], [0.1, -0.022]]);
    ctx.save();
    // orelha
    ctx.fillStyle = tom(ap.pele, 0.84);
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = Math.max(1, 0.007 * v.ppm);
    ctx.beginPath();
    ctx.ellipse(v.X(orelha.x), v.Y(orelha.y), 0.022 * v.ppm, 0.032 * v.ppm, -esq.cabecaAng * RAD, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // narina
    ctx.lineCap = "round";
    ctx.fillStyle = "rgba(60,30,15,0.4)";
    ctx.beginPath();
    ctx.arc(v.X(nariz.x - frente.x * 0.012), v.Y(nariz.y - frente.y * 0.012), 0.006 * v.ppm, 0, Math.PI * 2);
    ctx.fill();
    // olho, sobrancelha e boca
    ctx.fillStyle = CONTORNO;
    ctx.beginPath();
    ctx.ellipse(v.X(olho.x), v.Y(olho.y), 0.011 * v.ppm, 0.008 * v.ppm, 0, 0, Math.PI * 2);
    ctx.fill();
    linha(ctx, v, sobrancelha, soma(sobrancelha, vezes(frente, 0.032)), CONTORNO, 0.011);
    linha(ctx, v, boca, soma(boca, vezes(frente, -0.022)), "rgba(60,30,15,0.6)", 0.007);
    // mongkol (muay thai): faixa à volta da cabeça
    if (ap.mongkol) {
        const [m1, m2, m3] = local(c, frente, cima, [[0.075, 0.075], [-0.1, 0.03], [-0.16, -0.02]]);
        linha(ctx, v, m1, m2, CONTORNO, 0.05);
        linha(ctx, v, m1, m2, ap.mongkol, 0.036);
        linha(ctx, v, m2, m3, CONTORNO, 0.036);
        linha(ctx, v, m2, m3, ap.mongkol, 0.024);
        linha(ctx, v, lerpP(m1, m2, 0.3), lerpP(m1, m2, 0.55), ap.mongkolFaixa, 0.036);
    }
    ctx.restore();
}

function detalhesBraco(ctx, v, b, ap, lado) {
    ctx.save();
    if (ap.prajioud) {
        const a = lerpP(b.S, b.E, 0.45);
        const n = lerpP(b.S, b.E, 0.58);
        ctx.lineCap = "butt";
        linha(ctx, v, a, n, lado === "tras" ? tom(ap.prajioud, 0.7) : ap.prajioud, 0.125);
    }
    if (ap.luvas) {
        // costura e polegar da luva
        const d = unit(b.W, b.punho);
        const n = { x: -d.y, y: d.x };
        const c = soma(b.W, vezes(d, 0.06));
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = Math.max(1, 0.008 * v.ppm);
        ctx.lineCap = "round";
        curva(ctx, v, soma(c, vezes(n, 0.05)), soma(c, vezes(d, 0.045)), soma(c, vezes(n, -0.05)));
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        curva(ctx, v, soma(c, vezes(n, 0.045)), soma(soma(c, vezes(n, 0.06)), vezes(d, 0.05)), soma(soma(c, vezes(n, 0.03)), vezes(d, 0.09)));
    }
    ctx.restore();
}

/**
 * Desenha o lutador.
 * v = { X(x), Y(y), ppm } converte metros do mundo em píxeis.
 * ap = aparência da arte (pele, cabelo, roupa, luvas...).
 * frente = { pernaTras, bracoTras }: membros de trás que passam à frente do corpo.
 */
export function desenharLutador(ctx, v, esqBase, ap, frenteBase = {}) {
    // Giro: o desenho espelha-se em x à volta da bacia (cos do giro). De costas
    // (cos < 0) o lado que fica perto da câmara é o outro: trocam-se os papéis
    // dos membros (o de trás passa a ser desenhado à frente e mais claro).
    const k = fatorGiro(esqBase);
    let esq = esqBase;
    let frente = frenteBase;
    if (esqBase.giro) {
        const base = v;
        v = { ...v, X: (x) => base.X(esqBase.pivo + (x - esqBase.pivo) * k) };
        // a cabeça vira-se com o "olhar" (fica de frente para o alvo por cima do ombro)
        const kc = Math.cos(((esqBase.giro || 0) + (esqBase.olhar || 0)) * RAD);
        const fh = Math.abs(k) > 0.25 ? Math.max(-1.6, Math.min(1.6, kc / k)) : 1;
        esq = { ...esqBase, fh };
        if (k < 0) {
            esq = { ...esq, pf: esqBase.pt, pt: esqBase.pf, bf: esqBase.bt, bt: esqBase.bf, SF: esqBase.ST, ST: esqBase.SF };
            frente = {};
        }
    }
    // 1. lado afastado (mais escuro), escondido em parte pelo corpo
    const tras = [];
    if (!frente.pernaTras) tras.push(...formasPerna(esq.pt, ap, "tras"));
    if (!frente.bracoTras) tras.push(...formasBraco(esq.bt, ap, "tras"));
    if (tras.length) desenharGrupo(ctx, v, tras);
    if (!frente.bracoTras) detalhesBraco(ctx, v, esq.bt, ap, "tras");

    // 2. corpo: perna da frente, pescoço, tronco, ombros e cabeça (uma silhueta)
    desenharGrupo(ctx, v, [...formasPerna(esq.pf, ap, "frente"), ...formasTronco(esq, ap), ...formasCabeca(esq, ap)], esq);
    detalhesCorpo(ctx, v, esq, ap);
    detalhesCabeca(ctx, v, esq, ap);

    // 3. membros que passam à frente: contorno próprio, mas ligados sem costura
    if (frente.pernaTras) {
        const zonaAnca = troncoPts(esq, -0.14, 0.2, -LARGURA_CONTORNO * 1.2);
        const corpoAnca = [forma(troncoPts(esq), ap.dobok || ap.pele, { suave: true, tronco: true })];
        if (ap.calcoes) corpoAnca.push(forma(troncoPts(esq, -0.14, 0.16, 0.012), ap.calcoes, { suave: true, tronco: true }));
        const perna = formasPerna(esq.pt, ap, "frente");
        const ligacao = ap.calcoes ? [perna[0], perna[perna.length - 1]] : [perna[0]];
        desenharMembroLigado(ctx, v, perna, ligacao, zonaAnca, corpoAnca, esq);
        detalhesCorpo(ctx, v, esq, ap, false);
    }
    const braco = (b) => {
        const formas = formasBraco(b, ap, "frente");
        // zona de ligação: a ponta da cintura escapular do lado deste braço
        const centro = soma(b.S, vezes(esq.cima, -0.022));
        const zona = capsula(centro, centro, RAIO_OMBRO - LARGURA_CONTORNO * 1.2, RAIO_OMBRO - LARGURA_CONTORNO * 1.2);
        desenharMembroLigado(ctx, v, formas, [formas[0]], zona, [formaOmbros(esq, ap)], esq);
        detalhesBraco(ctx, v, b, ap, "frente");
    };
    braco(esq.bf);
    if (frente.bracoTras) braco(esq.bt);
}
