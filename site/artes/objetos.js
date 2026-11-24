// Alvos físicos do desafio: sacos que balançam, bola de reflexos com elásticos,
// tronco de bananeira e tábuas que partem. Cada objeto sabe:
//   testar(p)      se o ponto de impacto p (mundo, m) acerta na zona certa
//   atingir(p, f)  reação física ao golpe (f = força, m/s)
//   atualizar(dt)  física
//   desenhar(ctx, v, alfa)
//   topo           ponto onde se pendura a etiqueta com o golpe pedido
// A zona certa fica marcada com fita branca: é onde o golpe pedido acerta
// quando o lutador está na posição certa.

/** Que objeto aparece para cada técnica. */
export const OBJETO_POR_TECNICA = {
    boxe: { jab: "reflexos", direto: "reflexos", gancho: "pesado", uppercut: "uppercut", ganchoCorpo: "pesado" },
    muaythai: {
        jab: "thai", direto: "thai", cotovelo: "thai", joelhada: "thai", circular: "bananeira",
        teep: "thai", cotoveloGiro: "thai", giratorio: "thai", joelhoVoador: "thai",
    },
    taekwondo: {
        ap: "tabua", dollyo: "tabua", yeop: "tabua", naeryo: "tabua", jireugi: "tabua",
        dwit: "tabua", tornado: "tabua", huryeo: "tabua",
    },
};

/**
 * Chama aoBalanco(intensidade 0–1) sempre que o objeto inverte o sentido do
 * movimento (fim de cada balanço): é aí que as correntes chiam e o saco range.
 */
function balanco(obj, velocidade, amplitude, escala) {
    const sinal = Math.sign(velocidade);
    if (obj.sinalAnterior && sinal && sinal !== obj.sinalAnterior && Math.abs(amplitude) > escala * 0.08) {
        obj.aoBalanco?.(obj.tipo, Math.min(1, Math.abs(amplitude) / escala));
    }
    if (sinal) obj.sinalAnterior = sinal;
}

const CONTORNO = "#21140d";
const G = 9.8;

function contornar(ctx, largura = 2) {
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = largura;
    ctx.stroke();
}

/** Suporte em L de metal escuro: poste atrás do objeto e braço até ao ponto de suspensão. */
function suporte(ctx, v, xPoste, xBraco, yBraco) {
    ctx.save();
    ctx.fillStyle = "#34324a";
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 1.5;
    const w = 0.07 * v.ppm;
    ctx.beginPath();
    ctx.rect(v.X(xPoste) - w / 2, v.Y(yBraco + 0.06), w, v.Y(0) - v.Y(yBraco + 0.06));
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(Math.min(v.X(xBraco), v.X(xPoste)) - w / 2, v.Y(yBraco + 0.06), Math.abs(v.X(xPoste) - v.X(xBraco)) + w, w * 0.9);
    ctx.fill();
    ctx.stroke();
    // base
    ctx.fillStyle = "#1f1d2e";
    ctx.fillRect(v.X(xPoste) - w * 2.2, v.Y(0) - w * 0.5, w * 4.4, w * 0.5);
    ctx.restore();
}

function corrente(ctx, v, a, b) {
    ctx.save();
    ctx.strokeStyle = "#5b5b5b";
    ctx.lineWidth = 0.018 * v.ppm;
    ctx.setLineDash([0.03 * v.ppm, 0.015 * v.ppm]);
    ctx.beginPath();
    ctx.moveTo(v.X(a.x), v.Y(a.y));
    ctx.lineTo(v.X(b.x), v.Y(b.y));
    ctx.stroke();
    ctx.restore();
}

function fita(ctx, largura, y, alfa = 1) {
    // fita branca a marcar a zona (coordenadas já locais em px)
    ctx.save();
    ctx.globalAlpha *= alfa;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(-largura / 2, y - 5, largura, 10);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-largura / 2, y - 5, largura, 10);
    ctx.restore();
}

