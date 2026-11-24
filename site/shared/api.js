// Ligação ao servidor Python (Flask). As regras, as soluções e as pontuações
// estão no servidor; o browser só envia o que o jogador fez e mostra a resposta.

const RAIZ = new URL("../api/", import.meta.url);

export class ErroApi extends Error {
    constructor(mensagem, estado) {
        super(mensagem);
        this.estado = estado;
    }
}

/** POST com JSON. Devolve a resposta já convertida (ou lança ErroApi). */
export async function enviar(caminho, dados = {}) {
    let resposta;
    try {
        resposta = await fetch(new URL(caminho, RAIZ), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados),
        });
    } catch {
        throw new ErroApi("Sem ligação ao servidor. Confirma que o app.py está a correr.", 0);
    }
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new ErroApi(corpo.erro || `Erro ${resposta.status} no servidor.`, resposta.status);
    return corpo;
}

/** GET que devolve JSON. */
export async function obter(caminho) {
    let resposta;
    try {
        resposta = await fetch(new URL(caminho, RAIZ));
    } catch {
        throw new ErroApi("Sem ligação ao servidor. Confirma que o app.py está a correr.", 0);
    }
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new ErroApi(corpo.erro || `Erro ${resposta.status} no servidor.`, resposta.status);
    return corpo;
}
