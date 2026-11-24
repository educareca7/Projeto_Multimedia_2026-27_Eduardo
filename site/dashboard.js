"use strict";

const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Atalhos de teclado: 1, 2, 3 abrem a máquina correspondente.
document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const cabinet = document.querySelector(`.cabinet[data-key="${event.key}"]`);
    if (cabinet) cabinet.click();
});

// As animações SMIL dos SVG não respeitam o CSS de "reduzir movimento": parar à mão.
if (reduzirMovimento) {
    document.querySelectorAll("svg").forEach((svg) => svg.pauseAnimations?.());
}

// ---------------------------------------------------------------------------
// Capa da máquina 1: globo a rodar, desenhado com os dados reais do mapa do jogo.
// ---------------------------------------------------------------------------
(async function globoDaCapa() {
    const canvas = document.querySelector(".cover__globe");
    const { d3, topojson } = window;
    if (!canvas || !d3 || !topojson) return;

    let atlas;
    try {
        const resposta = await fetch("geo/data/countries-110m.json");
        if (!resposta.ok) return;
        atlas = await resposta.json();
    } catch {
        return; // sem dados: fica só a ilustração por cima
    }

    const terra = topojson.feature(atlas, atlas.objects.land);
    const fronteiras = topojson.mesh(atlas, atlas.objects.countries, (a, b) => a !== b);
    const grelha = d3.geoGraticule10();
    const esfera = { type: "Sphere" };
    const PINO = [-3.7, 40.4]; // o país-mistério da capa (a pista fala de Espanha)

    const ctx = canvas.getContext("2d");
    const projecao = d3.geoOrthographic().clipAngle(90);
    const path = d3.geoPath(projecao, ctx);
    let largura = 0;
    let altura = 0;

    function redimensionar() {
        const caixa = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        largura = caixa.width;
        altura = caixa.height;
        canvas.width = Math.round(largura * dpr);
        canvas.height = Math.round(altura * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const raio = Math.min(largura, altura) * 0.4;
        projecao.scale(raio).translate([largura / 2, altura * 0.46]);
    }

    function desenhar(tempo) {
        const lambda = (tempo / 1000) * 14; // graus por segundo
        projecao.rotate([lambda - 20, -18]);
        ctx.clearRect(0, 0, largura, altura);

        // esfera com brilho
        const [cx, cy] = projecao.translate();
        const r = projecao.scale();
        const fundo = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
        fundo.addColorStop(0, "#14305a");
        fundo.addColorStop(1, "#060a1a");
        ctx.beginPath();
        path(esfera);
        ctx.fillStyle = fundo;
        ctx.fill();
        ctx.save();
        ctx.shadowColor = "#22e8ff";
        ctx.shadowBlur = 18;
        ctx.strokeStyle = "rgba(34, 232, 255, 0.9)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();

        // grelha
        ctx.beginPath();
        path(grelha);
        ctx.strokeStyle = "rgba(34, 232, 255, 0.13)";
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // terra
        ctx.beginPath();
        path(terra);
        ctx.fillStyle = "rgba(34, 232, 255, 0.16)";
        ctx.fill();
        ctx.strokeStyle = "rgba(34, 232, 255, 0.85)";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.beginPath();
        path(fronteiras);
        ctx.strokeStyle = "rgba(34, 232, 255, 0.3)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // pino magenta a pulsar (só quando está do lado visível)
        const centro = projecao.invert([cx, cy]);
        if (d3.geoDistance(PINO, centro) < Math.PI / 2 - 0.1) {
            const [px, py] = projecao(PINO);
            const fase = (tempo / 1400) % 1;
            ctx.beginPath();
            ctx.arc(px, py, 3 + fase * 16, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 43, 214, ${1 - fase})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.save();
            ctx.shadowColor = "#ff2bd6";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(px, py, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = "#ff2bd6";
            ctx.fill();
            ctx.restore();
        }
    }

    // Desenha logo após cada mudança de tamanho (mudar o tamanho limpa o canvas),
    // para a capa nunca ficar vazia mesmo que o ciclo de animação ainda não tenha corrido.
    redimensionar();
    desenhar(reduzirMovimento ? 0 : performance.now());
    new ResizeObserver(() => {
        redimensionar();
        desenhar(reduzirMovimento ? 0 : performance.now());
    }).observe(canvas);

    if (reduzirMovimento) {
        desenhar(0);
        return;
    }
    const ciclo = (tempo) => {
        desenhar(tempo);
        requestAnimationFrame(ciclo);
    };
    requestAnimationFrame(ciclo);
})();
