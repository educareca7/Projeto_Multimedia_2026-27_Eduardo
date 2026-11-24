// Artes marciais: guarda, ritmo de idle, técnicas (keyframes) e combos.
//
// Pose (metros/graus, relativa à âncora do lutador no chão):
//   px, py          posição da bacia
//   tronco, cabeca  inclinação (+ = para a frente)
//   rotOmbros       rotação dos ombros em profundidade (0 = de frente, 90 = de lado;
//                   negativo = o ombro de trás passou para a frente, ex.: direto)
//   rotAnca         idem para a anca
//   bfO, bfC        braço da frente: ângulo do ombro (0 = para baixo, 90 = para a frente) e do cotovelo
//   btO, btC        braço de trás
//   pfX, pfY, pfA   tornozelo da frente (alvo do IK) e ângulo do pé (+ = em ponta)
//   ptX, ptY, ptA   tornozelo de trás
//   bfP, btP        projeção do antebraço (1 = de lado; ~0,3 = a apontar para dentro, gancho)
//   giro, olhar     rotação do corpo inteiro / só da cabeça (golpes giratórios).
//                   Nos giros o peso fica sobre o pé de apoio (px ≈ pfX) para ele
//                   não deslizar: o eixo do giro é a bacia.
//
// Keyframe: { t (0–1), e (easing para chegar a esta chave), p (valores que mudam
// em relação à guarda) }. A chave t=0 é a pose de onde a técnica parte.
// Cada técnica tem antecipação → impacto → follow-through → recuperação.

const passo = (g, d) => {
    // Passo de boxe: o pé na direção do movimento sai primeiro e o outro segue.
    const frenteSai = d > 0;
    const peA = frenteSai ? "pf" : "pt";
    const peB = frenteSai ? "pt" : "pf";
    return {
        nome: d > 0 ? "Avançar" : "Recuar",
        duracao: 0.34,
        avanco: d,
        keys: [
            { t: 0 },
            { t: 0.3, e: "inOut", p: { [peA + "X"]: g[peA + "X"] + d * 0.5, [peA + "Y"]: g[peA + "Y"] + 0.06, px: g.px + d * 0.25 } },
            { t: 0.55, e: "outQuad", p: { [peA + "X"]: g[peA + "X"] + d, px: g.px + d * 0.62 } },
            { t: 0.8, e: "inOut", p: { [peA + "X"]: g[peA + "X"] + d, [peB + "X"]: g[peB + "X"] + d * 0.55, [peB + "Y"]: g[peB + "Y"] + 0.05, px: g.px + d * 0.88 } },
            { t: 1, e: "outQuad", p: { px: g.px + d, pfX: g.pfX + d, ptX: g.ptX + d } },
        ],
    };
};

// ---------------------------------------------------------------------------
// BOXE
// ---------------------------------------------------------------------------
const guardaBoxe = {
    px: 0, py: 0.88, tronco: 8, cabeca: 10, rotOmbros: 40, rotAnca: 30,
    bfO: 25, bfC: 125, btO: 40, btC: 122,
    pfX: 0.3, pfY: 0.08, pfA: 0, ptX: -0.3, ptY: 0.11, ptA: 25,
};

