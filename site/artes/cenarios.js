// Cenários noturnos com néon, um por arte marcial, pintados em camadas com
// parallax e perspetiva atmosférica (o que está longe fica mais esbatido).
//
// Boxe:       ringue de rua numa cidade, à noite (letreiros de néon, rede,
//             cordas de néon, holofote que segue o lutador, treliça de luzes).
// Muay Thai:  campo de treino na Tailândia, à noite (montanhas cársicas,
//             arrozal, templo iluminado, fios de lâmpadas, letreiro de néon).
// Taekwondo:  pátio de um templo na montanha, à noite (luar, névoa, pavilhão
//             com as portas acesas, letreiro de néon, lanternas de lótus).
//
// Desempenho: cada camada estática é pintada uma vez para uma imagem em cache
// (um período do padrão que se repete) e depois só é deslocada. As camadas
// longínquas são guardadas a meia resolução, o que as suaviza (profundidade).
// Só o céu, as estrelas, a luz e as partículas são desenhados a cada fotograma.

function aleatorio(semente) {
    let s = semente >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

const cache = new Map();

/**
 * Camada repetida com parallax, guardada em cache.
 * opcoes: { chave, fator (parallax), periodo (m), topo (m acima do chão),
 *           fundo (m abaixo do chão, por omissão até ao fundo do ecrã), escala }
 * desenhar(c, ox) pinta um período a começar em ox (px), com as coordenadas
 * normais do ecrã (v.chao, v.ppm...).
 */
function camada(ctx, v, { chave, fator, periodo, topo, fundo, escala = 1 }, desenhar) {
    const largura = periodo * v.ppm;
    const y0 = Math.max(0, Math.floor(v.chao - topo * v.ppm));
    const y1 = fundo === undefined ? v.h : Math.min(v.h, Math.ceil(v.chao + fundo * v.ppm));
    const id = `${chave}|${Math.round(largura)}|${Math.round(v.chao)}|${v.h}|${escala}`;
    let img = cache.get(id);
    if (!img) {
        if (cache.size > 40) cache.clear();
        img = document.createElement("canvas");
        img.width = Math.max(1, Math.ceil(largura * escala));
        img.height = Math.max(1, Math.ceil((y1 - y0) * escala));
        const c = img.getContext("2d");
        c.scale(escala, escala);
        c.translate(0, -y0);
        // três cópias para os objetos que cruzam a fronteira do período
        for (const ox of [-largura, 0, largura]) {
            c.save();
            desenhar(c, ox);
            c.restore();
        }
        cache.set(id, img);
    }
    const desvio = -((((v.camX * fator * v.ppm) % largura) + largura) % largura);
    for (let x = desvio; x < v.w; x += largura) ctx.drawImage(img, x, y0, largura, y1 - y0);
}

// ---------------------------------------------------------------------------
// Elementos comuns
// ---------------------------------------------------------------------------

function ceu(ctx, v, paragens) {
    const g = ctx.createLinearGradient(0, 0, 0, v.chao);
    paragens.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, v.w, v.chao);
}

/** Cordilheira com crista irregular e sombreado do lado oposto à luz. */
function montanhas(c, v, ox, periodo, { base, alturas, cor, sombra, luz, semente, aguda = false, estrias = 0 }) {
    const r = aleatorio(semente);
    const L = periodo * v.ppm;
    const n = alturas.length - 1;
    const pts = [];
    for (let i = 0; i <= n * 6; i += 1) {
        const t = i / (n * 6);
        const k = t * n;
        const a = Math.floor(k);
        const b = Math.min(n, a + 1);
        const f = k - a;
        const s = aguda ? f : f * f * (3 - 2 * f);
        const h = alturas[a] + (alturas[b] - alturas[a]) * s + (i % 6 && i < n * 6 ? (r() - 0.5) * 0.12 : 0);
        pts.push({ x: ox + t * L, y: v.chao - (base + h) * v.ppm });
    }
    c.fillStyle = cor;
    c.beginPath();
    c.moveTo(ox, v.chao + 2);
    pts.forEach((p) => c.lineTo(p.x, p.y));
    c.lineTo(ox + L, v.chao + 2);
    c.closePath();
    c.fill();
    // sombra: do cume para a direita (luz vem da esquerda) e luz no lado oposto
    for (let i = 1; i < pts.length - 1; i += 1) {
        const p = pts[i];
        if (p.y > pts[i - 1].y || p.y > pts[i + 1].y) continue; // só cumes
        let j = i + 1;
        while (j < pts.length - 1 && pts[j + 1].y >= pts[j].y) j += 1;
        c.fillStyle = sombra;
        c.beginPath();
        c.moveTo(p.x, p.y);
        for (let k = i + 1; k <= j; k += 1) c.lineTo(pts[k].x, pts[k].y);
        c.lineTo(pts[j].x - (pts[j].x - p.x) * 0.2, v.chao + 2);
        c.lineTo(p.x + (pts[j].x - p.x) * 0.1, v.chao + 2);
        c.closePath();
        c.fill();
        if (luz) {
            c.strokeStyle = luz;
            c.lineWidth = Math.max(1, v.ppm * 0.02);
            c.beginPath();
            let k = i;
            c.moveTo(pts[k].x, pts[k].y);
            while (k > 0 && pts[k - 1].y >= pts[k].y && i - k < 4) {
                k -= 1;
                c.lineTo(pts[k].x, pts[k].y);
            }
            c.stroke();
        }
    }
    // estrias verticais (calcário)
    if (estrias) {
        c.strokeStyle = sombra;
        c.lineWidth = Math.max(1, v.ppm * 0.015);
        for (let i = 0; i < estrias; i += 1) {
            const p = pts[Math.floor(r() * pts.length)];
            const comp = (v.chao - p.y) * (0.2 + r() * 0.5);
            c.globalAlpha = 0.5;
            c.beginPath();
            c.moveTo(p.x, p.y + comp * 0.15);
            c.lineTo(p.x + (r() - 0.5) * 6, p.y + comp);
            c.stroke();
        }
        c.globalAlpha = 1;
    }
}

function nevoa(ctx, v, altura, cor, base = 0) {
    const y1 = v.chao - base * v.ppm;
    const g = ctx.createLinearGradient(0, y1 - altura * v.ppm, 0, y1);
    g.addColorStop(0, cor.replace(/[\d.]+\)$/, "0)"));
    g.addColorStop(1, cor);
    ctx.fillStyle = g;
    ctx.fillRect(0, y1 - altura * v.ppm, v.w, altura * v.ppm + base * v.ppm + 2);
}

// ---------------------------------------------------------------------------
// Néon (comum às três artes): letreiros com tubo luminoso, estrelas, holofote
// ---------------------------------------------------------------------------
const fonteNeon = (px) => `700 ${px}px "Chakra Petch", system-ui, sans-serif`;
// as camadas com texto são pintadas outra vez quando a fonte acabar de carregar
if (typeof document !== "undefined" && document.fonts) document.fonts.ready.then(() => cache.clear());

/** Texto em tubo de néon: halo largo, tubo colorido e núcleo quase branco. */
function neonTexto(c, texto, x, y, px, cor, vertical = false) {
    c.save();
    c.font = fonteNeon(px);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineJoin = "round";
    const linhas = vertical ? [...texto] : [texto];
    const passo = px * 1.05;
    const y0 = y - ((linhas.length - 1) * passo) / 2;
    for (const [traco, lw, blur] of [[cor, px * 0.2, px * 0.9], [cor, px * 0.12, px * 0.35], ["rgba(255,255,255,0.85)", px * 0.045, 0]]) {
        c.strokeStyle = traco;
        c.lineWidth = lw;
        c.shadowColor = cor;
        c.shadowBlur = blur;
        linhas.forEach((l, i) => c.strokeText(l, x, y0 + i * passo));
    }
    c.restore();
}

/** Letreiro: placa escura com o texto em néon e um suporte até à parede. */
function letreiro(c, x, y, texto, px, cor, vertical = false) {
    c.save();
    c.font = fonteNeon(px);
    const w = vertical ? px * 1.6 : c.measureText(texto).width + px * 1.1;
    const h = vertical ? texto.length * px * 1.05 + px * 0.8 : px * 1.7;
    c.fillStyle = "#0b0816";
    c.strokeStyle = "rgba(255,255,255,0.08)";
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(x - w / 2, y - h / 2, w, h, px * 0.2);
    c.fill();
    c.stroke();
    // halo da placa na parede
    const g = c.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.9);
    g.addColorStop(0, cor.replace("rgb(", "rgba(").replace(")", ",0.22)"));
    g.addColorStop(1, cor.replace("rgb(", "rgba(").replace(")", ",0)"));
    c.fillStyle = g;
    c.fillRect(x - w * 1.2, y - h * 1.2, w * 2.4, h * 2.4);
    c.restore();
    neonTexto(c, texto, x, y, px, cor, vertical);
}

const ESTRELAS = Array.from({ length: 70 }, (_, i) => {
    const r = aleatorio(900 + i * 7);
    return { x: r(), y: r() * r() * 0.75, t: 0.6 + r() * 1.4, f: r() * 6, s: r() < 0.15 ? 2 : 1 };
});

