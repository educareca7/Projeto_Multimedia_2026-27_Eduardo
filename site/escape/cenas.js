// Cenários (SVG neon, 1600×900 por parede).
//
// Duas divisões:
//   Salão       0 Saída · 1 Jukebox · 2 Máquina de garra · 3 Balcão
//   Escritório  4 Secretária · 5 Cacifos   (porta PRIVADO no Balcão)
// Objetos interativos: elementos com data-alvo (clicáveis e focáveis).
// Estados visuais por classes no <svg>: .is-escuro (sem luz), .com-fusivel,
// .sem-fusivel-vaso, .sem-bilhete, .sem-cartao, .privado-aberto,
// .cofre-aberto, .sem-comando-pilhas, .codigo-certo, .porta-aberta.
// As marcas UV (símbolo + dígito) só aparecem dentro do círculo da lanterna.

export const PAREDES = [
    { sala: "salao", nome: "Saída" },
    { sala: "salao", nome: "Jukebox" },
    { sala: "salao", nome: "Máquina de garra" },
    { sala: "salao", nome: "Balcão" },
    { sala: "escritorio", nome: "Secretária" },
    { sala: "escritorio", nome: "Cacifos" },
];
export const SALAS = { salao: [0, 1, 2, 3], escritorio: [4, 5] };
export const NOME_SALA = { salao: "Salão", escritorio: "Escritório" };

/** Paredes com marca UV (pela ordem dos símbolos em dados.simbolos). */
export const PAREDES_UV = [0, 2, 4, 5];
export const POS_UV = { 0: [960, 655], 2: [1080, 690], 4: [1150, 650], 5: [330, 170] };

export const CORES_CABOS = [
    { id: "vermelho", nome: "vermelho", cor: "#ff4d6d" },
    { id: "azul", nome: "azul", cor: "#3d8bff" },
    { id: "amarelo", nome: "amarelo", cor: "#ffc53d" },
    { id: "verde", nome: "verde", cor: "#3dffa8" },
];

export const SIMBOLOS = ["estrela", "circulo", "triangulo", "losango"];