const boxe = {
    id: "boxe",
    nome: "Boxe",
    descricao: "Só punhos. Guarda alta, queixo baixo e muito trabalho de pés.",
    cor: "#22e8ff",
    // Aparência: calções e botas de boxe, luvas vermelhas.
    aparencia: {
        pele: "#a06c47", peleSombra: "#7c5034", cabelo: "#1a120c", cortecabelo: "curto",
        calcoes: "#2747a3", calcoesSombra: "#1b3278", faixa: "#f2f2f2", comprimentoCalcoes: 0.5, bocaCalcoes: 0.086,
        luvas: "#c0392b", luvasSombra: "#8e2a20", punho: "#f3f3f3", botas: "#1d1d1f", botasSombra: "#111113",
    },
    guarda: guardaBoxe,
    // Ritmo: saltitar leve nas pontas dos pés + respiração.
    idle: (t) => ({
        py: 0.011 * Math.sin(t * 2 * Math.PI * 1.7) + 0.004 * Math.sin(t * 2 * Math.PI * 0.3),
        bfO: 2.5 * Math.sin(t * 2 * Math.PI * 1.7 + 0.6),
        btO: 1.5 * Math.sin(t * 2 * Math.PI * 1.7 + 1.2),
        tronco: 1.2 * Math.sin(t * 2 * Math.PI * 0.85),
        rotOmbros: 2 * Math.sin(t * 2 * Math.PI * 0.85),
    }),
    tecnicas: {
        jab: {
            nome: "Jab", tecla: "Z", categoria: "soco", efetor: "maoFrente",
            descricao: "Soco rápido e direto com a mão da frente.",
            duracao: 0.42, impacto: 0.38,
            keys: [
                { t: 0 },
                { t: 0.16, e: "inOut", p: { bfO: 18, bfC: 135, rotOmbros: 34, px: -0.02, py: 0.87 } },
                { t: 0.38, e: "snap", p: { bfO: 80, bfC: 2, rotOmbros: 55, rotAnca: 34, tronco: 12, px: 0.05, pfX: 0.34, cabeca: 14 } },
                { t: 0.5, e: "outQuad", p: { bfO: 83, bfC: 0, rotOmbros: 57, rotAnca: 34, tronco: 13, px: 0.06, pfX: 0.34, cabeca: 14 } },
                { t: 0.78, e: "inOut", p: { bfO: 35, bfC: 110, rotOmbros: 42, px: 0.01, pfX: 0.31 } },
                { t: 1, e: "outQuad" },
            ],
        },
        direto: {
            nome: "Direto", tecla: "X", categoria: "soco", efetor: "maoTras",
            descricao: "O soco mais forte: a anca e o ombro de trás rodam para a frente.",
            duracao: 0.5, impacto: 0.4, frente: { bracoTras: [0.24, 0.7] },
            keys: [
                { t: 0 },
                { t: 0.18, e: "inOut", p: { rotOmbros: 48, rotAnca: 36, px: -0.03, py: 0.86, tronco: 6, btO: 10, btC: 152 } },
                { t: 0.4, e: "snap", p: { rotOmbros: -28, rotAnca: -12, tronco: 14, cabeca: 14, px: 0.09, py: 0.89, btO: 80, btC: 2, bfO: 12, bfC: 150, ptA: 40, ptY: 0.13, ptX: -0.25 } },
                { t: 0.52, e: "outQuad", p: { rotOmbros: -32, rotAnca: -14, tronco: 15, cabeca: 14, px: 0.1, py: 0.89, btO: 83, btC: 0, bfO: 12, bfC: 150, ptA: 42, ptY: 0.13, ptX: -0.25 } },
                { t: 0.8, e: "inOut", p: { rotOmbros: 20, rotAnca: 20, px: 0.03, btO: 25, btC: 120, ptA: 30 } },
                { t: 1, e: "outQuad" },
            ],
        },
        gancho: {
            nome: "Gancho", tecla: "C", categoria: "soco", efetor: "maoFrente",
            descricao: "Cotovelo à altura do ombro e braço dobrado a 90°: a anca e o pé da frente rodam e o punho atravessa na horizontal.",
            duracao: 0.55, impacto: 0.42,
            keys: [
                { t: 0 },
                // carrega: abre ligeiramente o tronco e baixa o peso sobre a perna da frente
                { t: 0.2, e: "inOut", p: { rotOmbros: 54, rotAnca: 42, py: 0.85, px: 0.03, tronco: 12, cabeca: 14, bfO: 40, bfC: 100, pfA: -4 } },
                // impacto: cotovelo em cima, antebraço a apontar para dentro (encurtado)
                { t: 0.42, e: "snap", p: { rotOmbros: -18, rotAnca: 2, py: 0.87, px: 0.07, tronco: 9, cabeca: 16, bfO: 88, bfC: 12, bfP: 0.32, bfQ: 0.72, pfA: -10, ptA: 30 } },
                { t: 0.55, e: "outQuad", p: { rotOmbros: -24, rotAnca: -2, py: 0.87, px: 0.07, tronco: 9, cabeca: 16, bfO: 86, bfC: 14, bfP: 0.3, bfQ: 0.72, pfA: -10, ptA: 30 } },
                { t: 0.8, e: "inOut", p: { rotOmbros: 28, rotAnca: 22, bfO: 40, bfC: 110, bfP: 0.85, bfQ: 0.95 } },
                { t: 1, e: "outQuad" },
            ],
        },
        uppercut: {
            nome: "Uppercut", tecla: "V", categoria: "soco", efetor: "maoTras",
            descricao: "Baixa o peso e sobe de pernas: o punho de trás sobe na vertical, cotovelo por baixo, até ao queixo.",
            duracao: 0.55, impacto: 0.42, frente: { bracoTras: [0.24, 0.72] },
            keys: [
                { t: 0 },
                // carrega: dobra os joelhos e inclina-se, punho junto às costelas
                { t: 0.2, e: "inOut", p: { py: 0.79, tronco: 16, cabeca: 16, rotOmbros: 32, rotAnca: 24, btO: 22, btC: 118, px: -0.02, bfO: 22, bfC: 135 } },
                // impacto: pernas e anca empurram, antebraço vertical, calcanhar de trás no ar
                { t: 0.42, e: "snap", p: { py: 0.92, tronco: 1, cabeca: 10, rotOmbros: -26, rotAnca: -16, btO: 56, btC: 117, px: 0.07, ptA: 40, ptY: 0.13, ptX: -0.26, bfO: 20, bfC: 145 } },
                { t: 0.55, e: "outQuad", p: { py: 0.93, tronco: 0, cabeca: 10, rotOmbros: -28, rotAnca: -18, btO: 58, btC: 116, px: 0.07, ptA: 40, ptY: 0.13, ptX: -0.26, bfO: 20, bfC: 145 } },
                { t: 0.82, e: "inOut", p: { py: 0.88, rotOmbros: 18, rotAnca: 16, btO: 35, btC: 125, px: 0.02 } },
                { t: 1, e: "outQuad" },
            ],
        },
        ganchoCorpo: {
            nome: "Gancho ao corpo", tecla: "B", categoria: "soco", efetor: "maoFrente",
            descricao: "Dobra os joelhos e roda a anca: o gancho entra por baixo, à altura das costelas.",
            duracao: 0.58, impacto: 0.44,
            keys: [
                { t: 0 },
                { t: 0.2, e: "inOut", p: { py: 0.8, tronco: 16, cabeca: 14, rotOmbros: 52, rotAnca: 40, bfO: 28, bfC: 110, px: 0.02 } },
                { t: 0.44, e: "snap", p: { py: 0.76, tronco: 20, cabeca: 18, rotOmbros: -12, rotAnca: 0, px: 0.06, pfX: 0.34, bfO: 62, bfC: 40, bfP: 0.45, bfQ: 0.8, ptA: 32 } },
                { t: 0.56, e: "outQuad", p: { py: 0.76, tronco: 20, cabeca: 18, rotOmbros: -16, rotAnca: -2, px: 0.06, pfX: 0.34, bfO: 62, bfC: 42, bfP: 0.42, bfQ: 0.8, ptA: 32 } },
                { t: 0.8, e: "inOut", p: { py: 0.84, tronco: 12, rotOmbros: 25, bfO: 35, bfC: 115, bfP: 0.85 } },
                { t: 1, e: "outQuad" },
            ],
        },
        esquiva: {
            nome: "Esquiva", tecla: "Q", categoria: "defesa",
            descricao: "Desvia a cabeça para fora da linha do soco, com as mãos sempre em guarda.",
            duracao: 0.45,
            keys: [
                { t: 0 },
                { t: 0.35, e: "out", p: { tronco: 24, cabeca: 20, rotOmbros: 68, rotAnca: 45, py: 0.82, px: 0.04, bfO: 20, bfC: 135, btO: 38, btC: 125 } },
                { t: 0.6, e: "inOut", p: { tronco: 22, cabeca: 18, rotOmbros: 64, rotAnca: 42, py: 0.83, px: 0.04, bfO: 22, bfC: 132, btO: 38, btC: 125 } },
                { t: 1, e: "inOut" },
            ],
        },
        pendulo: {
            nome: "Pêndulo", tecla: "W", categoria: "defesa",
            descricao: "Passa por baixo do golpe em «U»: dobra os joelhos, desce e sobe do outro lado.",
            duracao: 0.7,
            keys: [
                { t: 0 },
                { t: 0.3, e: "inOut", p: { py: 0.71, tronco: 30, cabeca: 24, rotOmbros: 70, rotAnca: 48, px: 0.02, bfO: 18, bfC: 138, btO: 36, btC: 128 } },
                { t: 0.55, e: "inOut", p: { py: 0.73, tronco: 28, cabeca: 22, rotOmbros: 14, rotAnca: 10, px: 0.05, bfO: 22, bfC: 134, btO: 38, btC: 125 } },
                { t: 1, e: "inOut" },
            ],
        },
    },
    combos: [
        { nome: "1-2", tecla: "1", sequencia: ["jab", "direto"] },
        { nome: "1-2-3", tecla: "2", sequencia: ["jab", "direto", "gancho"] },
        { nome: "Gancho + Uppercut", tecla: "3", sequencia: ["gancho", "uppercut"] },
        { nome: "Esquiva + Direto", tecla: "4", sequencia: ["esquiva", "direto"] },
        { nome: "Corpo + Cabeça", tecla: "5", sequencia: ["ganchoCorpo", "gancho"] },
        { nome: "Pêndulo + 3-2", tecla: "6", sequencia: ["pendulo", "gancho", "direto"] },
    ],
};