function estrelas(ctx, v, tempo, alcance = 0.7) {
    ctx.save();
    ctx.fillStyle = "#e9ecff";
    for (const e of ESTRELAS) {
        if (e.y > alcance) continue;
        const x = ((((e.x * v.w * 1.3 - v.camX * v.ppm * 0.01) % v.w) + v.w) % v.w);
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tempo * e.t + e.f);
        ctx.fillRect(x, e.y * v.chao, e.s, e.s);
    }
    ctx.restore();
}

function lua(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    g.addColorStop(0, "rgba(200,210,255,0.35)");
    g.addColorStop(1, "rgba(200,210,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    ctx.fillStyle = "#e8ecff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(150,160,210,0.35)";
    for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.2, 0.16], [0.1, -0.35, 0.1]]) {
        ctx.beginPath();
        ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Partículas de pó que só se veem dentro do feixe do holofote.
const PO = Array.from({ length: 26 }, (_, i) => {
    const r = aleatorio(300 + i);
    return { x: r(), y: 0.15 + r() * 0.8, fase: r() * 6, vel: 0.15 + r() * 0.3 };
});

/** Holofote que segue o lutador (fixo ao centro do ecrã), com pó no ar. */
function holofote(ctx, v, tempo, cor = "200,225,255") {
    const x = v.w * 0.5;
    const topo = 0;
    const larguraTopo = v.ppm * 0.35;
    const larguraBase = v.ppm * 1.5;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(0, topo, 0, v.chao);
    g.addColorStop(0, `rgba(${cor},0.13)`);
    g.addColorStop(1, `rgba(${cor},0.03)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - larguraTopo / 2, topo);
    ctx.lineTo(x + larguraTopo / 2, topo);
    ctx.lineTo(x + larguraBase / 2, v.chao);
    ctx.lineTo(x - larguraBase / 2, v.chao);
    ctx.closePath();
    ctx.fill();
    for (const p of PO) {
        const y = v.chao * p.y + Math.cos(tempo * p.vel * 1.3 + p.fase) * 10;
        const meia = larguraTopo / 2 + (larguraBase - larguraTopo) / 2 * (y / v.chao);
        const px = x + (((p.x + tempo * p.vel * 0.03) % 1) * 2 - 1) * meia * 0.9 + Math.sin(tempo * p.vel + p.fase) * 6;
        const a = 0.25 + 0.25 * Math.sin(tempo * 1.7 + p.fase * 3);
        ctx.fillStyle = `rgba(${cor},${Math.max(0, a)})`;
        ctx.fillRect(px, y, 2, 2);
    }
    // poça de luz no chão
    const fundo = v.h - v.chao;
    const poca = ctx.createRadialGradient(x, v.chao + fundo * 0.15, 0, x, v.chao + fundo * 0.15, v.ppm * 1.3);
    poca.addColorStop(0, `rgba(${cor},0.16)`);
    poca.addColorStop(1, `rgba(${cor},0)`);
    ctx.fillStyle = poca;
    ctx.fillRect(0, v.chao, v.w, fundo);
    ctx.restore();
}

/** Halos de candeeiros que se repetem numa camada com parallax. */
function halos(ctx, v, tempo, { fator, periodo, xs, altura, cor, raio = 0.6 }) {
    const per = periodo * v.ppm;
    const desvio = -((((v.camX * fator * v.ppm) % per) + per) % per);
    for (let x0 = desvio - per; x0 < v.w + per; x0 += per) {
        for (const lx of xs) {
            const x = x0 + lx * v.ppm;
            const y = v.chao - altura * v.ppm;
            const g = ctx.createRadialGradient(x, y, 0, x, y, v.ppm * raio);
            g.addColorStop(0, `rgba(${cor},${0.5 + 0.05 * Math.sin(tempo * 3 + lx)})`);
            g.addColorStop(1, `rgba(${cor},0)`);
            ctx.fillStyle = g;
            ctx.fillRect(x - v.ppm * raio, y - v.ppm * raio, v.ppm * raio * 2, v.ppm * raio * 2);
        }
    }
}

// ---------------------------------------------------------------------------
// Boxe: ringue de rua numa cidade, à noite
// ---------------------------------------------------------------------------
const NEON = { magenta: "rgb(255,43,214)", ciano: "rgb(34,232,255)", ambar: "rgb(255,197,61)", vermelho: "rgb(255,77,109)", verde: "rgb(61,255,168)" };

const PREDIOS = (() => {
    const r = aleatorio(7);
    const lista = [];
    let x = 0;
    for (let i = 0; i < 18; i += 1) {
        const l = 0.5 + r() * 1.1;
        lista.push({ x, l, h: 1.4 + r() * 3.6, torre: r() < 0.25, semente: i * 13 + 5 });
        x += l + r() * 0.1;
    }
    return { lista, periodo: x };
})();

// prédios mais perto, com letreiros
const PREDIOS_PERTO = (() => {
    const r = aleatorio(19);
    const sinais = [
        ["BOXE", NEON.magenta, true], ["GYM", NEON.ciano, false], ["24H", NEON.ambar, false],
        ["HOTEL", NEON.vermelho, true], ["BAR", NEON.ciano, false], ["RAMEN", NEON.verde, true],
    ];
    const lista = [];
    let x = 0;
    for (let i = 0; i < 7; i += 1) {
        const l = 1.3 + r() * 1.2;
        const h = 2.1 + r() * 0.8;
        lista.push({ x, l, h, semente: 40 + i * 11, sinal: sinais[i % sinais.length], sy: Math.min(h - 0.35, 1.75 + r() * 0.45) });
        x += l + 0.15 + r() * 0.5;
    }
    return { lista, periodo: x };
})();

function janelas(c, x, topo, w, h, jw, semente, densidade, cores) {
    const r = aleatorio(semente);
    for (let yy = topo + jw * 2; yy < topo + h - jw * 2; yy += jw * 2.6) {
        for (let xx = x + jw; xx < x + w - jw; xx += jw * 2.2) {
            if (r() < densidade) {
                c.fillStyle = cores[Math.floor(r() * cores.length)];
                c.fillRect(xx, yy, jw, jw * 1.3);
            }
        }
    }
}

function candeeiroRua(c, x, chao, ppm) {
    c.fillStyle = "#14121f";
    c.fillRect(x - ppm * 0.025, chao - ppm * 2.1, ppm * 0.05, ppm * 2.1);
    c.fillRect(x - ppm * 0.025, chao - ppm * 2.1, ppm * 0.35, ppm * 0.04);
    c.fillStyle = "#1d1b2b";
    c.fillRect(x + ppm * 0.22, chao - ppm * 2.1, ppm * 0.2, ppm * 0.07);
    c.save();
    c.shadowColor = "#bfe9ff";
    c.shadowBlur = ppm * 0.15;
    c.fillStyle = "#e6f7ff";
    c.fillRect(x + ppm * 0.24, chao - ppm * 2.035, ppm * 0.16, ppm * 0.025);
    c.restore();
    const g = c.createLinearGradient(0, chao - ppm * 2.0, 0, chao);
    g.addColorStop(0, "rgba(190,235,255,0.14)");
    g.addColorStop(1, "rgba(190,235,255,0.02)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x + ppm * 0.25, chao - ppm * 2.01);
    c.lineTo(x + ppm * 0.39, chao - ppm * 2.01);
    c.lineTo(x + ppm * 0.9, chao);
    c.lineTo(x - ppm * 0.26, chao);
    c.closePath();
    c.fill();
}

function desenharBoxe(ctx, v, tempo) {
    ceu(ctx, v, [[0, "#05040f"], [0.4, "#110a2c"], [0.7, "#24104a"], [0.88, "#45135c"], [1, "#6a1a5c"]]);
    estrelas(ctx, v, tempo, 0.55);
    lua(ctx, v.w * 0.2 - v.camX * v.ppm * 0.01, v.chao * 0.18, v.ppm * 0.13);

    // cidade ao longe: silhuetas com janelas acesas e luzes vermelhas nas antenas
    const k = 0.4;
    camada(ctx, v, { chave: "boxe-cidade", fator: 0.05, periodo: PREDIOS.periodo * k, topo: 3.2, fundo: 0.05, escala: 0.6 }, (c, ox) => {
        for (const p of PREDIOS.lista) {
            const x = ox + p.x * k * v.ppm;
            const w = p.l * k * v.ppm;
            const h = p.h * k * v.ppm;
            c.fillStyle = "#261750";
            c.fillRect(x, v.chao - h, w, h);
            c.fillStyle = "#1e1244";
            c.fillRect(x + w * 0.7, v.chao - h, w * 0.3, h);
            if (p.torre) {
                c.fillRect(x + w * 0.45, v.chao - h - v.ppm * 0.35, 2, v.ppm * 0.35);
                c.fillStyle = "#ff4d6d";
                c.fillRect(x + w * 0.45 - 1, v.chao - h - v.ppm * 0.36, 4, 4);
            }
            janelas(c, x, v.chao - h, w, h, Math.max(1.2, v.ppm * 0.018), p.semente, 0.14, ["#4a3c88", "#c9a35a", "#6fcbe0", "#3c3075"]);
        }
    });
    nevoa(ctx, v, 1.4, "rgba(190,50,170,0.38)");

    // prédios perto, com letreiros de néon
    camada(ctx, v, { chave: "boxe-predios", fator: 0.16, periodo: PREDIOS_PERTO.periodo, topo: 3.0, fundo: 0.05, escala: 0.75 }, (c, ox) => {
        for (const p of PREDIOS_PERTO.lista) {
            const x = ox + p.x * v.ppm;
            const w = p.l * v.ppm;
            const h = p.h * v.ppm;
            const g = c.createLinearGradient(x, 0, x + w, 0);
            g.addColorStop(0, "#0f0a20");
            g.addColorStop(1, "#080614");
            c.fillStyle = g;
            c.fillRect(x, v.chao - h, w, h);
            // luz da lua no canto do prédio e na platibanda
            c.fillStyle = "rgba(150,130,255,0.28)";
            c.fillRect(x, v.chao - h, 2, h);
            c.fillRect(x, v.chao - h, w, 2);
            c.fillStyle = "#0f0a20";
            c.fillRect(x + w * 0.15, v.chao - h - v.ppm * 0.12, w * 0.2, v.ppm * 0.12);
            c.fillStyle = "rgba(150,130,255,0.22)";
            c.fillRect(x + w * 0.15, v.chao - h - v.ppm * 0.12, w * 0.2, 2);
            // varandas e escadas de incêndio
            c.strokeStyle = "#1d1638";
            c.lineWidth = 2;
            for (let yy = v.chao - h + v.ppm * 0.5; yy < v.chao - v.ppm * 0.4; yy += v.ppm * 0.55) {
                c.strokeRect(x + w * 0.1, yy, w * 0.35, v.ppm * 0.04);
            }
            janelas(c, x + w * 0.45, v.chao - h, w * 0.5, h, Math.max(1.5, v.ppm * 0.03), p.semente, 0.1, ["#ffcf6a", "#e0a84a", "#5fd0e6", "#1c1640"]);
            const [texto, cor, vertical] = p.sinal;
            if (texto !== "BOXE") letreiro(c, x + w * (vertical ? 0.78 : 0.5), v.chao - p.sy * v.ppm, texto, v.ppm * (vertical ? 0.14 : 0.18), cor, vertical);
        }
    });
    // o letreiro BOXE pisca de vez em quando (camada própria)
    const piscar = Math.sin(tempo * 23) > 0.3 && Math.sin(tempo * 0.9) > 0.85 ? 0.25 : 1;
    ctx.globalAlpha = piscar;
    camada(ctx, v, { chave: "boxe-sinal", fator: 0.16, periodo: PREDIOS_PERTO.periodo, topo: 3.0, fundo: 0.05, escala: 0.75 }, (c, ox) => {
        for (const p of PREDIOS_PERTO.lista) {
            const [texto, cor, vertical] = p.sinal;
            if (texto === "BOXE") letreiro(c, ox + (p.x + p.l * 0.78) * v.ppm, v.chao - p.sy * v.ppm, texto, v.ppm * 0.14, cor, vertical);
        }
    });
    ctx.globalAlpha = 1;
    nevoa(ctx, v, 0.9, "rgba(10,6,24,0.6)");

    // rede de arame e candeeiros da rua, atrás do ringue
    camada(ctx, v, { chave: "boxe-rede", fator: 0.3, periodo: 11, topo: 2.3, fundo: 0.05 }, (c, ox) => {
        const L = 11 * v.ppm;
        const alto = v.chao - 1.35 * v.ppm;
        c.strokeStyle = "rgba(120,110,190,0.22)";
        c.lineWidth = 1;
        const passo = v.ppm * 0.12;
        for (let x = ox - 2 * v.ppm; x < ox + L; x += passo) {
            c.beginPath();
            c.moveTo(x, v.chao);
            c.lineTo(x + 1.35 * v.ppm, alto);
            c.moveTo(x + 1.35 * v.ppm, v.chao);
            c.lineTo(x, alto);
            c.stroke();
        }
        c.fillStyle = "#18152a";
        c.fillRect(ox, alto - 3, L, 5);
        for (let x = ox; x < ox + L; x += 2.75 * v.ppm) c.fillRect(x - 3, alto, 6, v.chao - alto);
        candeeiroRua(c, ox + 2.2 * v.ppm, v.chao, v.ppm * 0.85);
        candeeiroRua(c, ox + 8.4 * v.ppm, v.chao, v.ppm * 0.85);
        // passeio molhado
        c.fillStyle = "#0d0b19";
        c.fillRect(ox, v.chao - v.ppm * 0.1, L, v.ppm * 0.12);
    });
    halos(ctx, v, tempo, { fator: 0.3, periodo: 11, xs: [2.45, 8.65], altura: 1.76, cor: "190,235,255", raio: 0.32 });

    // ringue: postes e cordas de néon (atrás do lutador)
    camada(ctx, v, { chave: "boxe-ringue", fator: 0.88, periodo: 6, topo: 1.6, fundo: 0.02 }, (c, ox) => {
        const L = 6 * v.ppm;
        const alturas = [0.45, 0.85, 1.25];
        const cores = [NEON.ciano, NEON.magenta, NEON.ciano];
        alturas.forEach((h, i) => {
            c.save();
            c.shadowColor = cores[i];
            c.shadowBlur = v.ppm * 0.12;
            for (const [cor, lw] of [[cores[i], 0.03], ["rgba(255,255,255,0.7)", 0.008]]) {
                c.strokeStyle = cor;
                c.lineWidth = v.ppm * lw;
                c.beginPath();
                c.moveTo(ox, v.chao - h * v.ppm);
                c.quadraticCurveTo(ox + L / 2, v.chao - (h - 0.07) * v.ppm, ox + L, v.chao - h * v.ppm);
                c.stroke();
            }
            c.restore();
        });
        // poste de canto com almofada
        c.fillStyle = "#1b1a28";
        c.fillRect(ox - v.ppm * 0.05, v.chao - v.ppm * 1.42, v.ppm * 0.1, v.ppm * 1.42);
        const g = c.createLinearGradient(ox - v.ppm * 0.09, 0, ox + v.ppm * 0.09, 0);
        g.addColorStop(0, "#5a1a6e");
        g.addColorStop(1, "#22093a");
        c.fillStyle = g;
        c.beginPath();
        c.roundRect(ox - v.ppm * 0.09, v.chao - v.ppm * 1.36, v.ppm * 0.18, v.ppm * 1.05, v.ppm * 0.04);
        c.fill();
        c.save();
        c.shadowColor = NEON.magenta;
        c.shadowBlur = v.ppm * 0.1;
        c.strokeStyle = NEON.magenta;
        c.lineWidth = 2;
        c.stroke();
        c.restore();
    });

    // lona do ringue: azul-escura, com reflexos das cordas e avental com néon
    const fundo = v.h - v.chao;
    camada(ctx, v, { chave: "boxe-lona", fator: 1, periodo: 4, topo: 0.01 }, (c, ox) => {
        const L = 4 * v.ppm;
        const g = c.createLinearGradient(0, v.chao, 0, v.h);
        g.addColorStop(0, "#2b2f58");
        g.addColorStop(0.75, "#1b1d3c");
        g.addColorStop(1, "#14152e");
        c.fillStyle = g;
        c.fillRect(ox, v.chao, L, fundo);
        // reflexos das cordas
        for (const [cor, y, a] of [["34,232,255", 0.06, 0.18], ["255,43,214", 0.16, 0.12], ["34,232,255", 0.3, 0.08]]) {
            const r = c.createLinearGradient(0, v.chao + fundo * (y - 0.04), 0, v.chao + fundo * (y + 0.04));
            r.addColorStop(0, `rgba(${cor},0)`);
            r.addColorStop(0.5, `rgba(${cor},${a})`);
            r.addColorStop(1, `rgba(${cor},0)`);
            c.fillStyle = r;
            c.fillRect(ox, v.chao + fundo * (y - 0.04), L, fundo * 0.08);
        }
        c.globalAlpha = 0.08;
        c.strokeStyle = "#0a0a1a";
        c.lineWidth = 1;
        for (let y = v.chao + 3; y < v.h; y += 4) {
            c.beginPath();
            c.moveTo(ox, y);
            c.lineTo(ox + L, y);
            c.stroke();
        }
        c.globalAlpha = 1;
        // avental com faixa de néon e o nome do salão
        const ay = v.h - fundo * 0.2;
        c.fillStyle = "#0e0a26";
        c.fillRect(ox, ay, L, fundo * 0.2);
        c.save();
        c.shadowColor = NEON.ciano;
        c.shadowBlur = v.ppm * 0.08;
        c.fillStyle = NEON.ciano;
        c.fillRect(ox, ay, L, Math.max(2, fundo * 0.02));
        c.restore();
        neonTexto(c, "SALÃO ARCADE", ox + L * 0.5, ay + fundo * 0.11, Math.max(9, v.ppm * 0.075), NEON.magenta);
    });

    holofote(ctx, v, tempo);
}

// Faixa do topo do ecrã (0,45 m) para o primeiro plano: acima das etiquetas
// dos alvos, para nunca tapar o jogo. Nos desenhos, y = 0 é o topo do ecrã.
function faixaTopo(v) {
    const ceuM = v.chao / v.ppm;
    return { topo: ceuM + 0.01, fundo: -(ceuM - 0.45) };
}

function primeiroPlanoBoxe(ctx, v) {
    // estrutura de luzes (treliça) no topo, a passar mais depressa que a câmara
    camada(ctx, v, { chave: "boxe-pp", fator: 1.25, periodo: 6, ...faixaTopo(v) }, (c, ox) => {
        const m = v.ppm;
        const L = 6 * m;
        const y1 = m * 0.05;
        const y2 = m * 0.17;
        c.fillStyle = "#0c0b16";
        c.fillRect(ox, y1 - m * 0.02, L, m * 0.035);
        c.fillRect(ox, y2 - m * 0.015, L, m * 0.035);
        c.strokeStyle = "#0c0b16";
        c.lineWidth = m * 0.018;
        c.beginPath();
        for (let x = ox; x < ox + L; x += m * 0.24) {
            c.moveTo(x, y1);
            c.lineTo(x + m * 0.12, y2);
            c.lineTo(x + m * 0.24, y1);
        }
        c.stroke();
        c.strokeStyle = "rgba(140,130,220,0.25)";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(ox, y1 - m * 0.02);
        c.lineTo(ox + L, y1 - m * 0.02);
        c.stroke();
        // projetores pendurados
        for (const [x, cor, ang] of [[0.9, "rgb(230,240,255)", 0.35], [2.6, NEON.magenta, -0.2], [4.4, NEON.ciano, 0.25]]) {
            const px = ox + x * m;
            c.save();
            c.translate(px, y2 + m * 0.02);
            c.fillStyle = "#0c0b16";
            c.fillRect(-m * 0.015, 0, m * 0.03, m * 0.06);
            c.translate(0, m * 0.08);
            c.rotate(ang);
            c.fillStyle = "#16142a";
            c.beginPath();
            c.roundRect(-m * 0.07, -m * 0.06, m * 0.14, m * 0.15, m * 0.02);
            c.fill();
            c.shadowColor = cor;
            c.shadowBlur = m * 0.2;
            c.fillStyle = cor;
            c.beginPath();
            c.ellipse(0, m * 0.09, m * 0.06, m * 0.018, 0, 0, Math.PI * 2);
            c.fill();
            c.restore();
        }
    });
}

// ---------------------------------------------------------------------------
// Muay Thai: campo de treino na Tailândia, à noite
// ---------------------------------------------------------------------------
function chedi(c, x, chao, u) {
    // estupa dourada em forma de sino, iluminada por projetores
    c.save();
    c.shadowColor = "#ffb84a";
    c.shadowBlur = u * 0.35;
    c.fillStyle = "#c9993a";
    c.fillRect(x - 0.7 * u, chao - 0.25 * u, 1.4 * u, 0.25 * u);
    c.fillRect(x - 0.55 * u, chao - 0.45 * u, 1.1 * u, 0.2 * u);
    c.beginPath();
    c.moveTo(x - 0.5 * u, chao - 0.45 * u);
    c.quadraticCurveTo(x - 0.5 * u, chao - 1.25 * u, x, chao - 1.35 * u);
    c.quadraticCurveTo(x + 0.5 * u, chao - 1.25 * u, x + 0.5 * u, chao - 0.45 * u);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(x - 0.12 * u, chao - 1.3 * u);
    c.lineTo(x, chao - 2.4 * u);
    c.lineTo(x + 0.12 * u, chao - 1.3 * u);
    c.closePath();
    c.fill();
    c.restore();
    c.fillStyle = "rgba(60,30,10,0.4)";
    c.beginPath();
    c.moveTo(x + 0.05 * u, chao - 1.35 * u);
    c.quadraticCurveTo(x + 0.5 * u, chao - 1.25 * u, x + 0.5 * u, chao - 0.45 * u);
    c.lineTo(x + 0.1 * u, chao - 0.45 * u);
    c.closePath();
    c.fill();
    for (let i = 0; i < 5; i += 1) c.fillRect(x - 0.08 * u, chao - (1.5 + i * 0.16) * u, 0.16 * u, 0.04 * u);
}

function templo(c, x, chao, u) {
    // base branca com degraus, colunas, telhado em camadas vermelho e dourado com chofa
    c.fillStyle = "#3e2e48";
    c.fillRect(x - 1.3 * u, chao - 0.2 * u, 2.6 * u, 0.2 * u);
    c.fillStyle = "#4e3a58";
    c.fillRect(x - 1.1 * u, chao - 1.0 * u, 2.2 * u, 0.8 * u);
    c.fillStyle = "#2e2238";
    for (let i = 0; i < 6; i += 1) c.fillRect(x - 1.0 * u + i * 0.4 * u, chao - 1.0 * u, 0.09 * u, 0.8 * u);
    // porta aberta com luz quente lá dentro
    c.save();
    c.shadowColor = "#ffb86a";
    c.shadowBlur = u * 0.4;
    c.fillStyle = "#ffbf72";
    c.fillRect(x - 0.2 * u, chao - 0.75 * u, 0.4 * u, 0.55 * u);
    c.restore();
    const camadas = [[1.0, 1.5, 0.5], [1.38, 1.15, 0.45], [1.75, 0.8, 0.42]];
    for (const [y, l, h] of camadas) {
        c.fillStyle = "#5e1a2e";
        c.beginPath();
        c.moveTo(x - l * u, chao - y * u);
        c.lineTo(x - l * 0.32 * u, chao - (y + h) * u);
        c.lineTo(x + l * 0.32 * u, chao - (y + h) * u);
        c.lineTo(x + l * u, chao - y * u);
        c.closePath();
        c.fill();
        c.fillStyle = "#16283a";
        c.beginPath();
        c.moveTo(x - l * 0.66 * u, chao - (y + h * 0.5) * u);
        c.lineTo(x - l * 0.32 * u, chao - (y + h) * u);
        c.lineTo(x - l * 0.2 * u, chao - (y + h) * u);
        c.lineTo(x - l * 0.5 * u, chao - (y + h * 0.5) * u);
        c.closePath();
        c.fill();
        c.strokeStyle = "#ffc24a";
        c.shadowColor = "#ffb030";
        c.shadowBlur = u * 0.12;
        c.lineWidth = Math.max(1.5, u * 0.045);
        c.beginPath();
        c.moveTo(x - l * u, chao - y * u);
        c.lineTo(x - l * 0.32 * u, chao - (y + h) * u);
        c.lineTo(x + l * 0.32 * u, chao - (y + h) * u);
        c.lineTo(x + l * u, chao - y * u);
        c.stroke();
        // chofa (pontas curvas douradas)
        c.beginPath();
        c.moveTo(x - l * 0.32 * u, chao - (y + h) * u);
        c.quadraticCurveTo(x - l * 0.42 * u, chao - (y + h + 0.22) * u, x - l * 0.27 * u, chao - (y + h + 0.24) * u);
        c.moveTo(x + l * 0.32 * u, chao - (y + h) * u);
        c.quadraticCurveTo(x + l * 0.42 * u, chao - (y + h + 0.22) * u, x + l * 0.27 * u, chao - (y + h + 0.24) * u);
        c.moveTo(x - l * u, chao - y * u);
        c.quadraticCurveTo(x - l * 1.08 * u, chao - (y + 0.1) * u, x - l * 1.02 * u, chao - (y + 0.18) * u);
        c.moveTo(x + l * u, chao - y * u);
        c.quadraticCurveTo(x + l * 1.08 * u, chao - (y + 0.1) * u, x + l * 1.02 * u, chao - (y + 0.18) * u);
        c.stroke();
        c.shadowBlur = 0;
    }
}

// Silhuetas noturnas: longe (arroxeadas pela névoa) e perto (quase pretas,
// com um fio de luz magenta nas nervuras).
const TONS_LONGE = { tronco: ["#2c1c3c", "#26183a"], folhas: ["#2a1a3e", "#30204a"], nervura: "rgba(255,140,210,0.18)", cocos: "#231634" };
const TONS_PERTO = { tronco: ["#191020", "#140c1a"], folhas: ["#120b1a", "#170e20"], nervura: "rgba(255,120,200,0.35)", cocos: "#0f0914" };

function palmeira(c, x, chao, ppm, h, curva, semente, tons = TONS_PERTO) {
    const r = aleatorio(semente);
    const topo = { x: x + curva * ppm, y: chao - h * ppm };
    // tronco com anéis
    const n = 14;
    for (let i = 0; i < n; i += 1) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const p = (t) => ({ x: x + curva * ppm * t * t, y: chao - h * ppm * t });
        const a = p(t0);
        const b = p(t1);
        c.strokeStyle = tons.tronco[i % 2];
        c.lineWidth = ppm * (0.12 - t0 * 0.04);
        c.lineCap = "butt";
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
    }
    // folhas: lâmina recortada em folíolos, a pender, com nervura central
    for (let k = 0; k < 9; k += 1) {
        const a = -Math.PI * 1.02 + k * (Math.PI * 1.04 / 8) + (r() - 0.5) * 0.15;
        const comp = ppm * (0.95 + r() * 0.35);
        const fim = { x: topo.x + Math.cos(a) * comp, y: topo.y + Math.sin(a) * comp * 0.5 + comp * 0.5 };
        const ctrl = { x: topo.x + Math.cos(a) * comp * 0.6, y: topo.y + Math.sin(a) * comp * 0.55 - comp * 0.15 };
        const ponto = (t) => ({
            x: (1 - t) * (1 - t) * topo.x + 2 * (1 - t) * t * ctrl.x + t * t * fim.x,
            y: (1 - t) * (1 - t) * topo.y + 2 * (1 - t) * t * ctrl.y + t * t * fim.y,
        });
        const lados = [[], []];
        const N = 16;
        for (let j = 0; j <= N; j += 1) {
            const t = j / N;
            const p = ponto(t);
            const q = ponto(Math.min(1, t + 0.02));
            const ang = Math.atan2(q.y - p.y, q.x - p.x);
            // folíolos alternados: largura em dente de serra, a pender para baixo
            const w = ppm * 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (j % 2 ? 1 : 0.55);
            lados[0].push({ x: p.x + Math.cos(ang - 1.9) * w, y: p.y + Math.sin(ang - 1.9) * w + w * 0.6 });
            lados[1].push({ x: p.x + Math.cos(ang + 1.9) * w, y: p.y + Math.sin(ang + 1.9) * w + w * 0.6 });
        }
        c.fillStyle = tons.folhas[k % 2];
        c.beginPath();
        c.moveTo(topo.x, topo.y);
        lados[0].forEach((p) => c.lineTo(p.x, p.y));
        lados[1].reverse().forEach((p) => c.lineTo(p.x, p.y));
        c.closePath();
        c.fill();
        c.strokeStyle = tons.nervura;
        c.lineWidth = Math.max(1, ppm * 0.012);
        c.beginPath();
        c.moveTo(topo.x, topo.y);
        c.quadraticCurveTo(ctrl.x, ctrl.y, fim.x, fim.y);
        c.stroke();
    }
    c.fillStyle = tons.cocos;
    for (let i = 0; i < 3; i += 1) {
        c.beginPath();
        c.arc(topo.x + (i - 1) * ppm * 0.05, topo.y + ppm * 0.06, ppm * 0.04, 0, Math.PI * 2);
        c.fill();
    }
}

function bananeira(c, x, chao, ppm, semente) {
    const r = aleatorio(semente);
    c.fillStyle = "#1a1020";
    c.fillRect(x - ppm * 0.06, chao - ppm * 1.0, ppm * 0.12, ppm * 1.0);
    for (let k = 0; k < 6; k += 1) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.5 + (r() - 0.5) * 0.2;
        c.save();
        c.translate(x, chao - ppm * 1.0);
        c.rotate(a + Math.PI / 2);
        c.fillStyle = k % 2 ? "#140c1c" : "#1a1124";
        c.beginPath();
        c.ellipse(0, -ppm * 0.45, ppm * 0.15, ppm * 0.47, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "rgba(255,170,90,0.35)";
        c.lineWidth = Math.max(1, ppm * 0.012);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, -ppm * 0.9);
        c.stroke();
        // folhas rasgadas: riscos claros
        c.strokeStyle = "rgba(255,170,90,0.15)";
        for (let j = 0; j < 4; j += 1) {
            const yy = -ppm * (0.2 + r() * 0.6);
            c.beginPath();
            c.moveTo(0, yy);
            c.lineTo((r() < 0.5 ? -1 : 1) * ppm * 0.14, yy - ppm * 0.08);
            c.stroke();
        }
        c.restore();
    }
}

/** Fio de lâmpadas em catenária entre dois pontos (para camadas em cache). */
function fioLampadas(c, x0, x1, y, flecha, ppm, cores) {
    c.strokeStyle = "#0c0810";
    c.lineWidth = Math.max(1, ppm * 0.008);
    c.beginPath();
    c.moveTo(x0, y);
    c.quadraticCurveTo((x0 + x1) / 2, y + flecha * 2, x1, y);
    c.stroke();
    const n = Math.max(2, Math.round((x1 - x0) / (ppm * 0.42)));
    for (let i = 1; i < n; i += 1) {
        const t = i / n;
        const lx = x0 + (x1 - x0) * t;
        const ly = y + 4 * t * (1 - t) * flecha + ppm * 0.03;
        const cor = cores[i % cores.length];
        c.save();
        c.shadowColor = cor;
        c.shadowBlur = ppm * 0.12;
        c.fillStyle = cor;
        c.beginPath();
        c.arc(lx, ly, Math.max(2, ppm * 0.022), 0, Math.PI * 2);
        c.fill();
        c.restore();
    }
}

const PIRILAMPOS = Array.from({ length: 18 }, (_, i) => {
    const r = aleatorio(500 + i * 3);
    return { x: r(), y: 0.35 + r() * 0.55, fase: r() * 6, vel: 0.2 + r() * 0.35 };
});

function pirilampos(ctx, v, tempo, cor) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of PIRILAMPOS) {
        const x = ((((p.x * v.w + Math.sin(tempo * p.vel + p.fase) * 40 - v.camX * v.ppm * 0.4) % v.w) + v.w) % v.w);
        const y = v.chao * p.y + Math.cos(tempo * p.vel * 1.3 + p.fase) * 18;
        const a = Math.max(0, 0.15 + 0.5 * Math.sin(tempo * 2.2 + p.fase * 3));
        const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
        g.addColorStop(0, `rgba(${cor},${a})`);
        g.addColorStop(1, `rgba(${cor},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - 8, y - 8, 16, 16);
    }
    ctx.restore();
}

function desenharMuayThai(ctx, v, tempo) {
    ceu(ctx, v, [[0, "#06040f"], [0.45, "#180b30"], [0.78, "#3a1150"], [1, "#7a2050"]]);
    estrelas(ctx, v, tempo, 0.5);
    lua(ctx, v.w * 0.22 - v.camX * v.ppm * 0.01, v.chao * 0.22, v.ppm * 0.2);

    // montanhas cársicas (torres de calcário), três planos
    camada(ctx, v, { chave: "mt-mont1", fator: 0.03, periodo: 13, topo: 3.6, fundo: 0.02, escala: 0.5 }, (c, ox) => {
        montanhas(c, v, ox, 13, { base: 0.3, alturas: [0.2, 2.6, 2.9, 0.7, 1.3, 3.2, 3.0, 0.5, 1.9, 2.2, 0.4, 0.2], cor: "#2c1a44", sombra: "#22133a", luz: "rgba(255,150,220,0.3)", semente: 3, estrias: 30 });
    });
    nevoa(ctx, v, 1.4, "rgba(150,40,120,0.35)", 0.2);
    camada(ctx, v, { chave: "mt-mont2", fator: 0.07, periodo: 10, topo: 2.6, fundo: 0.02, escala: 0.5 }, (c, ox) => {
        montanhas(c, v, ox, 10, { base: 0.1, alturas: [0.2, 1.5, 1.8, 0.5, 0.9, 2.3, 2.0, 0.4, 0.7, 0.2], cor: "#1e1032", sombra: "#170b28", luz: "rgba(255,120,200,0.35)", semente: 5, estrias: 25 });
    });
    nevoa(ctx, v, 0.9, "rgba(120,30,100,0.35)");
    // arrozal com reflexos e selva
    camada(ctx, v, { chave: "mt-selva", fator: 0.14, periodo: 8, topo: 1.4, fundo: 0.02, escala: 0.7 }, (c, ox) => {
        const r = aleatorio(91);
        const L = 8 * v.ppm;
        c.fillStyle = "#1a0f28";
        c.beginPath();
        c.moveTo(ox, v.chao - 0.3 * v.ppm);
        for (let i = 0; i <= 40; i += 1) c.lineTo(ox + (i / 40) * L, v.chao - (0.55 + Math.sin(i * 0.9) * 0.12 + r() * 0.25) * v.ppm);
        c.lineTo(ox + L, v.chao);
        c.lineTo(ox, v.chao);
        c.closePath();
        c.fill();
        for (let i = 0; i < 9; i += 1) palmeira(c, ox + r() * L, v.chao - 0.25 * v.ppm, v.ppm * 0.38, 2.2 + r() * 1.2, (r() - 0.5) * 0.8, 400 + i, TONS_LONGE);
        c.fillStyle = "#241338";
        c.fillRect(ox, v.chao - 0.28 * v.ppm, L, 0.28 * v.ppm);
        c.strokeStyle = "rgba(255,130,210,0.3)";
        c.lineWidth = 1;
        for (let i = 0; i < 6; i += 1) {
            const y = v.chao - (0.05 + i * 0.04) * v.ppm;
            c.beginPath();
            c.moveTo(ox, y);
            c.lineTo(ox + L, y);
            c.stroke();
        }
    });
    // templo e chedi
    camada(ctx, v, { chave: "mt-templo", fator: 0.26, periodo: 14, topo: 2.6, fundo: 0.02 }, (c, ox) => {
        templo(c, ox + 3.0 * v.ppm, v.chao, v.ppm * 0.78);
        chedi(c, ox + 5.4 * v.ppm, v.chao, v.ppm * 0.62);
        templo(c, ox + 10.2 * v.ppm, v.chao, v.ppm * 0.6);
        palmeira(c, ox + 7.4 * v.ppm, v.chao, v.ppm * 0.7, 2.9, 0.6, 21, TONS_LONGE);
        palmeira(c, ox + 12.6 * v.ppm, v.chao, v.ppm * 0.7, 2.6, -0.5, 22, TONS_LONGE);
        // luz dos projetores no chão à frente do templo
        const g = c.createRadialGradient(ox + 3.6 * v.ppm, v.chao, 0, ox + 3.6 * v.ppm, v.chao, 2.4 * v.ppm);
        g.addColorStop(0, "rgba(255,180,90,0.22)");
        g.addColorStop(1, "rgba(255,180,90,0)");
        c.fillStyle = g;
        c.fillRect(ox + 1.2 * v.ppm, v.chao - 2.4 * v.ppm, 4.8 * v.ppm, 2.4 * v.ppm);
    });
    // palmeiras e bananeiras próximas
    camada(ctx, v, { chave: "mt-perto", fator: 0.5, periodo: 7, topo: 3.0, fundo: 0.02 }, (c, ox) => {
        palmeira(c, ox + 0.9 * v.ppm, v.chao, v.ppm * 0.85, 2.7, 0.5, 31);
        palmeira(c, ox + 4.7 * v.ppm, v.chao, v.ppm * 0.85, 2.3, -0.4, 32);
        bananeira(c, ox + 3.0 * v.ppm, v.chao, v.ppm * 0.9, 33);
        bananeira(c, ox + 6.2 * v.ppm, v.chao, v.ppm * 0.75, 34);
    });

    // estrutura do campo de treino: postes e viga
    const per = 8;
    camada(ctx, v, { chave: "mt-postes", fator: 0.9, periodo: per, topo: 3.4, fundo: 0.02 }, (c, ox) => {
        c.fillStyle = "#1c1224";
        c.fillRect(ox + 0.2 * v.ppm, v.chao - 3.4 * v.ppm, v.ppm * 0.16, 3.4 * v.ppm);
        c.fillStyle = "rgba(255,180,90,0.3)";
        c.fillRect(ox + 0.2 * v.ppm, v.chao - 3.4 * v.ppm, v.ppm * 0.03, 3.4 * v.ppm);
        c.fillStyle = "#150d1c";
        c.fillRect(ox - 0.2 * v.ppm, v.chao - 2.62 * v.ppm, per * v.ppm + 0.4 * v.ppm, v.ppm * 0.1);
        fioLampadas(c, ox + 0.28 * v.ppm, ox + (per + 0.28) * v.ppm, v.chao - 2.5 * v.ppm, v.ppm * 0.3, v.ppm, ["#ffc53d", "#ff6ad5", "#ffe9a8", "#ff8a3d"]);
        // letreiro pendurado da viga
        c.strokeStyle = "#0c0810";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(ox + 3.3 * v.ppm, v.chao - 2.57 * v.ppm);
        c.lineTo(ox + 3.3 * v.ppm, v.chao - 2.4 * v.ppm);
        c.moveTo(ox + 4.7 * v.ppm, v.chao - 2.57 * v.ppm);
        c.lineTo(ox + 4.7 * v.ppm, v.chao - 2.4 * v.ppm);
        c.stroke();
        letreiro(c, ox + 4 * v.ppm, v.chao - 2.3 * v.ppm, "MUAY THAI", v.ppm * 0.12, NEON.magenta);
    });
    // estrado de madeira: tábuas com tons, veios, nós e pregos
    const fundo = v.h - v.chao;
    camada(ctx, v, { chave: "mt-estrado", fator: 1, periodo: 4.8, topo: 0.01 }, (c, ox) => {
        const r = aleatorio(17);
        const L = 4.8 * v.ppm;
        const filas = [0, 0.14, 0.32, 0.54, 0.8, 1.0];
        for (let f = 0; f < filas.length - 1; f += 1) {
            const y0 = v.chao + fundo * filas[f];
            const y1 = v.chao + fundo * filas[f + 1];
            let x = ox - ((f * 0.37) % 1.2) * v.ppm;
            while (x < ox + L) {
                const comp = (1.0 + r() * 0.8) * v.ppm;
                const tomBase = 0.85 + r() * 0.25;
                const cor = (k) => `rgb(${Math.round(185 * tomBase * k * 0.4 + 10)},${Math.round(132 * tomBase * k * 0.38 + 6)},${Math.round(80 * tomBase * k * 0.45 + 16)})`;
                const g = c.createLinearGradient(0, y0, 0, y1);
                g.addColorStop(0, cor(1.05 - f * 0.05));
                g.addColorStop(1, cor(0.9 - f * 0.05));
                c.fillStyle = g;
                c.fillRect(x, y0, comp, y1 - y0);
                c.strokeStyle = "rgba(20,10,8,0.35)";
                c.lineWidth = 1;
                for (let k = 0; k < 4; k += 1) {
                    const yy = y0 + (y1 - y0) * (0.2 + r() * 0.6);
                    c.beginPath();
                    c.moveTo(x + 2, yy);
                    c.bezierCurveTo(x + comp * 0.3, yy + (r() - 0.5) * 4, x + comp * 0.6, yy + (r() - 0.5) * 4, x + comp - 2, yy);
                    c.stroke();
                }
                if (r() < 0.4) {
                    c.fillStyle = "rgba(80,45,20,0.45)";
                    c.beginPath();
                    c.ellipse(x + comp * r(), y0 + (y1 - y0) * (0.3 + r() * 0.4), 4, 2.5, 0, 0, Math.PI * 2);
                    c.fill();
                }
                c.fillStyle = "rgba(60,40,25,0.6)";
                c.fillRect(x + 4, y0 + (y1 - y0) * 0.5 - 1.5, 3, 3);
                c.fillStyle = "rgba(50,30,12,0.7)";
                c.fillRect(x + comp - 1, y0, 2, y1 - y0);
                x += comp;
            }
            c.fillStyle = "rgba(50,30,12,0.55)";
            c.fillRect(ox, y1 - 1, L, 2);
        }
    });
    const sombra = ctx.createLinearGradient(0, v.chao, 0, v.chao + fundo * 0.25);
    sombra.addColorStop(0, "rgba(40,25,10,0.25)");
    sombra.addColorStop(1, "rgba(40,25,10,0)");
    ctx.fillStyle = sombra;
    ctx.fillRect(0, v.chao, v.w, fundo * 0.25);

    pirilampos(ctx, v, tempo, "220,255,140");
    holofote(ctx, v, tempo, "255,205,150");
}

function primeiroPlanoMuayThai(ctx, v) {
    // beiral de colmo do abrigo de treino
    camada(ctx, v, { chave: "mt-pp", fator: 1.15, periodo: 10, ...faixaTopo(v) }, (c, ox) => {
        const L = 10 * v.ppm;
        const y = -2;
        const r = aleatorio(616);
        c.fillStyle = "#24180f";
        c.beginPath();
        c.moveTo(ox - 2, y);
        c.lineTo(ox + L + 2, y);
        c.lineTo(ox + L + 2, y + 0.24 * v.ppm);
        for (let x = L; x > 0; x -= v.ppm * 0.06) c.lineTo(ox + x, y + (0.22 + r() * 0.16) * v.ppm);
        c.closePath();
        c.fill();
        c.strokeStyle = "rgba(255,170,90,0.12)";
        c.lineWidth = 1;
        for (let i = 0; i < 260; i += 1) {
            const x = ox + r() * L;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x + (r() - 0.5) * 6, y + (0.15 + r() * 0.2) * v.ppm);
            c.stroke();
        }
        fioLampadas(c, ox, ox + L / 2, 0.26 * v.ppm, 0.08 * v.ppm, v.ppm, ["#ffc53d", "#ffe9a8"]);
        fioLampadas(c, ox + L / 2, ox + L, 0.26 * v.ppm, 0.08 * v.ppm, v.ppm, ["#ff6ad5", "#ffc53d"]);
    });
}