// ---------------------------------------------------------------------------
// Saco pendurado (pesado, tailandês comprido, uppercut) — pêndulo
// ---------------------------------------------------------------------------
class SacoPendurado {
    constructor(ponto, { comprimento, largura, acima, cor, forma = "cilindro" }) {
        this.comprimento = comprimento;
        this.largura = largura;
        this.cor = cor;
        this.forma = forma;
        this.corrente = 0.3;
        // a face da frente do saco fica no ponto de impacto
        this.cx = ponto.x + largura / 2 - 0.02;
        this.topoSaco = ponto.y + acima;
        this.pivo = { x: this.cx, y: this.topoSaco + this.corrente };
        this.zona = this.pivo.y - ponto.y; // distância ao longo do eixo até à zona
        this.theta = 0;
        this.omega = 0;
        this.topo = { x: this.cx, y: this.pivo.y + 0.1 };
    }

    eixo() {
        return { a: { x: Math.sin(this.theta), y: -Math.cos(this.theta) }, n: { x: Math.cos(this.theta), y: Math.sin(this.theta) } };
    }

    testar(p) {
        const { a, n } = this.eixo();
        const dx = p.x - this.pivo.x;
        const dy = p.y - this.pivo.y;
        const aoLongo = dx * a.x + dy * a.y;
        const atraves = dx * n.x + dy * n.y;
        const face = -this.largura / 2;
        return atraves >= face - 0.12 && atraves <= face + 0.17 && Math.abs(aoLongo - this.zona) <= 0.2;
    }

    atingir(_p, forca) {
        const L = this.corrente + this.comprimento * 0.6;
        this.omega += forca / L;
    }

    atualizar(dt) {
        const L = this.corrente + this.comprimento * 0.6;
        const alfa = -(G / L) * Math.sin(this.theta) - 1.6 * this.omega;
        this.omega += alfa * dt;
        this.theta += this.omega * dt;
        balanco(this, this.omega, this.theta, 0.3);
    }