// ---------------------------------------------------------------------------
// MUAY THAI
// ---------------------------------------------------------------------------
const guardaMuayThai = {
    px: 0, py: 0.91, tronco: 2, cabeca: 6, rotOmbros: 18, rotAnca: 12,
    bfO: 35, bfC: 128, btO: 28, btC: 138,
    pfX: 0.24, pfY: 0.1, pfA: 14, ptX: -0.24, ptY: 0.11, ptA: 26,
};

const muayThai = {
    id: "muaythai",
    nome: "Muay Thai",
    descricao: "A arte das oito armas: punhos, cotovelos, joelhos e canelas.",
    cor: "#ff2bd6",
    // Aparência: calções tailandeses curtos, luvas azuis, mongkol, prajioud e tornozeleiras.
    aparencia: {
        pele: "#c88a55", peleSombra: "#9c663c", cabelo: "#151515", cortecabelo: "rapado",
        calcoes: "#c62828", calcoesSombra: "#8f1d1d", faixa: "#f2c14e", comprimentoCalcoes: 0.36, bocaCalcoes: 0.102,
        luvas: "#1f4fbf", luvasSombra: "#173a8c", punho: "#f3f3f3",
        mongkol: "#f4efe6", mongkolFaixa: "#c62828", prajioud: "#c62828", tornozeleira: "#2a2a2a",
    },
    guarda: guardaMuayThai,
    // Ritmo: balanço para a frente e para trás, a marcar o tempo com o pé da frente.
    idle: (t) => {
        const f = t * 2 * Math.PI * 0.75;
        return {
            px: 0.025 * Math.sin(f),
            tronco: 2 * Math.sin(f),
            pfY: 0.025 * Math.max(0, Math.sin(f + 0.8)),
            py: 0.004 * Math.sin(t * 2 * Math.PI * 0.3),
            bfO: 2 * Math.sin(f + 0.4),
        };
    },
    tecnicas: {
        jab: {
            nome: "Jab", tecla: "Z", categoria: "soco", efetor: "maoFrente",
            descricao: "Soco rápido com a mão da frente para abrir caminho.",
            duracao: 0.42, impacto: 0.38,
            keys: [
                { t: 0 },
                { t: 0.16, e: "inOut", p: { bfO: 28, bfC: 135, rotOmbros: 12, px: -0.02 } },
                { t: 0.38, e: "snap", p: { bfO: 85, bfC: 2, rotOmbros: 40, rotAnca: 18, tronco: 8, px: 0.05, pfX: 0.28 } },
                { t: 0.5, e: "outQuad", p: { bfO: 87, bfC: 0, rotOmbros: 42, rotAnca: 18, tronco: 9, px: 0.06, pfX: 0.28 } },
                { t: 0.78, e: "inOut", p: { bfO: 45, bfC: 110, rotOmbros: 22, px: 0.01 } },
                { t: 1, e: "outQuad" },
            ],
        },
        direto: {
            nome: "Direto", tecla: "X", categoria: "soco", efetor: "maoTras",
            descricao: "Soco de trás com rotação total da anca.",
            duracao: 0.5, impacto: 0.4, frente: { bracoTras: [0.24, 0.7] },
            keys: [
                { t: 0 },
                { t: 0.18, e: "inOut", p: { rotOmbros: 30, rotAnca: 22, px: -0.03, py: 0.89 } },
                { t: 0.4, e: "snap", p: { rotOmbros: -35, rotAnca: -18, tronco: 10, px: 0.08, btO: 84, btC: 2, bfO: 22, bfC: 145, ptA: 42, ptY: 0.13 } },
                { t: 0.52, e: "outQuad", p: { rotOmbros: -38, rotAnca: -20, tronco: 11, px: 0.09, btO: 86, btC: 0, bfO: 22, bfC: 145, ptA: 42, ptY: 0.13 } },
                { t: 0.8, e: "inOut", p: { rotOmbros: 8, rotAnca: 6, px: 0.03, btO: 35, btC: 120 } },
                { t: 1, e: "outQuad" },
            ],
        },
        cotovelo: {
            nome: "Cotovelada", tecla: "C", categoria: "cotovelo", efetor: "cotoveloTras",
            descricao: "Cotovelo de trás na horizontal, curto e devastador.",
            duracao: 0.55, impacto: 0.42, frente: { bracoTras: [0.24, 0.72] },
            keys: [
                { t: 0 },
                { t: 0.2, e: "inOut", p: { rotOmbros: 34, rotAnca: 24, py: 0.88, btO: 55, btC: 150, px: -0.01 } },
                { t: 0.42, e: "snap", p: { rotOmbros: -45, rotAnca: -22, tronco: 10, cabeca: 10, px: 0.07, btO: 98, btC: 160, bfO: 30, bfC: 140, ptA: 40, ptY: 0.13 } },
                { t: 0.55, e: "outQuad", p: { rotOmbros: -50, rotAnca: -24, tronco: 11, cabeca: 10, px: 0.08, btO: 100, btC: 160, bfO: 30, bfC: 140, ptA: 40, ptY: 0.13 } },
                { t: 0.82, e: "inOut", p: { rotOmbros: 5, btO: 45, btC: 140 } },
                { t: 1, e: "outQuad" },
            ],
        },
        joelhada: {
            nome: "Joelhada", tecla: "V", categoria: "joelho", efetor: "joelhoTras",
            descricao: "Agarra, puxa e sobe o joelho de trás com a anca para a frente.",
            duracao: 0.7, impacto: 0.45, frente: { pernaTras: [0.18, 0.84] },
            keys: [
                { t: 0 },
                { t: 0.18, e: "inOut", p: { bfO: 70, bfC: 35, btO: 70, btC: 35, rotOmbros: 10, px: 0.04, tronco: 4, ptX: -0.26, ptY: 0.13, ptA: 35, rotAnca: 10 } },
                { t: 0.45, e: "snap", p: { bfO: 55, bfC: 60, btO: 55, btC: 60, rotOmbros: -10, rotAnca: -25, px: 0.12, py: 0.97, tronco: -12, cabeca: 16, pfY: 0.12, pfA: 30, ptX: 0.5, ptY: 0.72, ptA: 45 } },
                { t: 0.58, e: "outQuad", p: { bfO: 55, bfC: 60, btO: 55, btC: 60, rotOmbros: -12, rotAnca: -27, px: 0.12, py: 0.98, tronco: -13, cabeca: 16, pfY: 0.12, pfA: 30, ptX: 0.48, ptY: 0.76, ptA: 45 } },
                { t: 0.82, e: "inOut", p: { ptX: -0.15, ptY: 0.25, ptA: 30, px: 0.04, py: 0.92, rotAnca: 5, bfO: 40, bfC: 120, btO: 30, btC: 135 } },
                { t: 1, e: "outQuad" },
            ],
        },
        circular: {
            nome: "Pontapé circular", tecla: "B", categoria: "pontapé", efetor: "canelaTras",
            descricao: "A perna de trás roda como um taco, a bater com a canela; o braço balança para trás.",
            duracao: 0.85, impacto: 0.45, frente: { pernaTras: [0.22, 0.8] },
            keys: [
                { t: 0 },
                { t: 0.18, e: "inOut", p: { pfX: 0.3, pfA: 20, px: 0.04, rotAnca: 20, btO: -25, btC: 20, bfO: 40, bfC: 125, ptY: 0.12, ptA: 35 } },
                { t: 0.45, e: "snap", p: { rotAnca: -70, rotOmbros: -20, tronco: -22, cabeca: 18, px: 0.06, py: 0.96, pfX: 0.3, pfY: 0.12, pfA: 32, btO: -40, btC: 10, bfO: 45, bfC: 120, ptX: 0.98, ptY: 1.12, ptA: 40 } },
                { t: 0.6, e: "outQuad", p: { rotAnca: -78, rotOmbros: -24, tronco: -24, cabeca: 18, px: 0.06, py: 0.96, pfX: 0.3, pfY: 0.12, pfA: 32, btO: -42, btC: 10, bfO: 45, bfC: 120, ptX: 0.95, ptY: 1.04, ptA: 40 } },
                { t: 0.8, e: "inOut", p: { ptX: 0.0, ptY: 0.35, ptA: 30, rotAnca: -5, tronco: -5, px: 0.03, py: 0.92, btO: 20, btC: 120 } },
                { t: 1, e: "outQuad" },
            ],
        },
        teep: {
            nome: "Teep", tecla: "N", categoria: "pontapé", efetor: "peFrente",
            descricao: "Pontapé frontal de empurrar: o joelho sobe e a planta do pé empurra o adversário para trás.",
            duracao: 0.65, impacto: 0.45,
            keys: [
                { t: 0 },
                { t: 0.15, e: "inOut", p: { px: -0.05, tronco: -4 } },
                { t: 0.3, e: "inOut", p: { pfX: 0.3, pfY: 0.62, pfA: 10, tronco: -10, px: -0.06, rotAnca: 25 } },
                { t: 0.45, e: "snap", p: { pfX: 0.95, pfY: 0.9, pfA: -70, tronco: -18, px: 0.02, cabeca: 12, rotAnca: 30, bfO: 45, bfC: 110 } },
                { t: 0.58, e: "outQuad", p: { pfX: 0.93, pfY: 0.88, pfA: -70, tronco: -18, px: 0.02, cabeca: 12, rotAnca: 30, bfO: 45, bfC: 110 } },
                { t: 0.78, e: "inOut", p: { pfX: 0.35, pfY: 0.5, pfA: 10, tronco: -6 } },
                { t: 1, e: "outQuad" },
            ],
        },
        cotoveloGiro: {
            nome: "Cotovelada giratória", tecla: "Q", categoria: "cotovelo", efetor: "cotoveloTras",
            descricao: "O pé da frente cruza, o corpo gira de costas e o cotovelo de trás chega primeiro, a olhar por cima do ombro.",
            duracao: 0.8, impacto: 0.5,
            keys: [
                { t: 0 },
                { t: 0.2, e: "inOut", p: { px: 0.2, pfX: 0.26, ptX: -0.18, rotOmbros: 40, rotAnca: 30, tronco: 4, giro: 25, olhar: 50 } },
                { t: 0.5, e: "inOut", p: { px: 0.24, pfX: 0.26, giro: 200, olhar: 160, rotOmbros: 30, rotAnca: 20, tronco: 6, cabeca: 8, btO: -100, btC: 150, bfO: 40, bfC: 120, ptX: -0.04, ptY: 0.16, ptA: 30 } },
                { t: 0.6, e: "outQuad", p: { px: 0.24, pfX: 0.26, giro: 214, olhar: 150, rotOmbros: 30, rotAnca: 20, tronco: 6, cabeca: 8, btO: -102, btC: 150, bfO: 40, bfC: 120, ptX: -0.04, ptY: 0.16, ptA: 30 } },
                { t: 0.85, e: "inOut", p: { px: 0.1, giro: 330, olhar: 345, btO: 30, btC: 130, ptX: -0.2 } },
                { t: 1, e: "outQuad", p: { giro: 360, olhar: 360 } },
            ],
        },
        giratorio: {
            nome: "Pontapé giratório", tecla: "W", categoria: "pontapé", efetor: "calcanharTras",
            descricao: "Gira de costas sobre o pé da frente e dá um coice com o calcanhar de trás, a olhar por cima do ombro.",
            duracao: 0.9, impacto: 0.5, frente: { pernaTras: [0.3, 0.75] },
            keys: [
                { t: 0 },
                { t: 0.18, e: "inOut", p: { px: 0.22, giro: 60, olhar: 110, rotAnca: 30, ptY: 0.14, ptA: 35, tronco: 4 } },
                { t: 0.32, e: "inOut", p: { px: 0.24, giro: 160, olhar: 190, ptX: 0.02, ptY: 0.55, ptA: 20, tronco: 18 } },
                { t: 0.5, e: "snap", p: { px: 0.26, giro: 180, olhar: 180, ptX: -0.5, ptY: 1.0, ptA: -10, tronco: 30, cabeca: -6, pfA: 20, bfO: 40, bfC: 110, btO: 30, btC: 120 } },
                { t: 0.62, e: "outQuad", p: { px: 0.26, giro: 182, olhar: 180, ptX: -0.47, ptY: 0.98, ptA: -10, tronco: 30, cabeca: -6, pfA: 20, bfO: 40, bfC: 110, btO: 30, btC: 120 } },
                { t: 0.82, e: "inOut", p: { px: 0.12, giro: 300, olhar: 340, ptX: -0.1, ptY: 0.4, tronco: 6 } },
                { t: 1, e: "outQuad", p: { giro: 360, olhar: 360 } },
            ],
        },
        joelhoVoador: {
            nome: "Joelhada voadora", tecla: "E", categoria: "joelho", efetor: "joelhoTras",
            descricao: "Impulso, salto e o joelho de trás sobe com a anca para a frente, enquanto as mãos puxam.",
            duracao: 0.8, impacto: 0.5, frente: { pernaTras: [0.2, 0.86] },
            keys: [
                { t: 0 },
                { t: 0.2, e: "inOut", p: { py: 0.84, px: 0.05, tronco: 6, bfO: 60, bfC: 60, btO: 60, btC: 60 } },
                { t: 0.35, e: "out", p: { py: 1.05, px: 0.18, pfY: 0.35, pfA: 30, ptX: 0.0, ptY: 0.45, ptA: 35, bfO: 70, bfC: 50, btO: 65, btC: 55 } },
                { t: 0.5, e: "snap", p: { py: 1.18, px: 0.34, ptX: 0.5, ptY: 0.9, ptA: 50, pfX: 0.2, pfY: 0.45, pfA: 40, tronco: -14, cabeca: 16, rotAnca: -25, rotOmbros: -5, bfO: 70, bfC: 50, btO: 65, btC: 55 } },
                { t: 0.62, e: "outQuad", p: { py: 1.14, px: 0.34, ptX: 0.48, ptY: 0.88, ptA: 45, pfX: 0.22, pfY: 0.4, pfA: 40, tronco: -10, cabeca: 14, rotAnca: -20, rotOmbros: -5, bfO: 70, bfC: 50, btO: 65, btC: 55 } },
                { t: 0.85, e: "inOut", p: { py: 0.86, px: 0.08, ptX: -0.1, ptY: 0.2, pfX: 0.26, pfY: 0.1 } },
                { t: 1, e: "outQuad" },
            ],
        },
    },
    combos: [
        { nome: "1-2 + Pontapé", tecla: "1", sequencia: ["jab", "direto", "circular"] },
        { nome: "Cotovelada + Joelhada", tecla: "2", sequencia: ["cotovelo", "joelhada"] },
        { nome: "Teep + Circular", tecla: "3", sequencia: ["teep", "circular"] },
        { nome: "Jab + Cotov. giratória", tecla: "4", sequencia: ["jab", "cotoveloGiro"] },
        { nome: "1-2 + Giratório", tecla: "5", sequencia: ["jab", "direto", "giratorio"] },
        { nome: "Direto + Joelho voador", tecla: "6", sequencia: ["direto", "joelhoVoador"] },
    ],
};