// ---------------------------------------------------------------------------
// Taekwondo: pátio de pedra de um templo na montanha, à noite
// ---------------------------------------------------------------------------
function pavilhao(c, x, chao, u) {
    // hanok: plataforma de pedra, pilares, vigas pintadas (dancheong) e telhado curvo
    c.fillStyle = "#3a4056";
    c.fillRect(x - 1.6 * u, chao - 0.3 * u, 3.2 * u, 0.3 * u);
    c.fillStyle = "#2a2f44";
    c.fillRect(x - 1.6 * u, chao - 0.06 * u, 3.2 * u, 0.06 * u);
    // portas de papel acesas por dentro
    c.save();
    c.shadowColor = "#ffcf80";
    c.shadowBlur = u * 0.5;
    c.fillStyle = "#ffd894";
    c.fillRect(x - 1.3 * u, chao - 1.45 * u, 2.6 * u, 1.15 * u);
    c.restore();
    c.strokeStyle = "#5a3020";
    c.lineWidth = Math.max(1, u * 0.02);
    for (let i = 0; i < 4; i += 1) {
        const px = x - 1.15 * u + i * 0.6 * u;
        c.strokeRect(px, chao - 1.3 * u, 0.5 * u, 0.95 * u);
        for (let k = 1; k < 4; k += 1) {
            c.beginPath();
            c.moveTo(px, chao - 1.3 * u + k * 0.24 * u);
            c.lineTo(px + 0.5 * u, chao - 1.3 * u + k * 0.24 * u);
            c.moveTo(px + k * 0.125 * u, chao - 1.3 * u);
            c.lineTo(px + k * 0.125 * u, chao - 0.35 * u);
            c.stroke();
        }
    }
    c.fillStyle = "#3e1814";
    for (const px of [-1.3, -0.65, 0, 0.65, 1.3]) c.fillRect(x + px * u - 0.06 * u, chao - 1.5 * u, 0.12 * u, 1.2 * u);
    c.fillStyle = "#1a4440";
    c.fillRect(x - 1.45 * u, chao - 1.66 * u, 2.9 * u, 0.18 * u);
    c.fillStyle = "#8a2e28";
    c.fillRect(x - 1.45 * u, chao - 1.52 * u, 2.9 * u, 0.04 * u);
    c.fillStyle = "#c9a040";
    for (let i = 0; i < 12; i += 1) c.fillRect(x - 1.4 * u + i * 0.24 * u, chao - 1.62 * u, 0.08 * u, 0.08 * u);
    // telhado com beirais levantados e telhas
    c.fillStyle = "#1a1d2a";
    c.beginPath();
    c.moveTo(x - 2.1 * u, chao - 1.55 * u);
    c.quadraticCurveTo(x - 1.7 * u, chao - 1.72 * u, x - 1.25 * u, chao - 2.25 * u);
    c.lineTo(x + 1.25 * u, chao - 2.25 * u);
    c.quadraticCurveTo(x + 1.7 * u, chao - 1.72 * u, x + 2.1 * u, chao - 1.55 * u);
    c.quadraticCurveTo(x + 1.5 * u, chao - 1.68 * u, x, chao - 1.64 * u);
    c.quadraticCurveTo(x - 1.5 * u, chao - 1.68 * u, x - 2.1 * u, chao - 1.55 * u);
    c.fill();
    c.strokeStyle = "rgba(160,180,255,0.14)";
    c.lineWidth = 1;
    for (let i = -10; i <= 10; i += 1) {
        c.beginPath();
        c.moveTo(x + i * 0.12 * u, chao - 2.24 * u);
        c.lineTo(x + i * 0.18 * u, chao - 1.66 * u);
        c.stroke();
    }
    c.fillStyle = "#13151e";
    c.fillRect(x - 1.3 * u, chao - 2.36 * u, 2.6 * u, 0.13 * u);
}