    desenhar(ctx, v, alfa) {
        ctx.save();
        ctx.globalAlpha = alfa;
        suporte(ctx, v, this.cx + 0.6, this.cx, this.pivo.y);
        const { a } = this.eixo();
        const inicio = { x: this.pivo.x + a.x * this.corrente, y: this.pivo.y + a.y * this.corrente };
        corrente(ctx, v, this.pivo, inicio);
        ctx.translate(v.X(this.pivo.x), v.Y(this.pivo.y));
        ctx.rotate(-this.theta);
        const w = this.largura * v.ppm;
        const t = this.corrente * v.ppm;
        const h = this.comprimento * v.ppm;
        const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        g.addColorStop(0, this.cor[0]);
        g.addColorStop(0.45, this.cor[1]);
        g.addColorStop(1, this.cor[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        if (this.forma === "lagrima") {
            ctx.moveTo(-w * 0.22, t);
            ctx.lineTo(w * 0.22, t);
            ctx.bezierCurveTo(w * 0.25, t + h * 0.35, w * 0.6, t + h * 0.55, w * 0.5, t + h * 0.8);
            ctx.bezierCurveTo(w * 0.4, t + h * 1.02, -w * 0.4, t + h * 1.02, -w * 0.5, t + h * 0.8);
            ctx.bezierCurveTo(-w * 0.6, t + h * 0.55, -w * 0.25, t + h * 0.35, -w * 0.22, t);
        } else {
            ctx.roundRect(-w / 2, t, w, h, w * 0.18);
        }
        ctx.fill();
        contornar(ctx);
        // costuras / faixas
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 2;
        if (this.forma !== "lagrima") {
            for (const f of [0.1, 0.9]) {
                ctx.beginPath();
                ctx.moveTo(-w / 2 + 2, t + h * f);
                ctx.lineTo(w / 2 - 2, t + h * f);
                ctx.stroke();
            }
        }
        fita(ctx, this.forma === "lagrima" ? w * 0.95 : w, this.zona * v.ppm);
        ctx.restore();
    }
}

// ---------------------------------------------------------------------------
// Saco de reflexos (double-end bag): bola presa por dois elásticos — mola 2D
// ---------------------------------------------------------------------------
class SacoReflexos {
    constructor(ponto) {
        this.r = 0.115;
        this.centro0 = { x: ponto.x + this.r - 0.02, y: ponto.y };
        this.desvio = { x: 0, y: 0 };
        this.vel = { x: 0, y: 0 };
        this.ancoraCima = { x: this.centro0.x, y: ponto.y + 0.8 };
        this.topo = { x: this.centro0.x, y: this.ancoraCima.y + 0.08 };
    }

    get centro() {
        return { x: this.centro0.x + this.desvio.x, y: this.centro0.y + this.desvio.y };
    }

    testar(p) {
        const c = this.centro;
        return Math.hypot(p.x - c.x, p.y - c.y) <= this.r + 0.1 && p.x <= c.x + 0.04;
    }

    atingir(p, forca) {
        const c = this.centro;
        const d = Math.hypot(c.x - p.x, c.y - p.y) || 1;
        this.vel.x += ((c.x - p.x) / d) * forca * 1.6;
        this.vel.y += ((c.y - p.y) / d) * forca * 0.6;
    }

    atualizar(dt) {
        const k = 70;
        const amort = 3.5;
        this.vel.x += (-k * this.desvio.x - amort * this.vel.x) * dt;
        this.vel.y += (-k * this.desvio.y - amort * this.vel.y) * dt;
        this.desvio.x += this.vel.x * dt;
        this.desvio.y += this.vel.y * dt;
        balanco(this, this.vel.x, this.desvio.x, 0.15);
    }

    desenhar(ctx, v, alfa) {
        ctx.save();
        ctx.globalAlpha = alfa;
        suporte(ctx, v, this.centro0.x + 0.55, this.centro0.x, this.ancoraCima.y);
        const c = this.centro;
        // elásticos
        ctx.strokeStyle = "#2b2b2b";
        ctx.lineWidth = 0.014 * v.ppm;
        ctx.beginPath();
        ctx.moveTo(v.X(this.ancoraCima.x), v.Y(this.ancoraCima.y));
        ctx.lineTo(v.X(c.x), v.Y(c.y + this.r));
        ctx.moveTo(v.X(c.x), v.Y(c.y - this.r));
        ctx.lineTo(v.X(this.centro0.x), v.Y(0));
        ctx.stroke();
        // fixação no chão
        ctx.fillStyle = "#3a3a3a";
        ctx.fillRect(v.X(this.centro0.x) - 6, v.Y(0) - 4, 12, 4);
        // bola de couro
        const x = v.X(c.x);
        const y = v.Y(c.y);
        const r = this.r * v.ppm;
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
        g.addColorStop(0, "#e2665a");
        g.addColorStop(1, "#8e2a20");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.92, r, 0, 0, Math.PI * 2);
        ctx.fill();
        contornar(ctx);
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.35, r, 0, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.translate(x, y);
        fita(ctx, r * 1.7, 0, 0.9);
        ctx.restore();
    }
}

// ---------------------------------------------------------------------------
// Tronco de bananeira num suporte (treino tradicional de muay thai)
// ---------------------------------------------------------------------------
class Bananeira {
    constructor(ponto) {
        this.largura = 0.26;
        this.altura = 0.78;
        this.cx = ponto.x + this.largura / 2 - 0.02;
        this.cy = ponto.y;
        this.inclinacao = 0;
        this.velAng = 0;
        this.marcas = [];
        this.topo = { x: this.cx, y: this.cy + this.altura / 2 + 0.12 };
    }

    testar(p) {
        const face = this.cx - this.largura / 2;
        return p.x >= face - 0.12 && p.x <= face + 0.18 && Math.abs(p.y - this.cy) <= 0.22;
    }

    atingir(p, forca) {
        this.velAng += forca * 0.9;
        this.marcas.push(p.y - this.cy);
    }

    atualizar(dt) {
        this.velAng += (-90 * this.inclinacao - 6 * this.velAng) * dt;
        this.inclinacao += this.velAng * dt;
        balanco(this, this.velAng, this.inclinacao, 0.25);
    }

