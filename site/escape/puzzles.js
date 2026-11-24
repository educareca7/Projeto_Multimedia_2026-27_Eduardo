// Mini-puzzles da Última Ficha. Cada um preenche o corpo da janela (modal) e
// devolve uma função de limpeza (parar animações e teclas).
//
// ctx = { dados, estado, concluir(evento), mensagem(texto), anotar(id),
//         validar(enigma, tentativa) → Promise (resposta do servidor), fechar() }
// As soluções não estão no browser: cada tentativa é validada pelo servidor.
//   concluir("energia" | "ficha" | "cartao" | "garraSemTentativas" | "computador"
//            | "cofre" | "codigo" | "porta")

import { sons } from "./sons.js";
import { CORES_CABOS, simbolo } from "./cenas.js";

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, pai) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    pai?.append(e);
    return e;
};
const html = (tag, classe, texto) => {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
};

// ---------------------------------------------------------------------------
// 1. Quadro elétrico: ligar 4 cabos às 4 tomadas
// ---------------------------------------------------------------------------
export function quadro(corpo, ctx) {
    const { dados, estado } = ctx;
    // cor → tomada; fica no estado para os cabos não se desligarem ao fechar a janela
    const ligacoes = estado.cabosQuadro;
    let escolhido = null;

    const intro = html("p", "modal__texto", estado.energia
        ? "O disjuntor está ligado. A luz voltou."
        : "Clica num cabo e depois numa tomada (clicar numa tomada ocupada desliga-a). Com os 4 ligados, liga o disjuntor. A nota abre no caderno (tecla N) sem saíres daqui.");
    const svg = el("svg", { viewBox: "0 0 640 380", class: "puzzle-svg", role: "img", "aria-label": "Quadro elétrico" });
    el("rect", { x: 10, y: 10, width: 620, height: 360, rx: 14, fill: "#1c1f2a", stroke: "#4b5068", "stroke-width": 4 }, svg);
    const lampadas = el("g", {}, svg);
    for (let i = 0; i < 4; i += 1) el("circle", { cx: 260 + i * 40, cy: 40, r: 11, fill: "#2a2d38", stroke: "#0c0d12", "stroke-width": 3, class: "lampada" }, lampadas);
    el("text", { x: 320, y: 78, "text-anchor": "middle", fill: "#8d93b8", "font-size": 14, "font-family": "'Chakra Petch', sans-serif" }, svg).textContent = "LIGAÇÕES CERTAS";
    const camadaCabos = el("g", {}, svg);
    const faiscas = el("g", { class: "faiscas" }, svg);
    const ys = [130, 190, 250, 310];

    const fichas = CORES_CABOS.map((c, i) => {
        const g = el("g", { class: "ficha-cabo", tabindex: 0, role: "button", "aria-label": `Cabo ${c.nome}` }, svg);
        el("path", { d: `M20 ${ys[i]} H70`, stroke: c.cor, "stroke-width": 12, "stroke-linecap": "round" }, g);
        el("rect", { x: 70, y: ys[i] - 16, width: 44, height: 32, rx: 8, fill: c.cor, stroke: "#0c0d12", "stroke-width": 3 }, g);
        el("rect", { x: 112, y: ys[i] - 6, width: 14, height: 12, fill: "#cfd3e8" }, g);
        g.addEventListener("click", () => escolher(c.id));
        g.addEventListener("keydown", (e) => e.key === "Enter" && escolher(c.id));
        return g;
    });
    const tomadas = [1, 2, 3, 4].map((n, i) => {
        const g = el("g", { class: "tomada", tabindex: 0, role: "button", "aria-label": `Tomada ${n}` }, svg);
        el("rect", { x: 500, y: ys[i] - 24, width: 70, height: 48, rx: 8, fill: "#0c0d12", stroke: "#7a8096", "stroke-width": 3 }, g);
        el("circle", { cx: 520, cy: ys[i], r: 6, fill: "#2a2d38" }, g);
        el("text", { x: 600, y: ys[i] + 12, "text-anchor": "middle", fill: "#e9ecff", "font-size": 32, "font-family": "'Arcade Pixel', monospace" }, g).textContent = n;
        g.addEventListener("click", () => ligar(n));
        g.addEventListener("keydown", (e) => e.key === "Enter" && ligar(n));
        return g;
    });

    function escolher(cor) {
        if (estado.energia) return;
        escolhido = escolhido === cor ? null : cor;
        sons.selecionar();
        desenhar();
    }
    function ligar(n) {
        if (estado.energia) return;
        if (!escolhido) {
            // sem cabo na mão: desliga o que estiver nesta tomada
            const cor = Object.keys(ligacoes).find((k) => ligacoes[k] === n);
            if (!cor) return;
            delete ligacoes[cor];
            sons.tecla();
            desenhar();
            return;
        }
        for (const [cor, t] of Object.entries(ligacoes)) if (t === n) delete ligacoes[cor];
        ligacoes[escolhido] = n;
        escolhido = null;
        sons.tecla();
        desenhar();
    }
    function desenhar() {
        camadaCabos.replaceChildren();
        CORES_CABOS.forEach((c, i) => {
            fichas[i].classList.toggle("is-escolhido", escolhido === c.id);
            const n = ligacoes[c.id];
            if (!n) return;
            const y1 = ys[i];
            const y2 = ys[n - 1];
            el("path", { d: `M126 ${y1} C 300 ${y1}, 330 ${y2}, 515 ${y2}`, stroke: "#0c0d12", "stroke-width": 14, fill: "none", "stroke-linecap": "round" }, camadaCabos);
            el("path", { d: `M126 ${y1} C 300 ${y1}, 330 ${y2}, 515 ${y2}`, stroke: c.cor, "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, camadaCabos);
        });
        botao.disabled = estado.energia || Object.keys(ligacoes).length < 4;
        limpar.disabled = estado.energia || !Object.keys(ligacoes).length;
    }
    function acender(n, cor) {
        [...lampadas.children].forEach((l, i) => l.setAttribute("fill", i < n ? cor : "#2a2d38"));
    }

    const acoes = html("div", "modal__acoes");
    const limpar = html("button", "btn btn--ghost", "Desligar todos");
    limpar.type = "button";
    const botao = html("button", "btn btn--primary", "⚡ Ligar o disjuntor");
    botao.type = "button";
    acoes.append(limpar, botao);
    limpar.addEventListener("click", () => {
        for (const k of Object.keys(ligacoes)) delete ligacoes[k];
        escolhido = null;
        sons.tecla();
        desenhar();
    });
    botao.addEventListener("click", async () => {
        botao.disabled = true;
        const r = await ctx.validar("cabos", { ligacoes: { ...ligacoes } });
        botao.disabled = false;
        if (!r) return;
        const certas = r.certas;
        // apontar a tentativa no caderno (sem repetir a mesma combinação)
        const chave = CORES_CABOS.map((c) => ligacoes[c.id]).join("");
        if (!estado.tentativasCabos.some((t) => t.chave === chave)) {
            estado.tentativasCabos.unshift({ chave, lig: { ...ligacoes }, certas });
            ctx.anotar("cabos");
        }
        if (certas === 4) {
            acender(4, "#3dffa8");
            ctx.concluir("energia");
            setTimeout(ctx.fechar, 1100);
            return;
        }
        acender(certas, "#ffc53d");
        sons.faisca();
        faiscas.replaceChildren();
        for (let i = 0; i < 10; i += 1) {
            const x = 470 + Math.random() * 60;
            const y = 100 + Math.random() * 230;
            el("path", { d: `M${x} ${y} l${Math.random() * 30 - 15} ${Math.random() * 30 - 15}`, stroke: "#fff3a0", "stroke-width": 3 }, faiscas);
        }
        faiscas.classList.remove("is-ativa");
        void faiscas.getBoundingClientRect();
        faiscas.classList.add("is-ativa");
        ctx.mensagem(`Faísca! ${certas} de 4 ligações certas.`);
    });

    if (estado.energia) acender(4, "#3dffa8"); // os cabos certos ficaram em estado.cabosQuadro
    corpo.append(intro, svg, acoes);
    desenhar();
    const ultima = estado.tentativasCabos[0];
    if (ultima && !estado.energia && ultima.chave === CORES_CABOS.map((c) => ligacoes[c.id]).join("")) acender(ultima.certas, "#ffc53d");
    return () => {};
}

// ---------------------------------------------------------------------------
// 2. Jukebox: escolher a música certa (pista no cartaz do torneio)
// ---------------------------------------------------------------------------
const MELODIAS = [
    [0, 2, 4, 7, 4], [7, 5, 4, 2, 0], [0, 4, 7, 12, 7], [2, 5, 9, 5, 2],
    [4, 4, 7, 9, 7], [9, 7, 4, 2, 4], [0, 3, 7, 10, 7], [5, 9, 12, 9, 5],
];

export function jukebox(corpo, ctx) {
    const { dados } = ctx;
    let aTocar = false;
    let vivo = true;
    const temporizadores = [];
    const esperar = (ms) => new Promise((r) => temporizadores.push(setTimeout(r, ms)));

    const texto = html("p", "modal__texto", "A jukebox tem 8 discos. Escolhe um para tocar (os que já ouviste ficam marcados).");
    const lista = html("div", "discos-lista");
    const botoes = dados.musicas.map((m, i) => {
        const b = html("button", "disco");
        b.type = "button";
        b.innerHTML = `<span class="disco__codigo"></span><span class="disco__titulo"></span><span class="disco__info"></span>`;
        b.children[0].textContent = m.codigo;
        b.children[1].textContent = m.titulo;
        b.children[2].textContent = `${m.ano} · lado ${m.lado}`;
        b.classList.toggle("is-ouvido", ctx.estado.discosOuvidos.has(i));
        b.addEventListener("click", () => tocar(i));
        lista.append(b);
        return b;
    });
    const estadoTxt = html("p", "modal__estado", "");
    corpo.append(texto, lista, estadoTxt);

    async function tocar(i) {
        if (aTocar || !vivo) return;
        aTocar = true;
        botoes.forEach((b, k) => b.classList.toggle("is-a-tocar", k === i));
        estadoTxt.textContent = `♪ A tocar «${dados.musicas[i].titulo}»…`;
        for (const passo of MELODIAS[i % MELODIAS.length]) {
            if (!vivo) return;
            sons.notaMusica(passo);
            await esperar(190);
        }
        await esperar(250);
        botoes[i].classList.remove("is-a-tocar");
        ctx.estado.discosOuvidos.add(i);
        botoes[i].classList.add("is-ouvido");
        const r = vivo ? await ctx.validar("disco", { indice: i }) : null;
        if (r?.certo) {
            estadoTxt.textContent = "A jukebox acende-se toda e ouve-se um estalido lá dentro…";
            ctx.concluir("ficha");
            await esperar(1100);
            ctx.fechar();
            return;
        }
        estadoTxt.textContent = "A música acaba. Não acontece mais nada.";
        aTocar = false;
    }
    return () => {
        vivo = false;
        temporizadores.forEach(clearTimeout);
    };
}

// ---------------------------------------------------------------------------
// 3. Máquina de garra: largar a garra mesmo por cima do cartão
// ---------------------------------------------------------------------------
export function garra(corpo, ctx) {
    const { dados, estado } = ctx;
    const W = 640;
    const H = 420;
    const texto = html("p", "modal__texto", "A garra anda de um lado para o outro. Larga-a mesmo por cima do que queres apanhar.");
    const canvas = html("canvas", "puzzle-canvas");
    canvas.width = W;
    canvas.height = H;
    const info = html("p", "modal__estado", "");
    const acoes = html("div", "modal__acoes");
    const largar = html("button", "btn btn--primary", "Largar a garra (Espaço)");
    largar.type = "button";
    acoes.append(largar);
    corpo.append(texto, canvas, info, acoes);
    const c = canvas.getContext("2d");

    const chave = { x: 120 + dados.premioX * 400, y: 356 };
    const peluches = [];
    for (let k = 0; k < 10; k += 1) {
        const x = 140 + k * 50 + (k % 2) * 10;
        if (Math.abs(x - chave.x) < 30) continue;
        peluches.push({ x, y: 372 - (k % 3) * 14, cor: ["#ff7eb6", "#7ee0ff", "#c3a6ff", "#ffd27e", "#8dffc0", "#ff9f7e"][k % 6] });
    }
    const g = { x: 80, y: 60, dir: 1, fase: "mover", t: 0, apanhou: false, fecho: 0 };
    const VEL = 280;
    const TOPO = 60;
    const FUNDO = chave.y - 34;
    let ultimo = null;
    let raf = 0;
    let vivo = true;

    function atualizarInfo() {
        info.textContent = `Tentativas: ${estado.tentativasGarra}`;
    }
    atualizarInfo();

    function largarGarra() {
        if (g.fase !== "mover" || estado.tentativasGarra <= 0) return;
        g.fase = "descer";
        g.t = 0;
        sons.motor(0.7);
    }
    largar.addEventListener("click", largarGarra);
    const teclas = (e) => {
        if (e.code === "Space" || e.key === "Enter") {
            e.preventDefault();
            largarGarra();
        }
    };
    document.addEventListener("keydown", teclas);

    function passo(agora) {
        if (!vivo) return;
        const dt = ultimo === null ? 0 : Math.min(0.05, (agora - ultimo) / 1000);
        ultimo = agora;
        g.t += dt;
        if (g.fase === "mover") {
            g.x += g.dir * VEL * dt;
            if (g.x > W - 70) g.dir = -1;
            if (g.x < 150) g.dir = 1;
        } else if (g.fase === "descer") {
            g.y = TOPO + (FUNDO - TOPO) * Math.min(1, g.t / 0.7);
            if (g.t >= 0.7) {
                g.fase = "fechar";
                g.t = 0;
                g.apanhou = Math.abs(g.x - chave.x) <= 20;
                sons.agarrar();
            }
        } else if (g.fase === "fechar") {
            g.fecho = Math.min(1, g.t / 0.25);
            if (g.t >= 0.3) {
                g.fase = "subir";
                g.t = 0;
                sons.motor(0.7);
            }
        } else if (g.fase === "subir") {
            g.y = FUNDO - (FUNDO - TOPO) * Math.min(1, g.t / 0.7);
            if (g.t >= 0.7) {
                g.t = 0;
                if (g.apanhou) {
                    g.fase = "levar";
                    sons.motor(0.8);
                } else {
                    g.fase = "mover";
                    g.fecho = 0;
                    estado.tentativasGarra -= 1;
                    atualizarInfo();
                    sons.falhouGarra();
                    if (estado.tentativasGarra <= 0) {
                        info.textContent = "Acabaram as tentativas. Vais precisar de outra ficha.";
                        g.fase = "fim";
                        setTimeout(() => {
                            ctx.concluir("garraSemTentativas");
                            ctx.fechar();
                        }, 1200);
                    } else {
                        ctx.mensagem("Quase! A garra veio vazia.");
                    }
                }
            }
        } else if (g.fase === "levar") {
            g.x += (60 - g.x) * Math.min(1, dt * 4);
            if (Math.abs(g.x - 60) < 3) {
                g.fase = "soltar";
                g.t = 0;
                g.fecho = 0;
            }
        } else if (g.fase === "soltar") {
            if (g.t > 0.5 && !g.entregue) {
                g.entregue = true;
                ctx.concluir("cartao");
                setTimeout(ctx.fechar, 900);
            }
        }
        desenhar();
        raf = requestAnimationFrame(passo);
    }

    function desenhar() {
        c.clearRect(0, 0, W, H);
        const fundo = c.createLinearGradient(0, 0, 0, H);
        fundo.addColorStop(0, "#14304f");
        fundo.addColorStop(1, "#0a1426");
        c.fillStyle = fundo;
        c.fillRect(0, 0, W, H);
        // calha do prémio
        c.fillStyle = "#06040c";
        c.fillRect(20, 300, 80, 120);
        c.strokeStyle = "#ffc53d";
        c.lineWidth = 3;
        c.strokeRect(20, 300, 80, 120);
        c.fillStyle = "#ffc53d";
        c.font = "bold 13px 'Chakra Petch', sans-serif";
        c.textAlign = "center";
        c.fillText("PRÉMIO", 60, 292);
        // carril
        c.fillStyle = "#8aa0c8";
        c.fillRect(20, 40, W - 40, 8);
        // peluches e chave
        const chaveNaGarra = g.apanhou && ["subir", "levar", "soltar"].includes(g.fase);
        for (const p of peluches) {
            c.fillStyle = p.cor;
            c.strokeStyle = "#0b0716";
            c.lineWidth = 3;
            for (const [dx, dy, r] of [[0, 0, 26], [-14, -24, 8], [14, -24, 8]]) {
                c.beginPath();
                c.arc(p.x + dx, p.y + dy, r, 0, Math.PI * 2);
                c.fill();
                c.stroke();
            }
            c.fillStyle = "#0b0716";
            c.beginPath();
            c.arc(p.x - 8, p.y - 4, 3.5, 0, Math.PI * 2);
            c.arc(p.x + 8, p.y - 4, 3.5, 0, Math.PI * 2);
            c.fill();
        }
        let kx = chave.x;
        let ky = chave.y;
        if (chaveNaGarra) {
            kx = g.x;
            ky = g.y + 38;
        }
        if (g.fase === "soltar") {
            kx = 60;
            ky = Math.min(400, g.y + 38 + g.t * 600);
        }
        if (!(g.fase === "soltar" && g.t > 0.6)) desenharCartao(kx, ky);
        // garra
        c.strokeStyle = "#c9d1e6";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(g.x, 48);
        c.lineTo(g.x, g.y);
        c.stroke();
        c.fillStyle = "#8aa0c8";
        c.fillRect(g.x - 18, 36, 36, 16);
        const abre = 1 - g.fecho;
        c.strokeStyle = "#dfe6f5";
        c.lineWidth = 6;
        c.lineCap = "round";
        for (const s of [-1, 1]) {
            c.beginPath();
            c.moveTo(g.x, g.y);
            c.lineTo(g.x + s * (12 + 14 * abre), g.y + 18);
            c.lineTo(g.x + s * (4 + 10 * abre), g.y + 40);
            c.stroke();
        }
        // vidro
        c.fillStyle = "rgba(255,255,255,0.05)";
        c.beginPath();
        c.moveTo(0, 260);
        c.lineTo(260, 0);
        c.lineTo(330, 0);
        c.lineTo(0, 330);
        c.fill();
    }

    function desenharCartao(x, y) {
        c.save();
        c.translate(x, y);
        c.rotate(-0.15);
        c.shadowColor = "#e9ecff";
        c.shadowBlur = 10;
        c.fillStyle = "#e9ecff";
        c.strokeStyle = "#0b0716";
        c.lineWidth = 3;
        c.beginPath();
        c.roundRect(-26, -16, 52, 32, 4);
        c.fill();
        c.stroke();
        c.shadowBlur = 0;
        c.fillStyle = "#26283a";
        c.fillRect(-26, -7, 52, 8);
        c.fillStyle = "#ff2bd6";
        c.fillRect(-20, 5, 18, 7);
        c.restore();
    }

    raf = requestAnimationFrame(passo);
    return () => {
        vivo = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", teclas);
    };
}

// ---------------------------------------------------------------------------
// Teclado numérico genérico (máquina final e cofre)
// ---------------------------------------------------------------------------
// enigma: nome da validação no servidor ("cofre" ou "codigo")
function tecladoNumerico(corpo, { texto, enigma, aoCerto, msgErrado, tituloCerto = "CÓDIGO ACEITE", registo }, ctx) {
    let codigo = "";
    let bloqueado = false;
    const p = html("p", "modal__texto", texto);
    const historico = html("p", "teclado__historico", "");
    const mostrarHistorico = () => {
        historico.textContent = registo.length ? `Já tentaste: ${registo.join(" · ")}` : "";
    };
    mostrarHistorico();
    const visor = html("div", "visor");
    const casas = [0, 1, 2, 3].map(() => {
        const s = html("span", "visor__casa", "·");
        visor.append(s);
        return s;
    });
    const teclado = html("div", "teclado");
    for (const t of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"]) {
        const b = html("button", "teclado__tecla", t);
        b.type = "button";
        if (t === "OK") b.classList.add("teclado__tecla--ok");
        b.addEventListener("click", () => premir(t));
        teclado.append(b);
    }
    corpo.append(p, visor, teclado, historico);

    const mostrar = () => casas.forEach((s, i) => (s.textContent = codigo[i] ?? "·"));
    function premir(t) {
        if (bloqueado) return;
        if (t === "⌫") codigo = codigo.slice(0, -1);
        else if (t === "OK") return validar();
        else if (codigo.length < 4) codigo += t;
        sons.tecla();
        mostrar();
    }
    async function validar() {
        if (codigo.length < 4) return;
        bloqueado = true;
        const r = await ctx.validar(enigma, { codigo });
        bloqueado = false;
        if (!r) return;
        if (r.certo) {
            bloqueado = true;
            sons.codigoCerto();
            visor.classList.add("is-certo");
            p.textContent = tituloCerto;
            aoCerto();
        } else {
            sons.codigoErrado();
            visor.classList.remove("is-errado");
            void visor.offsetWidth;
            visor.classList.add("is-errado");
            p.textContent = "CÓDIGO ERRADO.";
            ctx.mensagem(msgErrado);
            if (!registo.includes(codigo)) {
                registo.unshift(codigo);
                if (registo.length > 8) registo.pop();
                mostrarHistorico();
                ctx.anotar("codigos");
            }
            codigo = "";
            mostrar();
        }
    }
    const teclas = (e) => {
        if (bloqueado) return;
        if (/^[0-9]$/.test(e.key)) premir(e.key);
        else if (e.key === "Backspace") premir("⌫");
        else if (e.key === "Enter") premir("OK");
        else return;
        e.preventDefault();
    };
    document.addEventListener("keydown", teclas);
    return () => document.removeEventListener("keydown", teclas);
}

// ---------------------------------------------------------------------------
// 4. Máquina final: código de 4 dígitos e depois squash de 20 s
// ---------------------------------------------------------------------------
export function maquinaFinal(corpo, ctx) {
    if (ctx.estado.codigoCerto) return squash(corpo, ctx);
    let limpezaJogo = null;
    const limparTeclado = tecladoNumerico(corpo, {
        texto: "O ecrã pede um código de 4 dígitos.",
        enigma: "codigo",
        registo: ctx.estado.tentativasCodigo.maquina,
        msgErrado: "O código não é esse.",
        tituloCerto: "CÓDIGO ACEITE. Prepara-te…",
        aoCerto: () => {
            ctx.concluir("codigo");
            setTimeout(() => {
                corpo.replaceChildren();
                limpezaJogo = squash(corpo, ctx);
            }, 1100);
        },
    }, ctx);
    return () => {
        limparTeclado();
        limpezaJogo?.();
    };
}

// ---------------------------------------------------------------------------
// 5. Computador do gerente: senha → email com a pista do cofre
// ---------------------------------------------------------------------------
export function computador(corpo, ctx) {
    const ecra = html("div", "pc");
    if (ctx.estado.computador) {
        mostrarEmail();
        corpo.append(ecra);
        return () => {};
    }
    ecra.innerHTML = `<p class="pc__linha">SALÃO ARCADE · SISTEMA v2.1</p>
      <p class="pc__linha">utilizador: <strong>gerente</strong></p>
      <label class="pc__linha">senha: <input class="pc__senha" type="text" maxlength="12" autocomplete="off" spellcheck="false"></label>
      <p class="pc__erro" aria-live="polite"></p>`;
    const acoes = html("div", "modal__acoes");
    const entrar = html("button", "btn btn--primary", "Entrar");
    entrar.type = "button";
    acoes.append(entrar);
    corpo.append(ecra, acoes);
    const campo = ecra.querySelector(".pc__senha");
    const erro = ecra.querySelector(".pc__erro");
    setTimeout(() => campo.focus(), 50);
    campo.addEventListener("input", () => sons.tecla());

    async function tentar() {
        const valor = campo.value.trim().toUpperCase().replace(/\s+/g, "");
        if (!valor) return;
        entrar.disabled = true;
        const r = await ctx.validar("senha", { senha: valor });
        entrar.disabled = false;
        if (!r) return;
        if (r.certo) {
            sons.codigoCerto();
            ctx.concluir("computador");
            acoes.remove();
            ecra.replaceChildren();
            mostrarEmail();
        } else if (valor) {
            sons.codigoErrado();
            erro.textContent = "SENHA INVÁLIDA";
            campo.value = "";
            ctx.mensagem("A senha não é essa.");
            const l = ctx.estado.tentativasSenha;
            if (!l.includes(valor)) {
                l.unshift(valor);
                if (l.length > 8) l.pop();
                ctx.anotar("senha");
            }
        }
    }
    entrar.addEventListener("click", tentar);
    campo.addEventListener("keydown", (e) => {
        if (e.key === "Enter") tentar();
        e.stopPropagation();
    });

    function mostrarEmail() {
        ecra.innerHTML = `<p class="pc__linha">CAIXA DE CORREIO · 1 mensagem</p>
          <div class="pc__email">
            <p><strong>De:</strong> Gerente &nbsp; <strong>Para:</strong> Equipa</p>
            <p><strong>Assunto:</strong> cofre</p>
            <p>Mudei o código do cofre. Agora é a hora a que fechamos ao domingo (só os números).
            E não deixem a lanterna sem pilhas outra vez!</p>
          </div>`;
    }
    return () => {};
}

// ---------------------------------------------------------------------------
// 6. Cofre
// ---------------------------------------------------------------------------
export function cofre(corpo, ctx) {
    return tecladoNumerico(corpo, {
        texto: "Um cofre com teclado de 4 dígitos.",
        enigma: "cofre",
        registo: ctx.estado.tentativasCodigo.cofre,
        msgErrado: "O cofre apita e continua fechado.",
        tituloCerto: "CLIQUE! O cofre abriu.",
        aoCerto: () => {
            ctx.concluir("cofre");
            setTimeout(ctx.fechar, 900);
        },
    }, ctx);
}

function squash(corpo, ctx) {
    const W = 640;
    const H = 400;
    const DURACAO = 20;
    const texto = html("p", "modal__texto", "Último desafio: aguenta 20 segundos sem deixar passar a bola. Move a raquete com o rato, o dedo ou ↑ ↓.");
    const canvas = html("canvas", "puzzle-canvas puzzle-canvas--retro");
    canvas.width = W;
    canvas.height = H;
    corpo.append(texto, canvas);
    const c = canvas.getContext("2d");
    const raquete = { y: H / 2, h: 90, w: 14, x: 30 };
    let bola;
    let tempo;
    let estadoJogo = "pronto"; // pronto | jogar | falhou | ganhou
    let pausa = 1.2;
    let teclas = { cima: false, baixo: false };
    let ultimo = null;
    let raf = 0;
    let vivo = true;

    function reiniciar() {
        const a = (Math.random() * 0.8 - 0.4);
        bola = { x: W / 2, y: H / 2, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, r: 8 };
        tempo = DURACAO;
        estadoJogo = "pronto";
        pausa = 1.2;
    }
    reiniciar();

    const mover = (e) => {
        const r = canvas.getBoundingClientRect();
        raquete.y = ((e.clientY - r.top) / r.height) * H;
    };
    canvas.addEventListener("pointermove", mover);
    canvas.addEventListener("pointerdown", mover);
    const teclaDown = (e) => {
        if (["ArrowUp", "w", "W"].includes(e.key)) teclas.cima = true;
        else if (["ArrowDown", "s", "S"].includes(e.key)) teclas.baixo = true;
        else return;
        e.preventDefault();
    };
    const teclaUp = (e) => {
        if (["ArrowUp", "w", "W"].includes(e.key)) teclas.cima = false;
        if (["ArrowDown", "s", "S"].includes(e.key)) teclas.baixo = false;
    };
    document.addEventListener("keydown", teclaDown);
    document.addEventListener("keyup", teclaUp);

    function passo(agora) {
        if (!vivo) return;
        const dt = ultimo === null ? 0 : Math.min(0.033, (agora - ultimo) / 1000);
        ultimo = agora;
        if (teclas.cima) raquete.y -= 520 * dt;
        if (teclas.baixo) raquete.y += 520 * dt;
        raquete.y = Math.max(raquete.h / 2, Math.min(H - raquete.h / 2, raquete.y));

        if (estadoJogo === "pronto" || estadoJogo === "falhou") {
            pausa -= dt;
            if (pausa <= 0) {
                if (estadoJogo === "falhou") reiniciar();
                else estadoJogo = "jogar";
            }
        } else if (estadoJogo === "jogar") {
            tempo -= dt;
            bola.x += bola.vx * dt;
            bola.y += bola.vy * dt;
            if (bola.y < bola.r) {
                bola.y = bola.r;
                bola.vy = Math.abs(bola.vy);
                sons.pongParede();
            }
            if (bola.y > H - bola.r) {
                bola.y = H - bola.r;
                bola.vy = -Math.abs(bola.vy);
                sons.pongParede();
            }
            if (bola.x > W - 20 - bola.r) {
                bola.x = W - 20 - bola.r;
                bola.vx = -Math.abs(bola.vx);
                sons.pongParede();
            }
            // raquete
            if (bola.vx < 0 && bola.x - bola.r <= raquete.x + raquete.w && bola.x > raquete.x && Math.abs(bola.y - raquete.y) <= raquete.h / 2 + bola.r) {
                const desvio = (bola.y - raquete.y) / (raquete.h / 2);
                const vel = Math.min(760, Math.hypot(bola.vx, bola.vy) * 1.07);
                const ang = desvio * 0.9;
                bola.vx = Math.cos(ang) * vel;
                bola.vy = Math.sin(ang) * vel;
                bola.x = raquete.x + raquete.w + bola.r;
                sons.pongRaquete();
            }
            if (bola.x < -20) {
                estadoJogo = "falhou";
                pausa = 1.2;
                sons.pongFalha();
                ctx.mensagem("A bola passou! O contador recomeça.");
            }
            if (tempo <= 0) {
                estadoJogo = "ganhou";
                ctx.concluir("porta");
                setTimeout(ctx.fechar, 1300);
            }
        }
        desenhar();
        raf = requestAnimationFrame(passo);
    }

    function desenhar() {
        c.fillStyle = "#020205";
        c.fillRect(0, 0, W, H);
        // parede da direita (néon)
        c.fillStyle = "#ff2bd6";
        c.shadowColor = "#ff2bd6";
        c.shadowBlur = 16;
        c.fillRect(W - 20, 0, 6, H);
        c.shadowBlur = 0;
        // linha central
        c.fillStyle = "rgba(255,255,255,0.15)";
        for (let y = 10; y < H; y += 30) c.fillRect(W / 2 - 2, y, 4, 16);
        // raquete e bola
        c.fillStyle = "#22e8ff";
        c.shadowColor = "#22e8ff";
        c.shadowBlur = 14;
        c.fillRect(raquete.x, raquete.y - raquete.h / 2, raquete.w, raquete.h);
        c.fillStyle = "#ffffff";
        c.shadowColor = "#ffffff";
        if (estadoJogo !== "falhou") c.fillRect(bola.x - bola.r, bola.y - bola.r, bola.r * 2, bola.r * 2);
        c.shadowBlur = 0;
        // tempo
        c.fillStyle = "#ffc53d";
        c.font = "40px 'Arcade Pixel', monospace";
        c.textAlign = "center";
        c.fillText(String(Math.max(0, Math.ceil(tempo))), W / 2 + 60, 56);
        c.font = "22px 'Arcade Pixel', monospace";
        c.fillStyle = "#e9ecff";
        if (estadoJogo === "pronto") c.fillText("PRONTO?", W / 2, H / 2 - 30);
        if (estadoJogo === "falhou") c.fillText("FALHASTE!", W / 2, H / 2 - 30);
        if (estadoJogo === "ganhou") {
            c.fillStyle = "#3dffa8";
            c.fillText("PORTA DESTRANCADA", W / 2, H / 2 - 30);
        }
    }

    raf = requestAnimationFrame(passo);
    return () => {
        vivo = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", teclaDown);
        document.removeEventListener("keyup", teclaUp);
    };
}

// ---------------------------------------------------------------------------
// Ver de perto: bilhete, cartaz, horário, cortiça e recordes
// ---------------------------------------------------------------------------
export function bilhete(corpo, ctx) {
    const papel = html("div", "papel papel--bilhete");
    papel.append(html("p", "papel__titulo", "Nota do eletricista"));
    papel.append(html("p", "papel__texto", "Troquei os cabos do quadro todos e não marquei nada. Para a próxima, lembra-te:"));
    const ul = html("ul", "papel__lista");
    for (const p of ctx.dados.pistasCabos) ul.append(html("li", "", p));
    papel.append(ul);
    papel.append(html("p", "papel__assinatura", "— Zé (tomadas de cima para baixo: 1, 2, 3, 4)"));
    corpo.append(papel);
    return () => {};
}

export function cartazTorneio(corpo, ctx) {
    const c = html("div", "cartaz-grande");
    c.innerHTML = `<p class="cartaz-grande__a pixel">TORNEIO</p>
      <p class="cartaz-grande__b pixel"></p>
      <p class="cartaz-grande__c">O REI DO SALÃO</p>
      <p class="cartaz-grande__d"></p>`;
    c.querySelector(".cartaz-grande__b").textContent = ctx.dados.ano;
    c.querySelector(".cartaz-grande__d").textContent = `♪ Hino oficial do torneio: a canção desse ano, lado ${ctx.dados.ladoHino} do disco`;
    corpo.append(html("p", "modal__texto", "Um cartaz antigo, já desbotado."), c);
    return () => {};
}

export function horario(corpo, ctx) {
    const dias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
    const tabela = html("table", "horario");
    dias.forEach((d, k) => {
        const tr = html("tr");
        tr.append(html("th", "", d), html("td", "", ctx.dados.horario[k]));
        tabela.append(tr);
    });
    corpo.append(html("p", "modal__texto", "Horário de funcionamento do salão."), tabela);
    return () => {};
}

export function cortica(corpo) {
    const quadro = html("div", "cortica");
    for (const [texto, cor] of [
        ["Turno da noite: desligar SEMPRE o disjuntor antes de sair.", "#e8e1cf"],
        ["Quem tirou as pilhas do comando? Há quem diga que foram parar à lanterna…", "#ffe873"],
        ["Frasco das fichas vazio outra vez. A última ficha ficou na jukebox.", "#9fd8ff"],
    ]) {
        const n = html("p", "nota", texto);
        n.style.background = cor;
        quadro.append(n);
    }
    corpo.append(html("p", "modal__texto", "Recados presos com pioneses."), quadro);
    return () => {};
}

export function recordes(corpo, ctx) {
    const texto = html("p", "modal__texto", "Os quatro melhores jogadores de sempre deste salão.");
    const lista = html("ol", "recordes");
    ctx.dados.ranking.forEach((s, k) => {
        const li = html("li");
        const svg = el("svg", { viewBox: "0 0 40 40", width: 34, height: 34, "aria-hidden": "true" });
        svg.innerHTML = simbolo(s, 20, 20, 16, 'fill="#22e8ff"');
        li.append(html("span", "recordes__pos", `${k + 1}.`), svg, html("span", "recordes__nome", ctx.dados.iniciais[k]), html("span", "recordes__pts", ctx.dados.pontuacoes[k]));
        lista.append(li);
    });
    corpo.append(texto, lista);
    return () => {};
}