function pagode(c, x, chao, u) {
    // pagode de pedra de vários andares
    c.fillStyle = "#2e3448";
    c.fillRect(x - 0.45 * u, chao - 0.3 * u, 0.9 * u, 0.3 * u);
    let y = chao - 0.3 * u;
    for (let i = 0; i < 5; i += 1) {
        const l = 0.32 - i * 0.04;
        c.fillStyle = "#3a425a";
        c.fillRect(x - l * u, y - 0.28 * u, l * 2 * u, 0.28 * u);
        c.fillStyle = "#262c40";
        c.beginPath();
        c.moveTo(x - (l + 0.14) * u, y - 0.28 * u);
        c.lineTo(x + (l + 0.14) * u, y - 0.28 * u);
        c.lineTo(x + (l + 0.08) * u, y - 0.36 * u);
        c.lineTo(x - (l + 0.08) * u, y - 0.36 * u);
        c.closePath();
        c.fill();
        y -= 0.36 * u;
    }
    c.fillRect(x - 0.03 * u, y - 0.35 * u, 0.06 * u, 0.35 * u);
}

function pinheiro(c, x, chao, ppm, h, semente) {
    // pinheiro coreano: tronco avermelhado curvo e copas em "almofadas"
    const r = aleatorio(semente);
    const curva = (r() - 0.5) * 0.8;
    c.strokeStyle = "#1e1418";
    c.lineCap = "round";
    c.lineWidth = ppm * 0.09;
    c.beginPath();
    c.moveTo(x, chao);
    c.quadraticCurveTo(x + curva * ppm, chao - h * ppm * 0.5, x + curva * ppm * 0.4, chao - h * ppm);
    c.stroke();
    for (let i = 0; i < 4; i += 1) {
        const t = 0.45 + i * 0.16;
        const px = x + curva * ppm * (2 * t * (1 - t) + 0.4 * t * t);
        const py = chao - h * ppm * t;
        const lado = i % 2 ? 1 : -1;
        const l = ppm * (0.5 - i * 0.07 + r() * 0.15);
        c.lineWidth = ppm * 0.035;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + lado * l * 0.8, py - ppm * 0.08);
        c.stroke();
        for (const [cor, dy, k] of [["#0b1414", 0.04, 1], ["#0f1c1c", 0, 0.85], ["#1e3438", -0.035, 0.55]]) {
            c.fillStyle = cor;
            c.beginPath();
            c.ellipse(px + lado * l * 0.7, py - ppm * (0.1 + dy), l * 0.75 * k, ppm * 0.12 * k, 0, 0, Math.PI * 2);
            c.fill();
        }
    }
}