/** Forma SVG de um símbolo centrado em (x, y), raio r. */
export function simbolo(tipo, x, y, r, atributos = "") {
    switch (tipo) {
        case "estrela": {
            const p = [];
            for (let i = 0; i < 10; i += 1) {
                const a = -Math.PI / 2 + (i * Math.PI) / 5;
                const rr = i % 2 ? r * 0.45 : r;
                p.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`);
            }
            return `<polygon points="${p.join(" ")}" ${atributos}/>`;
        }
        case "circulo":
            return `<circle cx="${x}" cy="${y}" r="${r * 0.82}" ${atributos}/>`;
        case "triangulo":
            return `<polygon points="${x},${y - r} ${x + r * 0.95},${y + r * 0.7} ${x - r * 0.95},${y + r * 0.7}" ${atributos}/>`;
        default:
            return `<polygon points="${x},${y - r} ${x + r * 0.75},${y} ${x},${y + r} ${x - r * 0.75},${y}" ${atributos}/>`;
    }
}

const PIXEL = "font-family=\"'Arcade Pixel', monospace\"";
const SANS = "font-family=\"'Chakra Petch', sans-serif\"";

const alvo = (id, rotulo, conteudo, extra = "") =>
    `<g class="alvo ${extra}" data-alvo="${id}" data-rotulo="${rotulo}" tabindex="0" role="button" aria-label="${rotulo}">${conteudo}</g>`;

// ---------------------------------------------------------------------------
// Definições comuns
// ---------------------------------------------------------------------------
function defs() {
    return `
<defs>
  <linearGradient id="g-parede" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0a0919"/><stop offset=".65" stop-color="#141030"/><stop offset="1" stop-color="#1b1539"/>
  </linearGradient>
  <linearGradient id="g-parede-esc" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#191217"/><stop offset=".7" stop-color="#2a1d22"/><stop offset="1" stop-color="#33232a"/>
  </linearGradient>
  <linearGradient id="g-lambrim" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#16112f"/><stop offset="1" stop-color="#0d0a1f"/>
  </linearGradient>
  <linearGradient id="g-madeira" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5a3a26"/><stop offset="1" stop-color="#3b2417"/>
  </linearGradient>
  <linearGradient id="g-chao" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#110d22"/><stop offset="1" stop-color="#050409"/>
  </linearGradient>
  <linearGradient id="g-metal" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3a3f4e"/><stop offset=".5" stop-color="#565c70"/><stop offset="1" stop-color="#2e3240"/>
  </linearGradient>
  <linearGradient id="g-porta" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#2b3550"/><stop offset=".55" stop-color="#3a4668"/><stop offset="1" stop-color="#232b42"/>
  </linearGradient>
  <linearGradient id="g-vidro" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#14304f" stop-opacity=".9"/><stop offset="1" stop-color="#0a1426" stop-opacity=".95"/>
  </linearGradient>
  <linearGradient id="g-saida" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#bdf7ff"/><stop offset=".4" stop-color="#ffffff"/><stop offset="1" stop-color="#9ff0ff"/>
  </linearGradient>
  <linearGradient id="g-papel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e8e1cf"/><stop offset="1" stop-color="#cfc6ae"/>
  </linearGradient>
  <radialGradient id="g-candeeiro" cx=".5" cy="0" r="1">
    <stop offset="0" stop-color="#ffd89a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd89a" stop-opacity="0"/>
  </radialGradient>
  <pattern id="p-alcatifa" width="160" height="80" patternUnits="userSpaceOnUse">
    <rect width="160" height="80" fill="#0e0a1e"/>
    <path d="M10 20 q10 -14 20 0 t20 0" fill="none" stroke="#ff2bd6" stroke-opacity=".28" stroke-width="3"/>
    <path d="M90 55 l12 -18 l12 18 z" fill="none" stroke="#22e8ff" stroke-opacity=".25" stroke-width="3"/>
    <circle cx="130" cy="18" r="6" fill="none" stroke="#ffc53d" stroke-opacity=".22" stroke-width="3"/>
    <path d="M40 62 l14 6 M60 50 l6 14" stroke="#9b5cff" stroke-opacity=".25" stroke-width="3"/>
  </pattern>
  <pattern id="p-soalho" width="240" height="40" patternUnits="userSpaceOnUse">
    <rect width="240" height="40" fill="#2a1a12"/>
    <path d="M0 39 H240 M90 0 V40 M200 0 V20" stroke="#170e09" stroke-width="3"/>
    <path d="M10 14 q40 -4 70 2 M110 26 q40 4 80 -2" stroke="#3a261a" stroke-width="2" fill="none"/>
  </pattern>
  <pattern id="p-perigo" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="36" height="36" fill="#1b1b1b"/><rect width="18" height="36" fill="#f2c230"/>
  </pattern>
  <pattern id="p-grelha" width="14" height="14" patternUnits="userSpaceOnUse">
    <rect width="14" height="14" fill="#140c22"/><circle cx="7" cy="7" r="3" fill="#06040c"/>
  </pattern>
  <pattern id="p-cortica" width="20" height="20" patternUnits="userSpaceOnUse">
    <rect width="20" height="20" fill="#a77a4c"/><circle cx="5" cy="6" r="1.6" fill="#8c623a"/><circle cx="14" cy="15" r="1.4" fill="#bd9061"/>
  </pattern>
  <filter id="brilho" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="brilho-forte" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="12" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <radialGradient id="g-uv">
    <stop offset="0" stop-color="#b48cff" stop-opacity=".42"/>
    <stop offset=".6" stop-color="#9b5cff" stop-opacity=".18"/>
    <stop offset="1" stop-color="#9b5cff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="g-uv-mascara">
    <stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
  </radialGradient>
  <mask id="mascara-uv" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
    <rect width="1600" height="900" fill="#000"/>
    <circle class="uv-circulo" cx="-999" cy="-999" r="190" fill="url(#g-uv-mascara)"/>
  </mask>
  ${[[0.78, 0.2], [0.68, 0.28], [0.25, 0.6], [0.4, 0.4]].map(([cx, cy], i) => `<radialGradient id="g-sombra-${i}" cx="${cx}" cy="${cy}" r=".75">
    <stop offset="0" stop-color="#05030c" stop-opacity=".42"/><stop offset=".45" stop-color="#05030c" stop-opacity=".78"/><stop offset="1" stop-color="#030208" stop-opacity=".93"/>
  </radialGradient>`).join("")}
</defs>`;
}

// ---------------------------------------------------------------------------
// Estrutura comum de cada parede
// ---------------------------------------------------------------------------
function paredeSalao(i, conteudo) {
    return `
<g class="parede" data-parede="${i}">
  <rect width="1600" height="900" fill="url(#g-parede)"/>
  <g stroke="#221a44" stroke-width="3" fill="none">${Array.from({ length: 9 }, (_, k) => `<path d="M${k * 200} 60 V600"/>`).join("")}</g>
  <rect y="600" width="1600" height="160" fill="url(#g-lambrim)"/>
  <path d="M0 600 H1600" stroke="#2c2356" stroke-width="6"/>
  <path class="neon" d="M0 606 H1600" stroke="#9b5cff" stroke-width="3" stroke-opacity=".7" filter="url(#brilho)"/>
  ${Array.from({ length: 16 }, (_, k) => `<path d="M${k * 100 + 50} 616 V748" stroke="#1d1640" stroke-width="3"/>`).join("")}
  <path d="M0 760 H1600 V900 H0 Z" fill="url(#p-alcatifa)"/>
  <path d="M0 760 H1600 V900 H0 Z" fill="url(#g-chao)" opacity=".55"/>
  <path d="M0 760 H1600" stroke="#2a2350" stroke-width="5"/>
  <rect x="0" y="0" width="1600" height="38" fill="#08060f"/>
  <path class="neon" d="M60 48 H1540" stroke="${["#22e8ff", "#ff2bd6", "#22e8ff", "#ffc53d"][i]}" stroke-width="6" stroke-linecap="round" filter="url(#brilho)"/>
  ${conteudo}
  ${marcaUV(i)}
  <rect class="sombra" width="1600" height="900" fill="url(#g-sombra-${i})"/>
</g>`;
}

function paredeEscritorio(i, conteudo) {
    return `
<g class="parede parede--escritorio" data-parede="${i}">
  <rect width="1600" height="900" fill="url(#g-parede-esc)"/>
  <g stroke="#3a2a30" stroke-width="2" fill="none" opacity=".6">${Array.from({ length: 32 }, (_, k) => `<path d="M${k * 50 + 25} 40 V560"/>`).join("")}</g>
  <rect y="560" width="1600" height="200" fill="url(#g-madeira)"/>
  <path d="M0 560 H1600" stroke="#2a180f" stroke-width="10"/>
  ${Array.from({ length: 8 }, (_, k) => `<rect x="${k * 200 + 20}" y="590" width="160" height="140" rx="4" fill="none" stroke="#2a180f" stroke-width="4"/>`).join("")}
  <path d="M0 760 H1600 V900 H0 Z" fill="url(#p-soalho)"/>
  <path d="M0 760 H1600" stroke="#170e09" stroke-width="6"/>
  <rect x="0" y="0" width="1600" height="40" fill="#120c0e"/>
  <!-- candeeiro de teto -->
  <path d="M800 40 V90" stroke="#0b0708" stroke-width="4"/>
  <path d="M740 130 L770 90 H830 L860 130 Z" fill="#2c2a24" stroke="#0b0708" stroke-width="4"/>
  <path d="M740 130 L520 760 H1080 L860 130 Z" fill="url(#g-candeeiro)"/>
  ${conteudo}
  ${marcaUV(i)}
</g>`;
}

function marcaUV(i) {
    return `<g class="uv-marca" mask="url(#mascara-uv)" data-uv="${i}"></g>`;
}

/** Preenche as marcas UV com os símbolos e dígitos da partida. */
function preencherUV(svg, dados) {
    PAREDES_UV.forEach((p, k) => {
        const s = dados.simbolos[k];
        const [x, y] = POS_UV[p];
        const g = svg.querySelector(`.uv-marca[data-uv="${p}"]`);
        if (!g) return;
        g.innerHTML = `<g filter="url(#brilho)" fill="#d9b8ff" stroke="#d9b8ff">
      ${simbolo(s, x - 50, y - 20, 30, 'stroke-width="2"')}
      <text x="${x}" y="${y + 6}" font-size="74" ${PIXEL} stroke="none">${dados.digitos[s]}</text>
      <path d="M${x - 84} ${y + 30} q60 12 130 -4" fill="none" stroke-width="3" stroke-opacity=".6"/>
    </g>`;
    });
}

// ---------------------------------------------------------------------------
// 0 — Saída
// ---------------------------------------------------------------------------
function paredeSaida(dados) {
    const marcas = Array.from({ length: 60 }, (_, k) => {
        const a = (k / 60) * Math.PI * 2;
        const r1 = k % 5 ? 76 : 68;
        return `<path d="M${(250 + Math.cos(a) * r1).toFixed(1)} ${(240 + Math.sin(a) * r1).toFixed(1)} L${(250 + Math.cos(a) * 82).toFixed(1)} ${(240 + Math.sin(a) * 82).toFixed(1)}" stroke="#cfd3e8" stroke-width="${k % 5 ? 2 : 5}"/>`;
    }).join("");
    return `
  ${alvo("relogio", "Relógio de parede", `
    <circle cx="250" cy="240" r="96" fill="#1a1530" stroke="#3b3166" stroke-width="10"/>
    <circle cx="250" cy="240" r="86" fill="#e7e3d4"/>
    ${marcas}
    <line class="ponteiro-hora" x1="250" y1="240" x2="250" y2="190" stroke="#1a1530" stroke-width="9" stroke-linecap="round"/>
    <line class="ponteiro-min" x1="250" y1="240" x2="250" y2="170" stroke="#1a1530" stroke-width="6" stroke-linecap="round"/>
    <line class="ponteiro-seg" x1="250" y1="250" x2="250" y2="166" stroke="#ff4d6d" stroke-width="3"/>
    <circle cx="250" cy="240" r="8" fill="#ff4d6d"/>`)}
  ${alvo("cartaz", "Cartaz do torneio", `
    <rect x="150" y="372" width="250" height="214" rx="6" fill="#1c1036" stroke="#3d2a6e" stroke-width="6"/>
    <text x="275" y="420" text-anchor="middle" font-size="25" ${PIXEL} fill="#ff2bd6" class="neon" filter="url(#brilho)">TORNEIO</text>
    <text x="275" y="472" text-anchor="middle" font-size="38" ${PIXEL} fill="#22e8ff" class="neon" filter="url(#brilho)">${dados.ano}</text>
    <text x="275" y="510" text-anchor="middle" font-size="17" ${SANS} fill="#cfc8ff">O REI DO SALÃO</text>
    <path d="M178 528 H372" stroke="#3d2a6e" stroke-width="2"/>
    <text x="275" y="556" text-anchor="middle" font-size="15" ${SANS} fill="#ffc53d">♪ hino oficial: lado ${dados.ladoHino}</text>`)}

  <path d="M858 700 C 930 745 990 752 1040 752 L1370 752 Q1388 752 1388 734 V566" fill="none" stroke="#141019" stroke-width="12" stroke-linecap="round"/>
  <path class="cabo-porta" d="M858 700 C 930 745 990 752 1040 752 L1370 752 Q1388 752 1388 734 V566" fill="none" stroke="#ff2bd6" stroke-width="3" stroke-dasharray="10 14" stroke-opacity=".5"/>

  ${alvo("maquina", "Máquina ÚLTIMA FICHA", `
    <path d="M520 760 V335 L560 248 H820 L860 335 V760 Z" fill="#1d1238" stroke="#0b0716" stroke-width="6"/>
    <path class="neon" d="M534 752 V338 L570 262 H810 L846 338 V752" fill="none" stroke="#ff2bd6" stroke-width="4" filter="url(#brilho)"/>
    <rect x="562" y="262" width="256" height="58" rx="6" fill="#2a0f3f"/>
    <text class="neon" x="690" y="300" text-anchor="middle" font-size="21" ${PIXEL} fill="#ff2bd6" filter="url(#brilho)">ÚLTIMA FICHA</text>
    <rect x="565" y="338" width="250" height="196" rx="8" fill="#04040c" stroke="#2c2350" stroke-width="10"/>
    <g class="ecra-final ecra-final--codigo">
      <text x="690" y="412" text-anchor="middle" font-size="22" ${PIXEL} fill="#22e8ff" filter="url(#brilho)">INSERE O</text>
      <text x="690" y="474" text-anchor="middle" font-size="22" ${PIXEL} fill="#22e8ff" filter="url(#brilho)">CÓDIGO</text>
    </g>
    <g class="ecra-final ecra-final--jogo">
      <text x="690" y="412" text-anchor="middle" font-size="22" ${PIXEL} fill="#ffc53d" filter="url(#brilho)">AGUENTA</text>
      <text x="690" y="474" text-anchor="middle" font-size="22" ${PIXEL} fill="#ffc53d" filter="url(#brilho)">20 SEG.</text>
    </g>
    <g class="ecra-final ecra-final--fim">
      <text x="690" y="412" text-anchor="middle" font-size="22" ${PIXEL} fill="#3dffa8" filter="url(#brilho)">PORTA</text>
      <text x="690" y="474" text-anchor="middle" font-size="22" ${PIXEL} fill="#3dffa8" filter="url(#brilho)">ABERTA</text>
    </g>
    <path d="M530 560 H850 L876 622 H504 Z" fill="#2a1a4a" stroke="#0b0716" stroke-width="5"/>
    <circle cx="620" cy="588" r="12" fill="#121019"/><rect x="616" y="552" width="8" height="38" rx="4" fill="#cfd3e8"/><circle cx="620" cy="552" r="13" fill="#ff4d6d"/>
    <circle cx="720" cy="590" r="14" fill="#22e8ff" class="botao"/><circle cx="770" cy="590" r="14" fill="#ffc53d" class="botao"/>
    <rect x="640" y="652" width="100" height="70" rx="6" fill="#140d27" stroke="#3a2b62" stroke-width="4"/>
    <rect x="684" y="666" width="12" height="40" rx="3" fill="#ffc53d" class="ranhura"/>`)}

  <g class="emergencia" filter="url(#brilho)">
    <rect x="1120" y="212" width="160" height="54" rx="6" fill="#0d3b22" stroke="#3dffa8" stroke-width="4"/>
    <text x="1200" y="251" text-anchor="middle" font-size="30" ${PIXEL} fill="#3dffa8">SAÍDA</text>
  </g>

  ${alvo("porta", "Porta de saída", `
    <rect x="1045" y="288" width="310" height="472" fill="#0a0914" stroke="#2a2840" stroke-width="8"/>
    <g class="porta-luz">
      <rect x="1065" y="308" width="270" height="452" fill="url(#g-saida)"/>
      <path d="M1065 760 L960 900 H1440 L1335 760 Z" fill="#bff6ff" opacity=".35"/>
    </g>
    <g class="porta-folha">
      <rect x="1065" y="308" width="270" height="452" fill="url(#g-porta)" stroke="#151a2b" stroke-width="4"/>
      <rect x="1090" y="335" width="220" height="150" rx="4" fill="none" stroke="#56628a" stroke-width="4"/>
      <rect x="1090" y="600" width="220" height="130" rx="4" fill="none" stroke="#56628a" stroke-width="4"/>
      <rect x="1080" y="528" width="240" height="26" rx="10" fill="#9aa3bd" stroke="#4b5370" stroke-width="3"/>
    </g>`)}
  <g class="fechadura">
    <rect x="1366" y="470" width="46" height="100" rx="8" fill="#1d1d26" stroke="#3a3a4c" stroke-width="4"/>
    <circle class="led-porta" cx="1389" cy="494" r="9"/>
    <path d="M1377 520 h8 M1393 520 h8 M1377 536 h8 M1393 536 h8 M1377 552 h8 M1393 552 h8" stroke="#55556a" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

// ---------------------------------------------------------------------------
// 1 — Jukebox e quadro elétrico
// ---------------------------------------------------------------------------
function paredeJukebox() {
    const tubos = (x, cor) => `<rect class="neon" x="${x}" y="430" width="22" height="300" rx="11" fill="none" stroke="${cor}" stroke-width="5" filter="url(#brilho)"/>
      ${[0, 1, 2, 3].map((k) => `<circle class="bolha" cx="${x + 11}" cy="${700 - k * 70}" r="5" fill="${cor}" style="animation-delay:${-k * 0.7}s"/>`).join("")}`;
    return `
  ${alvo("jukebox", "Jukebox", `
    <path d="M270 760 V430 Q270 296 440 296 Q610 296 610 430 V760 Z" fill="#2a1638" stroke="#0e0816" stroke-width="7"/>
    <path class="neon" d="M296 748 V436 Q296 326 440 326 Q584 326 584 436 V748" fill="none" stroke="#ff2bd6" stroke-width="6" filter="url(#brilho)"/>
    <path class="neon" d="M320 748 V442 Q320 352 440 352 Q560 352 560 442 V748" fill="none" stroke="#ffc53d" stroke-width="3" filter="url(#brilho)"/>
    ${tubos(330, "#22e8ff")}${tubos(528, "#3dffa8")}
    <rect x="365" y="392" width="150" height="104" rx="12" fill="#0d0818" stroke="#3a2a55" stroke-width="4"/>
    <g class="discos">${[0, 1, 2].map((k) => `<ellipse cx="440" cy="${470 - k * 18}" rx="56" ry="9" fill="#05030a" stroke="#2c1f45" stroke-width="2"/>`).join("")}</g>
    <rect x="365" y="510" width="150" height="50" rx="6" fill="#e8e1cf" class="botao"/>
    ${[0, 1, 2, 3].map((k) => `<path d="M${375 + (k % 2) * 72} ${522 + Math.floor(k / 2) * 18} h58" stroke="#5b5470" stroke-width="5"/>`).join("")}
    <rect x="365" y="580" width="150" height="150" rx="12" fill="url(#p-grelha)" stroke="#3a2a55" stroke-width="4"/>`)}

  <g class="emergencia">
    <rect x="1080" y="214" width="60" height="22" rx="6" fill="#33121a"/>
    <ellipse class="emergencia__luz" cx="1110" cy="244" rx="26" ry="16" fill="#ff3b4f" filter="url(#brilho-forte)"/>
  </g>

  ${alvo("quadro", "Quadro elétrico", `
    <rect x="980" y="290" width="250" height="320" rx="8" fill="url(#g-metal)" stroke="#0c0c12" stroke-width="6"/>
    <rect x="996" y="306" width="218" height="288" rx="4" fill="none" stroke="#7a8096" stroke-width="3"/>
    <rect x="996" y="314" width="218" height="34" fill="url(#p-perigo)"/>
    <path d="M1080 380 l-28 62 h26 l-18 58 l46 -76 h-28 l20 -44 z" fill="#f2c230" stroke="#1b1b1b" stroke-width="4"/>
    <!-- encaixe do fusível -->
    <rect x="1140" y="380" width="56" height="110" rx="6" fill="#15171e" stroke="#7a8096" stroke-width="3"/>
    <g class="fusivel-no-quadro"><rect x="1154" y="396" width="28" height="78" rx="8" fill="#d8dde8" stroke="#2a2d38" stroke-width="3"/><rect x="1154" y="420" width="28" height="30" fill="#e0a030"/></g>
    <circle class="led-quadro" cx="1016" cy="574" r="9"/>
    ${CORES_CABOS.map((c, k) => `<path d="M${1030 + k * 42} 610 C ${1030 + k * 42} 680 ${1000 + k * 60} 700 ${990 + k * 70} 760" fill="none" stroke="${c.cor}" stroke-width="9" stroke-linecap="round" opacity=".75"/>`).join("")}`)}

  ${alvo("banco", "Banco alto", `
    <ellipse cx="1420" cy="560" rx="70" ry="18" fill="#3a2a5e" stroke="#0b0716" stroke-width="5"/>
    <path d="M1380 572 L1360 760 M1460 572 L1480 760 M1370 680 H1470" stroke="#8d93b8" stroke-width="8" stroke-linecap="round"/>`)}`;
}

// ---------------------------------------------------------------------------
// 2 — Máquina de garra
// ---------------------------------------------------------------------------
function peluche(x, y, cor, k) {
    return `<g><circle cx="${x}" cy="${y}" r="${30 + (k % 3) * 4}" fill="${cor}" stroke="#0b0716" stroke-width="3"/>
    <circle cx="${x - 16}" cy="${y - 28}" r="9" fill="${cor}" stroke="#0b0716" stroke-width="3"/><circle cx="${x + 16}" cy="${y - 28}" r="9" fill="${cor}" stroke="#0b0716" stroke-width="3"/>
    <circle cx="${x - 9}" cy="${y - 4}" r="4" fill="#0b0716"/><circle cx="${x + 9}" cy="${y - 4}" r="4" fill="#0b0716"/></g>`;
}

/** Cartão de acesso (ícone/desenho). */
export function cartaoSVG(x, y, escala = 1) {
    return `<g transform="translate(${x} ${y}) scale(${escala})">
    <rect x="-30" y="-19" width="60" height="38" rx="5" fill="#e9ecff" stroke="#0b0716" stroke-width="3"/>
    <rect x="-30" y="-8" width="60" height="9" fill="#26283a"/>
    <rect x="-24" y="6" width="22" height="8" rx="2" fill="#ff2bd6"/></g>`;
}

function paredeGarra() {
    const cores = ["#ff7eb6", "#7ee0ff", "#c3a6ff", "#ffd27e", "#8dffc0", "#ff9f7e", "#7ea6ff"];
    const pel = [];
    for (let k = 0; k < 9; k += 1) pel.push(peluche(620 + k * 37, 548 - (k % 2) * 26, cores[k % cores.length], k));
    return `
  ${alvo("plantas", "Vaso com uma planta", `
    <path d="M240 760 L222 640 H338 L320 760 Z" fill="#2b1b44" stroke="#0b0716" stroke-width="5"/>
    <ellipse cx="280" cy="642" rx="58" ry="10" fill="#1a1208"/>
    <g class="fusivel-vaso"><rect x="292" y="626" width="14" height="30" rx="5" fill="#d8dde8" transform="rotate(28 299 641)"/><circle cx="300" cy="632" r="10" fill="#ffffff" opacity=".35" class="brilho-fusivel"/></g>
    ${[[-50, -150], [-20, -190], [10, -170], [40, -140], [60, -100], [-70, -90]].map(([dx, dy]) => `<path d="M280 640 Q${280 + dx * 0.4} ${640 + dy * 0.5} ${280 + dx} ${640 + dy}" fill="none" stroke="#2f7a52" stroke-width="12" stroke-linecap="round"/>`).join("")}`)}

  ${alvo("garra", "Máquina de garra", `
    <rect x="556" y="176" width="408" height="584" rx="16" fill="#1b1435" stroke="#0b0818" stroke-width="7"/>
    <rect x="582" y="196" width="356" height="62" rx="12" fill="#2b1250"/>
    <text class="neon" x="760" y="241" text-anchor="middle" font-size="34" ${PIXEL} fill="#22e8ff" filter="url(#brilho)">GARRA</text>
    <rect x="588" y="270" width="344" height="306" rx="6" fill="url(#g-vidro)" stroke="#4a6a9a" stroke-width="5"/>
    <path d="M600 290 H920" stroke="#8aa0c8" stroke-width="5"/>
    <g>
      <line x1="700" y1="290" x2="700" y2="372" stroke="#c9d1e6" stroke-width="3"/>
      <rect x="684" y="290" width="32" height="14" rx="4" fill="#8aa0c8"/>
      <path d="M700 372 l-24 20 l6 26 M700 372 l24 20 l-6 26 M700 372 v40" fill="none" stroke="#dfe6f5" stroke-width="5" stroke-linecap="round"/>
    </g>
    ${pel.join("")}
    <g class="cartao-garra">${cartaoSVG(820, 500, 0.85)}</g>
    <path d="M600 470 L780 290" stroke="#ffffff" stroke-opacity=".07" stroke-width="40"/>
    <rect x="596" y="586" width="96" height="74" rx="6" fill="#06040c" stroke="#3a2b62" stroke-width="4"/>
    <text x="644" y="680" text-anchor="middle" font-size="16" ${SANS} fill="#8d93b8">PRÉMIO</text>
    <rect x="574" y="586" width="372" height="10" fill="#120c22"/>
    <rect x="712" y="600" width="232" height="70" rx="10" fill="#2a1a4a" stroke="#0b0716" stroke-width="4"/>
    <circle cx="770" cy="642" r="12" fill="#121019"/><rect x="766" y="606" width="8" height="38" rx="4" fill="#cfd3e8"/><circle cx="770" cy="606" r="12" fill="#22e8ff"/>
    <circle class="botao" cx="840" cy="636" r="17" fill="#ff4d6d"/>
    <rect class="ranhura" x="900" y="614" width="12" height="38" rx="3" fill="#ffc53d"/>
    <path class="neon" d="M570 700 H950" stroke="#ff2bd6" stroke-width="4" filter="url(#brilho)"/>`)}

  ${alvo("poster", "Poster de um jogo antigo", `
    <rect x="1130" y="250" width="250" height="340" rx="6" fill="#0f2238" stroke="#22e8ff" stroke-opacity=".5" stroke-width="5"/>
    <circle cx="1255" cy="370" r="70" fill="#ffc53d"/><path d="M1255 370 L1325 330 V410 Z" fill="#0f2238"/>
    ${[0, 1, 2].map((k) => `<circle cx="${1200 + k * 40}" cy="480" r="8" fill="#e9ecff"/>`).join("")}
    <text x="1255" y="555" text-anchor="middle" font-size="22" ${PIXEL} fill="#22e8ff">COME-COME</text>`)}`;
}

// ---------------------------------------------------------------------------
// 3 — Balcão, porta PRIVADO e recordes
// ---------------------------------------------------------------------------
function paredeBalcao(dados) {
    const linhas = dados.ranking.map((s, k) => {
        const y = 300 + k * 56;
        return `<text x="1150" y="${y + 9}" font-size="19" ${PIXEL} fill="#ffc53d">${k + 1}.</text>
      ${simbolo(s, 1204, y, 14, 'fill="#22e8ff"')}
      <text x="1228" y="${y + 9}" font-size="19" ${PIXEL} fill="#e9ecff">${dados.iniciais[k]}</text>
      <text x="1466" y="${y + 9}" text-anchor="end" font-size="19" ${PIXEL} fill="#ff2bd6">${dados.pontuacoes[k]}</text>`;
    }).join("");
    return `
  ${alvo("caixa", "Caixa registadora", `
    <path d="M182 515 V452 L212 420 H354 L370 452 V515 Z" fill="#3a2f55" stroke="#0b0716" stroke-width="5"/>
    <rect x="222" y="430" width="120" height="30" rx="4" fill="#0e2a1c"/>
    <text x="282" y="453" text-anchor="middle" font-size="20" ${PIXEL} fill="#3dffa8" class="neon">0,00</text>
    ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${220 + c * 30}" y="${470 + r * 14}" width="22" height="9" rx="2" fill="#cfd3e8"/>`).join("")).join("")}`)}
  ${alvo("frasco", "Frasco das fichas", `
    <path d="M418 515 V462 Q418 446 434 446 H490 Q506 446 506 462 V515 Z" fill="#9fd8ff" fill-opacity=".18" stroke="#9fd8ff" stroke-opacity=".6" stroke-width="4"/>
    <rect x="424" y="432" width="76" height="16" rx="4" fill="#ffc53d"/>`)}
  ${alvo("bilhete", "Um papel dobrado", `
    <path d="M560 512 L640 500 L660 514 L580 526 Z" fill="#efe9d8" stroke="#8c8270" stroke-width="2"/>
    <path d="M590 512 l40 -6" stroke="#8c8270" stroke-width="2"/>`, "bilhete-balcao")}

  <rect x="100" y="540" width="720" height="220" fill="#22183c" stroke="#0b0716" stroke-width="6"/>
  <rect x="80" y="512" width="760" height="32" rx="4" fill="#3a2a5e" stroke="#0b0716" stroke-width="5"/>
  <path class="neon" d="M88 548 H832" stroke="#ffc53d" stroke-width="4" filter="url(#brilho)"/>
  ${[0, 1, 2, 3].map((k) => `<rect x="${130 + k * 170}" y="585" width="140" height="140" rx="6" fill="none" stroke="#33285a" stroke-width="4"/>`).join("")}
  ${alvo("gavetas", "Gavetas do balcão", `<rect x="470" y="590" width="300" height="60" rx="5" fill="#2d2152" stroke="#4d3a80" stroke-width="4"/><rect x="590" y="612" width="60" height="8" rx="4" fill="#8d93b8"/>`)}

  ${alvo("privado", "Porta PRIVADO", `
    <rect x="880" y="300" width="200" height="460" fill="#0a0812" stroke="#2a2840" stroke-width="8"/>
    <g class="privado-luz"><rect x="892" y="312" width="176" height="448" fill="#ffd89a" opacity=".55"/><path d="M892 760 L850 900 H1110 L1068 760 Z" fill="#ffd89a" opacity=".18"/></g>
    <g class="privado-folha">
      <rect x="892" y="312" width="176" height="448" fill="#4a2f22" stroke="#1d120c" stroke-width="4"/>
      <rect x="912" y="340" width="136" height="160" rx="4" fill="none" stroke="#2d1b12" stroke-width="5"/>
      <rect x="912" y="540" width="136" height="190" rx="4" fill="none" stroke="#2d1b12" stroke-width="5"/>
      <rect x="930" y="392" width="100" height="38" rx="4" fill="#e9ecff"/>
      <text x="980" y="417" text-anchor="middle" font-size="12" ${PIXEL} fill="#c0392b">PRIVADO</text>
      <circle cx="1048" cy="530" r="9" fill="#cfa85a"/>
    </g>`)}
  <g class="leitor">
    <rect x="1092" y="470" width="34" height="56" rx="6" fill="#1d1d26" stroke="#3a3a4c" stroke-width="3"/>
    <rect x="1098" y="500" width="22" height="4" fill="#0b0b10"/>
    <circle class="led-privado" cx="1109" cy="484" r="6"/>
  </g>

  ${alvo("recordes", "Quadro de recordes", `
    <rect x="1140" y="170" width="350" height="420" rx="14" fill="#05040c" stroke="#2b2450" stroke-width="10"/>
    <text class="neon" x="1315" y="236" text-anchor="middle" font-size="30" ${PIXEL} fill="#ffc53d" filter="url(#brilho)">RECORDES</text>
    <g class="ecra-recordes">${linhas}</g>`)}`;
}

// ---------------------------------------------------------------------------
// 4 — Escritório: secretária
// ---------------------------------------------------------------------------
function paredeSecretaria(dados) {
    const dias = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
    const horario = dias.map((d, k) => {
        const y = 270 + k * 34;
        return `<text x="1000" y="${y}" font-size="20" ${SANS} font-weight="700" fill="#2a2440">${d}</text>
      <text x="1240" y="${y}" text-anchor="end" font-size="20" ${SANS} fill="#2a2440">${dados.horario[k]}</text>`;
    }).join("");
    return `
  ${alvo("horario", "Horário do salão", `
    <rect x="970" y="170" width="300" height="330" rx="6" fill="url(#g-papel)" stroke="#6b5a40" stroke-width="5"/>
    <text x="1120" y="222" text-anchor="middle" font-size="22" ${PIXEL} fill="#c0392b">HORÁRIO</text>
    ${horario}`)}

  ${alvo("arquivo", "Arquivo metálico", `
    <rect x="1300" y="400" width="150" height="360" rx="6" fill="url(#g-metal)" stroke="#0c0c12" stroke-width="5"/>
    ${[0, 1, 2].map((k) => `<rect x="1313" y="${420 + k * 112}" width="124" height="96" rx="4" fill="none" stroke="#2a2d38" stroke-width="3"/><rect x="1351" y="${452 + k * 112}" width="48" height="10" rx="4" fill="#2a2d38"/>`).join("")}`)}

  <!-- secretária -->
  <rect x="200" y="520" width="760" height="34" rx="4" fill="#6b4630" stroke="#2a180f" stroke-width="5"/>
  <rect x="230" y="554" width="200" height="206" fill="#4e321f" stroke="#2a180f" stroke-width="5"/>
  <rect x="730" y="554" width="200" height="206" fill="#4e321f" stroke="#2a180f" stroke-width="5"/>
  ${[0, 1, 2].map((k) => `<rect x="250" y="${570 + k * 62}" width="160" height="50" rx="3" fill="none" stroke="#2a180f" stroke-width="4"/><rect x="310" y="${590 + k * 62}" width="40" height="8" rx="3" fill="#cfa85a"/>`).join("")}

  ${alvo("computador", "Computador do gerente", `
    <path d="M380 512 L400 470 H560 L580 512 Z" fill="#cfc8b4" stroke="#2a2420" stroke-width="4"/>
    <rect x="360" y="270" width="240" height="205" rx="16" fill="#d8d1bc" stroke="#2a2420" stroke-width="5"/>
    <rect x="382" y="290" width="196" height="150" rx="10" fill="#061a10" stroke="#3a3428" stroke-width="5"/>
    <g class="ecra-pc">
      <text x="398" y="322" font-size="15" ${PIXEL} fill="#3dffa8">C:\\&gt; LOGIN_</text>
      <text x="398" y="352" font-size="13" ${SANS} fill="#3dffa8" opacity=".8">utilizador: gerente</text>
      <text x="398" y="376" font-size="13" ${SANS} fill="#3dffa8" opacity=".8">senha: ••••••</text>
    </g>
    <path d="M330 512 H630 L650 520 H310 Z" fill="#bfb8a4" stroke="#2a2420" stroke-width="3"/>
    <rect x="590" y="300" width="64" height="58" fill="#ffe873" stroke="#c9b13a" stroke-width="2" transform="rotate(8 622 329)"/>
    <text x="596" y="322" font-size="11" ${SANS} fill="#5b4b10" transform="rotate(8 622 329)">senha:</text>
    <text x="596" y="337" font-size="10" ${SANS} fill="#5b4b10" transform="rotate(8 622 329)">campeão</text>
    <text x="596" y="351" font-size="10" ${SANS} fill="#5b4b10" transform="rotate(8 622 329)">+ ano</text>`)}

  ${alvo("candeeiro", "Candeeiro de secretária", `
    <path d="M800 520 h80" stroke="#1b1b1b" stroke-width="8" stroke-linecap="round"/>
    <path d="M840 520 L820 430 L870 380" fill="none" stroke="#1b1b1b" stroke-width="7"/>
    <path d="M850 360 l50 30 l-30 30 z" fill="#2f6b4c" stroke="#0b0708" stroke-width="4"/>`)}
  ${alvo("cadeira", "Cadeira do gerente", `
    <rect x="490" y="560" width="160" height="130" rx="20" fill="#2a1e2c" stroke="#0b0708" stroke-width="5"/>
    <path d="M570 690 V740 M520 760 H620" stroke="#1b1b1b" stroke-width="10" stroke-linecap="round"/>`)}`;
}

// ---------------------------------------------------------------------------
// 5 — Escritório: cacifos, cofre e porta de volta
// ---------------------------------------------------------------------------
function paredeCacifos() {
    return `
  ${alvo("cacifos", "Cacifos dos funcionários", `
    ${[0, 1, 2].map((k) => `<rect x="${110 + k * 130}" y="250" width="120" height="510" rx="4" fill="url(#g-metal)" stroke="#0c0c12" stroke-width="5"/>
      ${[0, 1, 2, 3].map((r) => `<path d="M${130 + k * 130} ${290 + r * 14} h80" stroke="#2a2d38" stroke-width="4"/>`).join("")}
      <rect x="${200 + k * 130}" y="460" width="10" height="50" rx="4" fill="#2a2d38"/>`).join("")}`)}

  <!-- prateleira com televisão -->
  <rect x="560" y="420" width="380" height="20" fill="#6b4630" stroke="#2a180f" stroke-width="4"/>
  ${alvo("tv", "Televisão pequena", `
    <rect x="600" y="270" width="210" height="150" rx="14" fill="#2a2a30" stroke="#0b0708" stroke-width="5"/>
    <rect x="618" y="288" width="150" height="114" rx="10" fill="#0b0f14"/>
    <circle cx="790" cy="310" r="8" fill="#55556a"/><circle cx="790" cy="340" r="8" fill="#55556a"/>`)}
  ${alvo("comando", "Comando da televisão", `
    <rect x="840" y="398" width="70" height="22" rx="8" fill="#1b1b22" stroke="#0b0708" stroke-width="3"/>
    <circle cx="858" cy="409" r="4" fill="#ff4d6d"/><rect x="870" y="405" width="30" height="8" rx="3" fill="#55556a"/>`)}

  ${alvo("cofre", "Cofre", `
    <rect x="600" y="540" width="260" height="220" rx="10" fill="#2e3240" stroke="#0c0c12" stroke-width="6"/>
    <g class="cofre-porta">
      <rect x="620" y="558" width="220" height="184" rx="6" fill="url(#g-metal)" stroke="#1b1d26" stroke-width="4"/>
      <rect x="660" y="590" width="90" height="34" rx="4" fill="#061a10" stroke="#1b1d26" stroke-width="3"/>
      <text class="ecra-cofre" x="705" y="614" text-anchor="middle" font-size="16" ${PIXEL} fill="#ff4d6d">----</text>
      ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${666 + c * 26}" y="${638 + r * 26}" width="20" height="20" rx="3" fill="#cfd3e8"/>`).join("")).join("")}
      <path d="M800 620 v70" stroke="#1b1d26" stroke-width="10" stroke-linecap="round"/>
    </g>
    <g class="cofre-dentro"><rect x="620" y="558" width="220" height="184" rx="6" fill="#0b0c12"/><path d="M620 650 H840" stroke="#2e3240" stroke-width="4"/></g>`)}

  ${alvo("cortica", "Quadro de cortiça", `
    <rect x="960" y="190" width="300" height="230" rx="6" fill="url(#p-cortica)" stroke="#5a3a26" stroke-width="8"/>
    <rect x="985" y="215" width="110" height="80" fill="#e8e1cf" transform="rotate(-4 1040 255)"/>
    <rect x="1120" y="225" width="110" height="80" fill="#9fd8ff" transform="rotate(5 1175 265)"/>
    <rect x="1010" y="320" width="120" height="80" fill="#ffe873" transform="rotate(3 1070 360)"/>
    ${[[1040, 215], [1175, 225], [1070, 320]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#ff4d6d"/>`).join("")}`)}

  ${alvo("voltar", "Porta para o salão", `
    <rect x="1270" y="290" width="190" height="470" fill="#0a0812" stroke="#2a180f" stroke-width="8"/>
    <rect x="1282" y="302" width="166" height="458" fill="#4a2f22" stroke="#1d120c" stroke-width="4"/>
    <rect x="1300" y="330" width="130" height="170" rx="4" fill="none" stroke="#2d1b12" stroke-width="5"/>
    <rect x="1300" y="540" width="130" height="190" rx="4" fill="none" stroke="#2d1b12" stroke-width="5"/>
    <circle cx="1300" cy="530" r="9" fill="#cfa85a"/>
    <text x="1365" y="420" text-anchor="middle" font-size="16" ${PIXEL} fill="#cfa85a">SALÃO</text>`)}`;
}

/** Constrói as duas divisões (6 paredes) dentro do <svg>. */
export function construirCena(svg, dados) {
    svg.innerHTML = `${defs()}
${paredeSalao(0, paredeSaida(dados))}
${paredeSalao(1, paredeJukebox(dados))}
${paredeSalao(2, paredeGarra(dados))}
${paredeSalao(3, paredeBalcao(dados))}
${paredeEscritorio(4, paredeSecretaria(dados))}
${paredeEscritorio(5, paredeCacifos(dados))}
<circle class="uv-luz" cx="-999" cy="-999" r="200" fill="url(#g-uv)" pointer-events="none"/>`;
    preencherUV(svg, dados);
}

/** Ponteiros do relógio: começa às 2:50 e o alarme toca às 3:00. */
export function acertarRelogio(svg, decorrido) {
    const seg = 50 * 60 + decorrido; // segundos depois das 2:00
    const minutos = seg / 60;
    const ang = (el, graus) => el?.setAttribute("transform", `rotate(${graus} 250 240)`);
    ang(svg.querySelector(".ponteiro-seg"), (seg % 60) * 6);
    ang(svg.querySelector(".ponteiro-min"), minutos * 6);
    ang(svg.querySelector(".ponteiro-hora"), (2 + minutos / 60) * 30);
}