    desenhar(ctx, v, alfa) {
        ctx.save();
        ctx.globalAlpha = alfa;
        // suporte: poste e dois braços
        const xp = this.cx + 0.45;
        ctx.fillStyle = "#34324a";
        ctx.strokeStyle = CONTORNO;
        ctx.lineWidth = 1.5;
        const w = 0.07 * v.ppm;
        ctx.beginPath();
        ctx.rect(v.X(xp) - w / 2, v.Y(this.cy + this.altura / 2), w, v.Y(0) - v.Y(this.cy + this.altura / 2));
        ctx.fill();
        ctx.stroke();
        for (const dy of [0.25, -0.25]) {
            ctx.beginPath();
            ctx.rect(v.X(this.cx), v.Y(this.cy + dy) - w * 0.35, v.X(xp) - v.X(this.cx), w * 0.7);
            ctx.fill();
            ctx.stroke();
        }
        ctx.fillStyle = "#1f1d2e";
        ctx.fillRect(v.X(xp) - w * 2.2, v.Y(0) - w * 0.5, w * 4.4, w * 0.5);
        // tronco
        ctx.translate(v.X(this.cx), v.Y(this.cy));
        ctx.rotate(this.inclinacao * 0.25);
        const lw = this.largura * v.ppm;
        const lh = this.altura * v.ppm;
        const g = ctx.createLinearGradient(-lw / 2, 0, lw / 2, 0);
        g.addColorStop(0, "#c9c68a");
        g.addColorStop(0.5, "#a9b268");
        g.addColorStop(1, "#7e8b45");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(-lw / 2, -lh / 2, lw, lh, lw * 0.3);
        ctx.fill();
        contornar(ctx);
        ctx.strokeStyle = "rgba(70,80,30,0.45)";
        ctx.lineWidth = 1.2;
        for (const f of [-0.3, -0.1, 0.1, 0.3]) {
            ctx.beginPath();
            ctx.moveTo(lw * f, -lh / 2 + 4);
            ctx.lineTo(lw * f * 1.1, lh / 2 - 4);
            ctx.stroke();
        }
        // marcas dos pontapés
        ctx.fillStyle = "rgba(90,70,30,0.5)";
        for (const m of this.marcas) {
            ctx.beginPath();
            ctx.ellipse(-lw * 0.3, -m * v.ppm, lw * 0.22, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        fita(ctx, lw, 0, this.marcas.length ? 0.3 : 1);
        ctx.restore();
    }
}

// ---------------------------------------------------------------------------
// Tábua de madeira num suporte (quebra de tábuas no taekwondo)
// ---------------------------------------------------------------------------
class Tabua {
    constructor(ponto) {
        this.altura = 0.32;
        this.espessura = 0.035;
        this.cx = ponto.x + 0.02;
        this.cy = ponto.y;
        this.partida = false;
        this.metades = [];
        this.topo = { x: this.cx, y: this.cy + this.altura / 2 + 0.12 };
    }

    testar(p) {
        return !this.partida && Math.abs(p.x - this.cx) <= 0.16 && Math.abs(p.y - this.cy) <= 0.2;
    }

    atingir(p, forca) {
        if (this.partida) return;
        this.partida = true;
        const lado = p.y >= this.cy ? 1 : -1;
        this.metades = [1, -1].map((s) => ({
            x: this.cx,
            y: this.cy + s * this.altura / 4,
            vx: forca * (0.7 + Math.random() * 0.3),
            vy: s * (1.2 + Math.random()) + (s === lado ? 0.5 : 0),
            ang: 0,
            vAng: s * (6 + Math.random() * 6),
            s,
        }));
    }

    atualizar(dt) {
        for (const m of this.metades) {
            m.vy -= G * dt;
            m.x += m.vx * dt;
            m.y += m.vy * dt;
            m.ang += m.vAng * dt;
            if (m.y < 0.05) {
                m.y = 0.05;
                m.vy *= -0.3;
                m.vx *= 0.6;
                m.vAng *= 0.5;
            }
        }
    }

    desenharPeca(ctx, v, x, y, ang, h) {
        ctx.save();
        ctx.translate(v.X(x), v.Y(y));
        ctx.rotate(-ang);
        const w = 0.13 * v.ppm; // tábua vista a 3/4
        const lh = h * v.ppm;
        ctx.fillStyle = "#d9b27a";
        ctx.beginPath();
        ctx.moveTo(-w / 2, -lh / 2);
        ctx.lineTo(w / 2, -lh / 2 - w * 0.25);
        ctx.lineTo(w / 2, lh / 2 - w * 0.25);
        ctx.lineTo(-w / 2, lh / 2);
        ctx.closePath();
        ctx.fill();
        contornar(ctx, 1.5);
        ctx.fillStyle = "#b88a52";
        ctx.fillRect(-w / 2 - this.espessura * v.ppm, -lh / 2, this.espessura * v.ppm, lh);
        ctx.strokeStyle = "rgba(120,80,40,0.45)";
        ctx.lineWidth = 1;
        for (const f of [-0.2, 0.1, 0.3]) {
            ctx.beginPath();
            ctx.moveTo(-w / 2 + 3, lh * f);
            ctx.quadraticCurveTo(0, lh * f - 4, w / 2 - 3, lh * f - w * 0.2);
            ctx.stroke();
        }
        ctx.restore();
    }

    desenhar(ctx, v, alfa) {
        ctx.save();
        ctx.globalAlpha = alfa;
        // suporte: poste com dois braços que seguram a tábua
        const xp = this.cx + 0.42;
        const w = 0.06 * v.ppm;
        ctx.fillStyle = "#5b5f66";
        ctx.strokeStyle = CONTORNO;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(v.X(xp) - w / 2, v.Y(this.cy + this.altura / 2 + 0.05), w, v.Y(0) - v.Y(this.cy + this.altura / 2 + 0.05));
        ctx.fill();
        ctx.stroke();
        for (const dy of [this.altura / 2 + 0.02, -this.altura / 2 - 0.02]) {
            ctx.beginPath();
            ctx.rect(v.X(this.cx + 0.05), v.Y(this.cy + dy) - w * 0.3, v.X(xp) - v.X(this.cx + 0.05), w * 0.6);
            ctx.fill();
            ctx.stroke();
        }
        ctx.fillStyle = "#3d4046";
        ctx.fillRect(v.X(xp) - w * 2.4, v.Y(0) - w * 0.5, w * 4.8, w * 0.5);
        if (!this.partida) {
            this.desenharPeca(ctx, v, this.cx, this.cy, 0, this.altura);
            ctx.translate(v.X(this.cx), v.Y(this.cy));
            fita(ctx, 0.12 * v.ppm, 0);
        } else {
            for (const m of this.metades) this.desenharPeca(ctx, v, m.x, m.y, m.ang, this.altura / 2);
        }
        ctx.restore();
    }
}

/** Cria o objeto certo para uma técnica, posicionado no seu ponto de impacto. */
export function criarObjeto(idArte, idTecnica, ponto, aoBalanco = null) {
    const obj = fabricar(OBJETO_POR_TECNICA[idArte]?.[idTecnica] || "pesado", ponto);
    obj.aoBalanco = aoBalanco;
    return obj;
}

function fabricar(tipo, ponto) {
    switch (tipo) {
        case "reflexos": return Object.assign(new SacoReflexos(ponto), { tipo, forca: 2.2 });
        case "uppercut": return Object.assign(new SacoPendurado(ponto, { comprimento: 0.62, largura: 0.42, acima: 0.42, cor: ["#3a3a3a", "#5a5a5a", "#222"], forma: "lagrima" }), { tipo, forca: 2.6 });
        case "thai": return Object.assign(new SacoPendurado(ponto, { comprimento: 1.35, largura: 0.32, acima: ponto.y > 1.3 ? 0.25 : 0.55, cor: ["#c0392b", "#d9534f", "#8e2a20"] }), { tipo, forca: 2.8 });
        case "bananeira": return Object.assign(new Bananeira(ponto), { tipo, forca: 3.2 });
        case "tabua": return Object.assign(new Tabua(ponto), { tipo, forca: 3.4 });
        default: return Object.assign(new SacoPendurado(ponto, { comprimento: 0.95, largura: 0.36, acima: 0.32, cor: ["#2c3e50", "#3f5873", "#1b2836"] }), { tipo: "pesado", forca: 2.6 });
    }
}

/** Cor por categoria (etiquetas). */
export const COR_CATEGORIA = { soco: "#ff4d6d", cotovelo: "#ffc53d", joelho: "#ff8a3d", "pontapé": "#3dffa8", defesa: "#22e8ff" };