// ---------------------------------------------------------------------------
// TAEKWONDO
// ---------------------------------------------------------------------------
const guardaTaekwondo = {
    px: 0, py: 0.89, tronco: 0, cabeca: 4, rotOmbros: 70, rotAnca: 65,
    bfO: 40, bfC: 95, btO: 30, btC: 100,
    pfX: 0.36, pfY: 0.1, pfA: 14, ptX: -0.32, ptY: 0.1, ptA: 18,
};

const taekwondo = {
    id: "taekwondo",
    nome: "Taekwondo",
    descricao: "Pontapés rápidos e altos, sempre a saltitar de lado.",
    cor: "#3dffa8",
    // Aparência: dobok branco com gola preta e cinto negro, descalço.
    aparencia: {
        pele: "#e3b48c", peleSombra: "#b98864", cabelo: "#101010", cortecabelo: "farto",
        dobok: "#f7f6f0", dobokSombra: "#d2cfc2", gola: "#1b1b1b", cinto: "#151515",
    },
    guarda: guardaTaekwondo,
    // Ritmo: saltitar contínuo, alternando o peso entre os pés.
    idle: (t) => {
        const f = t * 2 * Math.PI * 2.1;
        return {
            py: 0.014 * Math.sin(f),
            pfY: 0.012 * Math.max(0, Math.sin(f)),
            ptY: 0.012 * Math.max(0, -Math.sin(f)),
            bfO: 2 * Math.sin(f + 1),
            rotOmbros: 1.5 * Math.sin(t * 2 * Math.PI * 0.3),
        };
    },
    tecnicas: {
        ap: {
            nome: "Ap chagi", tecla: "Z", categoria: "pontapé", efetor: "peFrente",
            descricao: "Pontapé frontal: o joelho sobe primeiro e o pé estica a bater com a planta.",
            duracao: 0.6, impacto: 0.42,
            keys: [
                { t: 0 },
                { t: 0.15, e: "inOut", p: { px: -0.06, py: 0.9, tronco: -4 } },
                { t: 0.28, e: "inOut", p: { px: -0.08, tronco: -8, pfX: 0.32, pfY: 0.55, pfA: 20 } },
                { t: 0.42, e: "snap", p: { px: -0.1, tronco: -14, cabeca: 10, pfX: 0.92, pfY: 1.0, pfA: -35, bfO: 30, bfC: 100 } },
                { t: 0.54, e: "outQuad", p: { px: -0.1, tronco: -14, cabeca: 10, pfX: 0.9, pfY: 0.98, pfA: -35, bfO: 30, bfC: 100 } },
                { t: 0.72, e: "inOut", p: { pfX: 0.3, pfY: 0.5, pfA: 15, px: -0.06, tronco: -6 } },
                { t: 1, e: "outQuad" },
            ],
        },
        dollyo: {
            nome: "Dollyo chagi", tecla: "X", categoria: "pontapé", efetor: "peTras",
            descricao: "Pontapé circular alto com a perna de trás: o joelho aponta e a perna estala.",
            duracao: 0.75, impacto: 0.45, frente: { pernaTras: [0.2, 0.82] },
            keys: [
                { t: 0 },
                { t: 0.15, e: "inOut", p: { ptY: 0.13, ptA: 35, px: 0.03, rotAnca: 40 } },
                { t: 0.3, e: "inOut", p: { ptX: 0.15, ptY: 0.75, ptA: 40, rotAnca: 0, px: 0.05, tronco: -10, py: 0.92, pfA: 25, pfY: 0.12 } },
                { t: 0.45, e: "snap", p: { ptX: 0.95, ptY: 1.45, ptA: 55, rotAnca: -75, rotOmbros: 20, tronco: -34, cabeca: 24, px: 0, py: 0.95, pfA: 30, pfY: 0.12, bfO: 30, bfC: 90, btO: -20, btC: 40 } },
                { t: 0.56, e: "outQuad", p: { ptX: 0.9, ptY: 1.38, ptA: 55, rotAnca: -78, rotOmbros: 18, tronco: -35, cabeca: 24, px: 0, py: 0.95, pfA: 30, pfY: 0.12, bfO: 30, bfC: 90, btO: -20, btC: 40 } },
                { t: 0.72, e: "inOut", p: { ptX: 0.15, ptY: 0.7, ptA: 30, rotAnca: 10, tronco: -10, px: 0.03 } },
                { t: 1, e: "outQuad" },
            ],
        },
        yeop: {
            nome: "Yeop chagi", tecla: "C", categoria: "pontapé", efetor: "calcanharFrente",
            descricao: "Pontapé lateral: o corpo fica de lado e a perna empurra com o calcanhar.",
            duracao: 0.7, impacto: 0.45,
            keys: [
                { t: 0 },
                { t: 0.15, e: "inOut", p: { ptX: -0.18, px: -0.02 } },
                { t: 0.3, e: "inOut", p: { pfX: 0.12, pfY: 0.72, pfA: -10, rotAnca: 85, tronco: -15, px: -0.04, ptX: -0.16 } },
                { t: 0.45, e: "snap", p: { pfX: 1.0, pfY: 1.0, pfA: 10, rotAnca: 90, rotOmbros: 85, tronco: -38, cabeca: 30, px: -0.08, ptX: -0.16, bfO: 20, bfC: 110 } },
                { t: 0.58, e: "outQuad", p: { pfX: 0.98, pfY: 0.98, pfA: 10, rotAnca: 90, rotOmbros: 85, tronco: -38, cabeca: 30, px: -0.08, ptX: -0.16, bfO: 20, bfC: 110 } },
                { t: 0.78, e: "inOut", p: { pfX: 0.12, pfY: 0.6, tronco: -12, rotAnca: 75, ptX: -0.2 } },
                { t: 1, e: "outQuad" },
            ],
        },
        naeryo: {
            nome: "Naeryo chagi", tecla: "V", categoria: "pontapé", efetor: "calcanharFrente",
            descricao: "Pontapé de machado: a perna sobe esticada e desce com o calcanhar.",
            duracao: 0.8, impacto: 0.55,
            keys: [
                { t: 0 },
                { t: 0.15, e: "inOut", p: { px: -0.03, tronco: -5 } },
                { t: 0.38, e: "out", p: { pfX: 0.45, pfY: 1.6, pfA: 30, tronco: -20, cabeca: 14, px: -0.06, py: 0.92 } },
                { t: 0.55, e: "in", p: { pfX: 0.75, pfY: 1.3, pfA: 20, tronco: -8, px: 0 } },
                { t: 0.75, e: "outQuad", p: { pfX: 0.5, pfY: 0.35, tronco: 0, px: 0.04 } },
                { t: 1, e: "outQuad" },
            ],
        },
        jireugi: {
            nome: "Jireugi", tecla: "B", categoria: "soco", efetor: "maoTras",
            descricao: "Soco direto a partir da anca, enquanto a outra mão recua.",
            duracao: 0.5, impacto: 0.4, frente: { bracoTras: [0.24, 0.72] },
            keys: [
                { t: 0 },
                { t: 0.18, e: "inOut", p: { btO: -15, btC: 110, rotOmbros: 75, px: -0.02 } },
                { t: 0.4, e: "snap", p: { btO: 85, btC: 0, rotOmbros: 10, rotAnca: 35, tronco: 6, px: 0.08, bfO: -40, bfC: 122, ptA: 30 } },
                { t: 0.52, e: "outQuad", p: { btO: 87, btC: 0, rotOmbros: 6, rotAnca: 32, tronco: 6, px: 0.09, bfO: -40, bfC: 122, ptA: 30 } },
                { t: 0.8, e: "inOut", p: { btO: 20, btC: 110, rotOmbros: 55 } },
                { t: 1, e: "outQuad" },
            ],
        },
        dwit: {
            nome: "Dwit chagi", tecla: "Q", categoria: "pontapé", efetor: "calcanharTras",
            descricao: "Pontapé giratório para trás: roda sobre o pé da frente, olha por cima do ombro e empurra com o calcanhar.",
            duracao: 0.85, impacto: 0.5, frente: { pernaTras: [0.3, 0.75] },
            keys: [
                { t: 0 },
                { t: 0.18, e: "inOut", p: { px: 0.32, giro: 60, olhar: 120, ptY: 0.14, ptA: 35, tronco: 4 } },
                { t: 0.32, e: "inOut", p: { px: 0.36, giro: 160, olhar: 195, ptX: 0.1, ptY: 0.6, ptA: 20, tronco: 18 } },
                { t: 0.5, e: "snap", p: { px: 0.37, giro: 180, olhar: 180, ptX: -0.38, ptY: 1.05, ptA: -10, tronco: 32, cabeca: -6, pfA: 20, bfO: 40, bfC: 100, btO: 20, btC: 110 } },
                { t: 0.62, e: "outQuad", p: { px: 0.37, giro: 182, olhar: 180, ptX: -0.35, ptY: 1.02, ptA: -10, tronco: 32, cabeca: -6, pfA: 20, bfO: 40, bfC: 100, btO: 20, btC: 110 } },
                { t: 0.82, e: "inOut", p: { px: 0.18, giro: 300, olhar: 340, ptX: -0.1, ptY: 0.45, tronco: 6 } },
                { t: 1, e: "outQuad", p: { giro: 360, olhar: 360 } },
            ],
        },
        tornado: {
            nome: "Tornado", tecla: "W", categoria: "pontapé", efetor: "peitoPeFrente",
            descricao: "Pontapé circular com giro de 360°: roda de costas, salta e a perna da frente bate alto ainda no ar.",
            duracao: 1.0, impacto: 0.55,
            keys: [
                { t: 0 },
                { t: 0.15, e: "inOut", p: { px: 0.3, giro: 50, olhar: 100, rotAnca: 50, ptY: 0.15, ptA: 30 } },
                { t: 0.32, e: "inOut", p: { px: 0.34, giro: 180, olhar: 260, ptX: 0.05, ptY: 0.6, ptA: 25, py: 0.95, tronco: 5 } },
                { t: 0.45, e: "out", p: { px: 0.36, giro: 290, olhar: 360, py: 1.2, pfX: 0.32, pfY: 0.75, pfA: 20, ptX: 0.1, ptY: 0.55, ptA: 30 } },
                { t: 0.55, e: "snap", p: { px: 0.36, giro: 360, olhar: 360, py: 1.22, pfX: 1.15, pfY: 1.6, pfA: 40, rotAnca: 85, rotOmbros: 20, tronco: -30, cabeca: 26, ptX: 0.0, ptY: 0.75, ptA: 40, bfO: 30, bfC: 90, btO: -20, btC: 40 } },
                { t: 0.66, e: "outQuad", p: { px: 0.36, giro: 362, olhar: 362, py: 1.18, pfX: 1.1, pfY: 1.52, pfA: 40, rotAnca: 85, rotOmbros: 20, tronco: -30, cabeca: 26, ptX: 0.0, ptY: 0.6, ptA: 40, bfO: 30, bfC: 90, btO: -20, btC: 40 } },
                { t: 0.85, e: "inOut", p: { px: 0.2, giro: 360, olhar: 360, py: 0.9, pfX: 0.5, pfY: 0.25, pfA: 20, ptX: -0.3, ptY: 0.1, rotAnca: 60, tronco: -5 } },
                { t: 1, e: "outQuad", p: { giro: 360, olhar: 360 } },
            ],
        },
        huryeo: {
            nome: "Huryeo giratório", tecla: "E", categoria: "pontapé", efetor: "calcanharTras",
            descricao: "Gancho giratório: roda de costas e a perna de trás, esticada, varre à altura da cabeça com o calcanhar.",
            duracao: 0.95, impacto: 0.52, frente: { pernaTras: [0.3, 0.8] },
            keys: [
                { t: 0 },
                { t: 0.18, e: "inOut", p: { px: 0.32, giro: 60, olhar: 120, ptY: 0.14, ptA: 35 } },
                { t: 0.34, e: "inOut", p: { px: 0.36, giro: 150, olhar: 200, ptX: 0.0, ptY: 0.9, ptA: 20, tronco: 22 } },
                { t: 0.52, e: "snap", p: { px: 0.37, giro: 200, olhar: 165, ptX: -0.4, ptY: 1.55, ptA: 30, tronco: 42, cabeca: -10, pfA: 25, bfO: 50, bfC: 90, btO: 10, btC: 100 } },
                { t: 0.64, e: "outQuad", p: { px: 0.37, giro: 240, olhar: 200, ptX: -0.3, ptY: 1.45, ptA: 30, tronco: 40, cabeca: -10, pfA: 25, bfO: 50, bfC: 90, btO: 10, btC: 100 } },
                { t: 0.84, e: "inOut", p: { px: 0.18, giro: 330, olhar: 350, ptX: -0.15, ptY: 0.5, tronco: 8 } },
                { t: 1, e: "outQuad", p: { giro: 360, olhar: 360 } },
            ],
        },
    },
    combos: [
        { nome: "Ap + Dollyo", tecla: "1", sequencia: ["ap", "dollyo"] },
        { nome: "Yeop + Dollyo", tecla: "2", sequencia: ["yeop", "dollyo"] },
        { nome: "Jireugi + Dollyo", tecla: "3", sequencia: ["jireugi", "dollyo"] },
        { nome: "Dollyo + Dwit", tecla: "4", sequencia: ["dollyo", "dwit"] },
        { nome: "Ap + Tornado", tecla: "5", sequencia: ["ap", "tornado"] },
        { nome: "Dollyo + Huryeo", tecla: "6", sequencia: ["dollyo", "huryeo"] },
    ],
};


export const ARTES = [boxe, muayThai, taekwondo];

for (const arte of ARTES) {
    // parâmetros opcionais (projeção do antebraço, giro, olhar) com valor por omissão
    arte.guarda = { bfP: 1, btP: 1, bfQ: 1, btQ: 1, giro: 0, olhar: 0, ...arte.guarda };
    arte.tecnicas.avancar = passo(arte.guarda, 0.25);
    arte.tecnicas.recuar = passo(arte.guarda, -0.25);
}

export const PASSO = 0.25; // metros por passo