const PETALAS = Array.from({ length: 30 }, (_, i) => {
    const r = aleatorio(100 + i);
    return { x: r(), y: r(), vel: 0.04 + r() * 0.05, fase: r() * 6, tam: 2 + r() * 2.5 };
});

const LANTERNAS = ["#ff5a6e", "#ffc53d", "#fff1d0", "#5fd8ff", "#ff5a6e", "#9dff6a", "#ffc53d"];
const hexRgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

function desenharTaekwondo(ctx, v, tempo) {
    ceu(ctx, v, [[0, "#03050e"], [0.5, "#0b1430"], [0.85, "#1c2a52"], [1, "#34386a"]]);
    estrelas(ctx, v, tempo, 0.6);
    lua(ctx, v.w * 0.78 - v.camX * v.ppm * 0.01, v.chao * 0.2, v.ppm * 0.17);

    camada(ctx, v, { chave: "tkd-m1", fator: 0.02, periodo: 14, topo: 3.4, fundo: 0.02, escala: 0.5 }, (c, ox) => {
        montanhas(c, v, ox, 14, { base: 0.6, alturas: [0.6, 1.9, 1.2, 2.7, 1.6, 2.3, 1.0, 1.7, 0.6], cor: "#1c2744", sombra: "#162038", luz: "rgba(190,210,255,0.4)", semente: 8, aguda: true });
    });
    nevoa(ctx, v, 1.4, "rgba(70,90,150,0.35)", 0.3);
    camada(ctx, v, { chave: "tkd-m2", fator: 0.06, periodo: 11, topo: 2.4, fundo: 0.02, escala: 0.5 }, (c, ox) => {
        montanhas(c, v, ox, 11, { base: 0.3, alturas: [0.4, 1.3, 0.8, 1.8, 1.0, 1.5, 0.6], cor: "#131b32", sombra: "#0f162a", luz: "rgba(170,195,255,0.35)", semente: 9, aguda: true });
    });
    // névoa a correr devagar entre os montes
    for (let i = 0; i < 3; i += 1) {
        const x = ((((tempo * (6 + i * 3) - v.camX * v.ppm * 0.05 + i * v.w * 0.4) % (v.w * 1.6)) + v.w * 1.6) % (v.w * 1.6)) - v.w * 0.3;
        const y = v.chao - (0.9 + i * 0.35) * v.ppm;
        const g = ctx.createRadialGradient(x, y, 0, x, y, v.ppm * 1.6);
        g.addColorStop(0, "rgba(150,170,230,0.2)");
        g.addColorStop(1, "rgba(150,170,230,0)");
        ctx.fillStyle = g;
        ctx.save();
        ctx.scale(1, 0.3);
        ctx.fillRect(x - v.ppm * 1.6, (y - v.ppm * 1.6) / 0.3, v.ppm * 3.2, (v.ppm * 3.2) / 0.3);
        ctx.restore();
    }
    nevoa(ctx, v, 0.9, "rgba(40,55,100,0.45)");
    camada(ctx, v, { chave: "tkd-m3", fator: 0.12, periodo: 8, topo: 1.4, fundo: 0.02, escala: 0.7 }, (c, ox) => {
        montanhas(c, v, ox, 8, { base: 0.05, alturas: [0.3, 0.8, 0.55, 1.0, 0.6, 0.9, 0.35], cor: "#0e1524", sombra: "#0b111e", semente: 10 });
        const r = aleatorio(12);
        for (let i = 0; i < 14; i += 1) {
            const px = ox + r() * 8 * v.ppm;
            c.fillStyle = r() < 0.5 ? "#0b121e" : "#09101a";
            c.beginPath();
            c.moveTo(px, v.chao - (0.3 + r() * 0.5) * v.ppm);
            c.lineTo(px + 0.12 * v.ppm, v.chao);
            c.lineTo(px - 0.12 * v.ppm, v.chao);
            c.closePath();
            c.fill();
        }
    });
    // pagode, pavilhão e pinheiros
    camada(ctx, v, { chave: "tkd-templo", fator: 0.3, periodo: 13, topo: 3.0, fundo: 0.02 }, (c, ox) => {
        pagode(c, ox + 1.2 * v.ppm, v.chao, v.ppm * 0.85);
        pavilhao(c, ox + 5.6 * v.ppm, v.chao, v.ppm * 0.8);
        pinheiro(c, ox + 3.0 * v.ppm, v.chao, v.ppm * 0.8, 2.8, 61);
        pinheiro(c, ox + 9.4 * v.ppm, v.chao, v.ppm * 0.8, 2.4, 62);
        pinheiro(c, ox + 11.6 * v.ppm, v.chao, v.ppm * 0.8, 3.0, 63);
    });
    // muro de pedra com telhado de telhas e cerejeira (perto)
    camada(ctx, v, { chave: "tkd-muro", fator: 0.85, periodo: 5, topo: 3.0, fundo: 0.02 }, (c, ox) => {
        const h = 0.75 * v.ppm;
        const L = 5 * v.ppm;
        const r = aleatorio(71);
        c.fillStyle = "#30364a";
        c.fillRect(ox, v.chao - h, L, h);
        // pedras irregulares
        for (let y = 0; y < 3; y += 1) {
            let x = ox - (y % 2) * 0.25 * v.ppm;
            while (x < ox + L) {
                const l = (0.35 + r() * 0.3) * v.ppm;
                const t = 0.85 + r() * 0.2;
                c.fillStyle = `rgb(${Math.round(62 * t)},${Math.round(68 * t)},${Math.round(92 * t)})`;
                c.beginPath();
                c.roundRect(x + 1.5, v.chao - h + y * h / 3 + 1.5, l - 3, h / 3 - 3, 4);
                c.fill();
                x += l;
            }
        }
        // telhado
        c.fillStyle = "#181a24";
        c.fillRect(ox - 2, v.chao - h - 0.14 * v.ppm, L + 4, 0.15 * v.ppm);
        c.fillStyle = "#12141c";
        for (let x = 0; x < L; x += v.ppm * 0.12) {
            c.beginPath();
            c.arc(ox + x + v.ppm * 0.06, v.chao - h - 0.01 * v.ppm, v.ppm * 0.045, 0, Math.PI);
            c.fill();
        }
        letreiro(c, ox + 1.3 * v.ppm, v.chao - h * 0.5, "태권도", v.ppm * 0.16, NEON.ciano);
        // cerejeira por cima do muro, iluminada de rosa
        c.strokeStyle = "#24161c";
        c.lineCap = "round";
        c.lineWidth = 0.1 * v.ppm;
        c.beginPath();
        c.moveTo(ox + 3.65 * v.ppm, v.chao - h);
        c.quadraticCurveTo(ox + 3.5 * v.ppm, v.chao - 1.6 * v.ppm, ox + 3.8 * v.ppm, v.chao - 2.1 * v.ppm);
        c.stroke();
        c.lineWidth = 0.04 * v.ppm;
        for (const [dx, dy] of [[-0.6, 2.2], [0.6, 2.3], [0.1, 2.6]]) {
            c.beginPath();
            c.moveTo(ox + 3.75 * v.ppm, v.chao - 1.9 * v.ppm);
            c.lineTo(ox + (3.7 + dx) * v.ppm, v.chao - dy * v.ppm);
            c.stroke();
        }
        c.save();
        // brilho rosa suave atrás da copa
        const brilho = c.createRadialGradient(ox + 3.75 * v.ppm, v.chao - 2.25 * v.ppm, 0, ox + 3.75 * v.ppm, v.chao - 2.25 * v.ppm, 1.3 * v.ppm);
        brilho.addColorStop(0, "rgba(255,110,190,0.22)");
        brilho.addColorStop(1, "rgba(255,110,190,0)");
        c.fillStyle = brilho;
        c.fillRect(ox + 2.45 * v.ppm, v.chao - 3.55 * v.ppm, 2.6 * v.ppm, 2.6 * v.ppm);
        // copa: muitos cachos pequenos (escuro em baixo, flores claras por cima)
        for (const [cor, k, sobe] of [["#4a2244", 1, 0], ["#7e3a6c", 0.85, 0.03], ["#c46a9e", 0.6, 0.06], ["#f4a8d0", 0.35, 0.09]]) {
            c.fillStyle = cor;
            const rr = aleatorio(72);
            for (let i = 0; i < 70; i += 1) {
                const a = rr() * Math.PI * 2;
                const d = Math.sqrt(rr());
                const y = 2.25 + Math.sin(a) * d * 0.42 + sobe;
                if (k < 0.5 && Math.sin(a) < -0.2) continue; // flores claras só em cima
                c.beginPath();
                c.arc(ox + (3.75 + Math.cos(a) * d * 0.9) * v.ppm, v.chao - y * v.ppm, v.ppm * 0.085 * k, 0, Math.PI * 2);
                c.fill();
            }
        }
        c.restore();
    });

    // lajes de granito irregulares, com musgo nas juntas
    const fundo = v.h - v.chao;
    camada(ctx, v, { chave: "tkd-chao", fator: 1, periodo: 4.5, topo: 0.01 }, (c, ox) => {
        const r = aleatorio(19);
        const L = 4.5 * v.ppm;
        const filas = [0, 0.3, 0.65, 1.0];
        for (let f = 0; f < filas.length - 1; f += 1) {
            const y0 = v.chao + fundo * filas[f];
            const y1 = v.chao + fundo * filas[f + 1];
            let x = ox - (f % 2) * 0.4 * v.ppm;
            while (x < ox + L) {
                const comp = (0.7 + r() * 0.6) * v.ppm;
                const t = 0.9 + r() * 0.14;
                const g = c.createLinearGradient(0, y0, 0, y1);
                g.addColorStop(0, `rgb(${Math.round(64 * t)},${Math.round(70 * t)},${Math.round(96 * t)})`);
                g.addColorStop(1, `rgb(${Math.round(44 * t)},${Math.round(48 * t)},${Math.round(70 * t)})`);
                c.fillStyle = g;
                c.beginPath();
                c.roundRect(x + 2, y0 + 2, comp - 4, y1 - y0 - 4, 5);
                c.fill();
                c.fillStyle = "rgba(160,180,255,0.08)";
                for (let k = 0; k < 6; k += 1) c.fillRect(x + r() * comp, y0 + r() * (y1 - y0), 2, 2);
                x += comp;
            }
        }
        c.globalCompositeOperation = "destination-over";
        c.fillStyle = "#151b28";
        c.fillRect(ox, v.chao, L, fundo);
        c.globalCompositeOperation = "source-over";
    });

    holofote(ctx, v, tempo, "190,210,255");
    // pétalas de cerejeira a cair (a apanhar a luz rosa)
    ctx.fillStyle = "rgba(255,160,210,0.85)";
    for (const p of PETALAS) {
        const y = ((p.y + tempo * p.vel) % 1) * v.h;
        const x = (((p.x * v.w + Math.sin(tempo + p.fase) * 30 - tempo * 20 - v.camX * v.ppm * 0.5) % v.w) + v.w) % v.w;
        ctx.beginPath();
        ctx.ellipse(x, y, p.tam, p.tam * 0.55, tempo * 1.5 + p.fase, 0, Math.PI * 2);
        ctx.fill();
    }
}

function primeiroPlanoTaekwondo(ctx, v, tempo) {
    // fio de lanternas de lótus no topo, a balançar com a brisa
    const per = 7 * v.ppm;
    const desvio = -((((v.camX * 1.15 * v.ppm) % per) + per) % per);
    const y = v.ppm * 0.04;
    ctx.save();
    for (let x0 = desvio - per; x0 < v.w + per; x0 += per) {
        ctx.strokeStyle = "rgba(10,10,20,0.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.quadraticCurveTo(x0 + per / 2, y + v.ppm * 0.25, x0 + per, y);
        ctx.stroke();
        LANTERNAS.forEach((cor, i) => {
            const t = (i + 0.5) / LANTERNAS.length;
            const lx = x0 + t * per;
            const ly = y + 4 * t * (1 - t) * v.ppm * 0.25;
            const ang = Math.sin(tempo * 1.3 + i * 0.9 + x0 * 0.001) * 0.08;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(ang);
            ctx.strokeStyle = "rgba(10,10,20,0.9)";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, v.ppm * 0.08);
            ctx.stroke();
            // halo da lanterna acesa
            const halo = ctx.createRadialGradient(0, v.ppm * 0.19, 0, 0, v.ppm * 0.19, v.ppm * 0.32);
            halo.addColorStop(0, hexRgba(cor, 0.45));
            halo.addColorStop(1, hexRgba(cor, 0));
            ctx.fillStyle = halo;
            ctx.fillRect(-v.ppm * 0.32, v.ppm * -0.13, v.ppm * 0.64, v.ppm * 0.64);
            const g = ctx.createRadialGradient(-v.ppm * 0.03, v.ppm * 0.17, 0, 0, v.ppm * 0.19, v.ppm * 0.13);
            g.addColorStop(0, "#fff6e0");
            g.addColorStop(0.5, cor);
            g.addColorStop(1, cor);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(0, v.ppm * 0.19, v.ppm * 0.1, v.ppm * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.45)";
            ctx.lineWidth = 1;
            for (const k of [-0.5, 0, 0.5]) {
                ctx.beginPath();
                ctx.ellipse(0, v.ppm * 0.19, v.ppm * 0.1 * Math.abs(k), v.ppm * 0.12, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = "#e8c35a";
            ctx.fillRect(-1.5, v.ppm * 0.31, 3, v.ppm * 0.07);
            ctx.restore();
        });
    }
    ctx.restore();
}

/** Vinheta suave nos cantos (dá profundidade e foca o centro). */
function vinheta(ctx, v) {
    const g = ctx.createRadialGradient(v.w / 2, v.h * 0.55, Math.min(v.w, v.h) * 0.45, v.w / 2, v.h * 0.55, Math.max(v.w, v.h) * 0.8);
    g.addColorStop(0, "rgba(4,3,14,0)");
    g.addColorStop(1, "rgba(4,3,14,0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, v.w, v.h);
}

const CENARIOS = { boxe: desenharBoxe, muaythai: desenharMuayThai, taekwondo: desenharTaekwondo };
const PRIMEIRO_PLANO = { boxe: primeiroPlanoBoxe, muaythai: primeiroPlanoMuayThai, taekwondo: primeiroPlanoTaekwondo };

/** Fundo (antes do lutador). v = { w, h, chao (px), ppm, camX (m) } */
export function desenharCenario(ctx, idArte, v, tempo) {
    (CENARIOS[idArte] || desenharBoxe)(ctx, v, tempo);
}

/** Primeiro plano e vinheta (depois do lutador e dos alvos). */
export function desenharPrimeiroPlano(ctx, idArte, v, tempo) {
    PRIMEIRO_PLANO[idArte]?.(ctx, v, tempo);
    vinheta(ctx, v);
}
