/* ========================================
   1. CONSTANTES E CONFIGURAÇÕES
======================================== */

const STORAGE_KEY = "carrinho";
const TIPOS_VALIDOS = new Set(["individual", "combo", "resgate"]);

const DEFAULTS_TOTEM = {
    batata: "Batata média",
    bebida: "Coca-Cola",
    molho: "Sem molho"
};

const PRECO_BATATAS = {
    "Batata pequena": 10,
    "Batata média": 12,
    "Batata grande": 15
};

const PRECO_BEBIDAS = {
    "Coca-Cola": 8,
    "Coca-Cola Zero": 8,
    "Fanta Laranja": 8,
    "Fanta Guaraná": 8,
    "Sprite": 8,
    "Fanta": 8,
    "Suco de Laranja": 10,
    "Suco de Uva": 10,
    "Água": 5
};

const PRECO_MOLHOS = {
    "Sem molho": 0,
    "Ketchup": 0,
    "Mostarda": 0,
    "Barbecue": 0
};

const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});


/* ========================================
   2. ESTADO DA APLICAÇÃO
======================================== */

let carrinho = carregarCarrinho();
let finalizandoPedido = false;
let timerToastCarrinho = null;

const totem = {
    combo: null,
    etapa: 1,
    batata: DEFAULTS_TOTEM.batata,
    bebida: DEFAULTS_TOTEM.bebida,
    molho: DEFAULTS_TOTEM.molho
};


/* ========================================
   3. UTILITÁRIOS E PERSISTÊNCIA
======================================== */

function formatarDinheiro(valor) {
    return FORMATADOR_MOEDA.format(valor);
}

function criarElemento(tag, classe = "", texto = "") {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
}

function criarChave(produto) {
    return [
        produto.id,
        produto.tipo || "individual",
        produto.batata || "",
        produto.bebida || "",
        produto.molho || ""
    ].join("-");
}

function carregarCarrinho() {
    try {
        const dados = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(dados)) return [];

        return dados
            .filter(produto =>
                Number.isInteger(produto.id) &&
                typeof produto.nome === "string" &&
                Number.isFinite(produto.preco) &&
                produto.preco >= 0 &&
                Number.isInteger(produto.quantidade) &&
                produto.quantidade > 0
            )
            .map(produto => {
                const tipo = TIPOS_VALIDOS.has(produto.tipo)
                    ? produto.tipo
                    : "individual";

                const item = {
                    ...produto,
                    tipo,
                    batata: produto.batata || "",
                    bebida: produto.bebida || "",
                    molho: produto.molho || ""
                };

                item.chave = criarChave(item);
                return item;
            });
    } catch (erro) {
        console.error("Erro ao carregar carrinho:", erro);
        return [];
    }
}

function salvarCarrinho() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
}


/* ========================================
   4. CONTROLES VISUAIS DO CARD E TOTEM
======================================== */

function marcarBotaoAtivo(container, seletorBotoes, condicao) {
    if (!container) return;
    container.querySelectorAll(seletorBotoes).forEach(btn => {
        btn.classList.toggle("ativo", condicao(btn));
    });
}

function selecionarOpcaoVisual(botao) {
    const container = botao.closest(".opcoes-pedido");
    if (!container) return;

    const select = container.querySelector("select.tipo-pedido");
    marcarBotaoAtivo(container, ".opcao-btn", b => b === botao);

    if (select) {
        select.value = botao.dataset.valor;
        select.dispatchEvent(new Event("change"));
    }
}

function atualizarResumoTotem() {
    const resumo = document.getElementById("resumo-totem-texto");
    if (resumo) {
        resumo.textContent = `${totem.batata} • ${totem.bebida} • ${totem.molho}`;
    }
}

function selecionarItemTotem(botao) {
    const grid = botao.parentElement;
    marcarBotaoAtivo(grid, ".card-foto-totem", b => b === botao);

    const valor = botao.dataset.valor;
    const targetId = grid.dataset.target || botao.dataset.target;

    if (targetId === "modal-batata") {
        totem.batata = valor;
    } else if (targetId === "modal-bebida") {
        totem.bebida = valor;
    }

    const select = document.getElementById(targetId);
    if (select) select.value = valor;

    atualizarResumoTotem();
    atualizarPrecoModal();
}

function selecionarMolhoTotem(botao) {
    marcarBotaoAtivo(botao.parentElement, ".card-foto-totem", b => b === botao);
    totem.molho = botao.dataset.molho;

    atualizarResumoTotem();
    atualizarPrecoModal();
}

function irParaEtapaTotem(numero) {
    totem.etapa = numero;

    document.querySelectorAll(".totem-etapa").forEach((el, idx) => {
        el.hidden = (idx + 1) !== totem.etapa;
    });

    document.querySelectorAll(".totem-passo-ind").forEach((ind, idx) => {
        ind.classList.toggle("ativo", (idx + 1) <= totem.etapa);
    });

    const botoes = {
        "cancelar-modal-combo": totem.etapa !== 1,
        "btn-voltar-etapa": totem.etapa === 1,
        "btn-avancar-etapa": totem.etapa === 3,
        "confirmar-modal-combo": totem.etapa !== 3
    };

    Object.entries(botoes).forEach(([id, esconder]) => {
        const el = document.getElementById(id);
        if (el) el.hidden = esconder;
    });
}

function mudarEtapaTotem(direcao) {
    const proxima = totem.etapa + direcao;
    if (proxima >= 1 && proxima <= 3) {
        irParaEtapaTotem(proxima);
    }
}

function resetarSelecoesVisuaisModal() {
    totem.batata = DEFAULTS_TOTEM.batata;
    totem.bebida = DEFAULTS_TOTEM.bebida;
    totem.molho = DEFAULTS_TOTEM.molho;

    const selectBatata = document.getElementById("modal-batata");
    const selectBebida = document.getElementById("modal-bebida");
    if (selectBatata) selectBatata.value = totem.batata;
    if (selectBebida) selectBebida.value = totem.bebida;

    marcarBotaoAtivo(
        document.getElementById("etapa-combo-1"),
        ".card-foto-totem",
        b => b.dataset.valor === totem.batata
    );
    marcarBotaoAtivo(
        document.getElementById("etapa-combo-2"),
        ".card-foto-totem",
        b => b.dataset.valor === totem.bebida
    );
    marcarBotaoAtivo(
        document.getElementById("etapa-combo-3"),
        ".card-foto-totem",
        b => b.dataset.molho === totem.molho
    );

    irParaEtapaTotem(1);
    atualizarResumoTotem();
}


/* ========================================
   5. MODAL DO COMBO E CÁLCULO DE PREÇO
======================================== */

function abrirModalCombo(seletor) {
    const cartao = seletor.closest(".cardapio-item");
    const botao = cartao?.querySelector(".botao-adicionar");
    const modal = document.getElementById("modal-combo");

    if (!modal || !botao) return;

    totem.combo = {
        id: Number(botao.dataset.id),
        nome: botao.dataset.nome,
        preco: Number(botao.dataset.preco),
        precoCombo: Number(botao.dataset.precoCombo),
        seletor
    };

    const nomeProduto = document.getElementById("modal-nome-produto");
    if (nomeProduto) nomeProduto.textContent = totem.combo.nome;

    resetarSelecoesVisuaisModal();
    atualizarPrecoModal();

    modal.hidden = false;
    document.body.style.overflow = "hidden";
}

function fecharModalCombo() {
    const modal = document.getElementById("modal-combo");
    if (!modal || modal.hidden) return;

    modal.hidden = true;
    document.body.style.overflow = "";

    // Restaura o seletor do card para "Só lanche"
    if (totem.combo?.seletor) {
        totem.combo.seletor.value = "individual";
        const container = totem.combo.seletor.closest(".opcoes-pedido");
        marcarBotaoAtivo(container, ".opcao-btn", b => b.dataset.valor === "individual");
    }

    totem.combo = null;
}

function calcularPrecoCombo(precoBase, batata, bebida, molho = DEFAULTS_TOTEM.molho) {
    const precoBatata = PRECO_BATATAS[batata];
    const precoBebida = PRECO_BEBIDAS[bebida];
    const precoMolho = PRECO_MOLHOS[molho] ?? 0;

    if (
        !Number.isFinite(precoBase) ||
        precoBatata === undefined ||
        precoBebida === undefined
    ) {
        return 0;
    }

    const difBatata = precoBatata - PRECO_BATATAS[DEFAULTS_TOTEM.batata];
    const difBebida = precoBebida - PRECO_BEBIDAS[DEFAULTS_TOTEM.bebida];

    return precoBase + difBatata + difBebida + precoMolho;
}

function atualizarPrecoModal() {
    if (!totem.combo) return;

    const preco = calcularPrecoCombo(
        totem.combo.precoCombo,
        totem.batata,
        totem.bebida,
        totem.molho
    );

    const elementoPreco = document.getElementById("modal-preco-combo");
    if (elementoPreco) {
        elementoPreco.textContent = formatarDinheiro(preco);
    }
}

function confirmarCombo() {
    if (!totem.combo) return;

    const preco = calcularPrecoCombo(
        totem.combo.precoCombo,
        totem.batata,
        totem.bebida,
        totem.molho
    );

    adicionarCarrinho({
        id: totem.combo.id,
        nome: totem.combo.nome,
        preco,
        tipo: "combo",
        batata: totem.batata,
        bebida: totem.bebida,
        molho: totem.molho
    });

    fecharModalCombo();
}


/* ========================================
   6. FEEDBACK VISUAL (TOAST E ANIMAÇÕES)
======================================== */

function reiniciarAnimacao(elemento, classe) {
    elemento.classList.remove(classe);
    void elemento.offsetWidth; // Força reflow para reiniciar animação CSS
    elemento.classList.add(classe);
}

function obterOuCriarToast() {
    let toast = document.getElementById("toast-carrinho");
    if (toast) return toast;

    toast = criarElemento("div", "toast-carrinho");
    toast.id = "toast-carrinho";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const icone = criarElemento("div", "toast-icone", "✓");
    const textoWrap = criarElemento("div", "toast-texto");
    const titulo = criarElemento("strong", "", "Adicionado ao carrinho!");
    const subtitulo = criarElemento("span");
    const barra = criarElemento("div", "toast-barra");

    textoWrap.append(titulo, subtitulo);
    toast.append(icone, textoWrap, barra);
    document.body.appendChild(toast);

    return toast;
}

function mostrarNotificacaoCarrinho(produto, botaoClicado = null) {
    const botaoTopo = document.querySelector(".botao-carrinho");
    if (botaoTopo) {
        reiniciarAnimacao(botaoTopo, "animar-pulo");
    }

    if (botaoClicado) {
        const textoOriginal = botaoClicado.dataset.textoOriginal || botaoClicado.textContent;
        botaoClicado.dataset.textoOriginal = textoOriginal;
        botaoClicado.textContent = "Adicionado! ✓";
        botaoClicado.classList.add("adicionado");

        clearTimeout(botaoClicado._timerFeedback);
        botaoClicado._timerFeedback = setTimeout(() => {
            botaoClicado.textContent = textoOriginal;
            botaoClicado.classList.remove("adicionado");
        }, 1000);
    }

    const toast = obterOuCriarToast();
    const tituloItem = produto.tipo === "combo" ? `Combo ${produto.nome}` : produto.nome;
    toast.querySelector("span").textContent = `${tituloItem} • ${formatarDinheiro(produto.preco)}`;

    reiniciarAnimacao(toast, "visivel");

    clearTimeout(timerToastCarrinho);
    timerToastCarrinho = setTimeout(() => {
        toast.classList.remove("visivel");
    }, 2800);
}


/* ========================================
   7. OPERAÇÕES E RENDERIZAÇÃO DO CARRINHO
======================================== */

function adicionarCarrinho(produto, botaoClicado = null) {
    if (
        !Number.isInteger(produto.id) ||
        !produto.nome ||
        !Number.isFinite(produto.preco) ||
        produto.preco < 0
    ) {
        return;
    }

    const novoProduto = {
        ...produto,
        quantidade: 1
    };
    novoProduto.chave = criarChave(novoProduto);

    const existente = carrinho.find(item => item.chave === novoProduto.chave);
    if (existente) {
        existente.quantidade++;
    } else {
        carrinho.push(novoProduto);
    }

    salvarCarrinho();
    mostrarCarrinho();
    mostrarNotificacaoCarrinho(novoProduto, botaoClicado);
}

function alterarQuantidade(chave, delta) {
    const produto = carrinho.find(item => item.chave === chave);
    if (!produto) return;

    produto.quantidade += delta;

    if (produto.quantidade <= 0) {
        removerProduto(chave);
        return;
    }

    salvarCarrinho();
    mostrarCarrinho();
}

function removerProduto(chave) {
    carrinho = carrinho.filter(item => item.chave !== chave);
    salvarCarrinho();
    mostrarCarrinho();
}

function limparCarrinho() {
    carrinho = [];
    salvarCarrinho();
    mostrarCarrinho();
}

function atualizarTotal() {
    const elementoTotal = document.getElementById("carrinho-total");
    if (elementoTotal) {
        const total = carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
        elementoTotal.textContent = formatarDinheiro(total);
    }

    const botaoFinalizar = document.getElementById("finalizar-pedido");
    if (botaoFinalizar && !finalizandoPedido) {
        botaoFinalizar.disabled = carrinho.length === 0;
    }
}

function criarCardItemCarrinho(produto) {
    const item = criarElemento("div", "item-carrinho");

    const titulo = produto.tipo === "combo" ? `Combo ${produto.nome}` : produto.nome;
    item.appendChild(criarElemento("h3", "", titulo));

    if (produto.tipo === "combo") {
        let textoDetalhes = `${produto.batata} + ${produto.bebida}`;
        if (produto.molho && produto.molho !== DEFAULTS_TOTEM.molho) {
            textoDetalhes += ` + Molho ${produto.molho}`;
        }
        item.appendChild(criarElemento("p", "", textoDetalhes));
    }

    item.append(
        criarElemento("p", "", `Preço unitário: ${formatarDinheiro(produto.preco)}`),
        criarElemento("p", "quantidade-produto", `Quantidade: ${produto.quantidade}`),
        criarElemento("p", "subtotal-produto", `Subtotal: ${formatarDinheiro(produto.preco * produto.quantidade)}`)
    );

    const controles = criarElemento("div", "controles-carrinho");

    const btnDiminuir = criarElemento("button", "", "−");
    btnDiminuir.type = "button";
    btnDiminuir.setAttribute("aria-label", "Diminuir quantidade");
    btnDiminuir.addEventListener("click", () => alterarQuantidade(produto.chave, -1));

    const btnAumentar = criarElemento("button", "", "+");
    btnAumentar.type = "button";
    btnAumentar.setAttribute("aria-label", "Aumentar quantidade");
    btnAumentar.addEventListener("click", () => alterarQuantidade(produto.chave, 1));

    const btnRemover = criarElemento("button", "botao-remover", "Remover");
    btnRemover.type = "button";
    btnRemover.addEventListener("click", () => removerProduto(produto.chave));

    controles.append(btnDiminuir, btnAumentar, btnRemover);
    item.appendChild(controles);

    return item;
}

function mostrarCarrinho() {
    const container = document.getElementById("carrinho-itens");
    if (!container) return;

    const fragmento = document.createDocumentFragment();

    if (carrinho.length === 0) {
        fragmento.appendChild(criarElemento("p", "", "Seu carrinho está vazio!"));
    } else {
        carrinho.forEach(produto => {
            fragmento.appendChild(criarCardItemCarrinho(produto));
        });
    }

    container.replaceChildren(fragmento);
    atualizarTotal();
}


/* ========================================
   8. FINALIZAR PEDIDO E CLUBE MÉQUI
======================================== */

async function finalizarPedido() {
    if (finalizandoPedido) return;

    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }

    const botaoFinalizar = document.getElementById("finalizar-pedido");
    finalizandoPedido = true;

    if (botaoFinalizar) {
        botaoFinalizar.disabled = true;
        botaoFinalizar.textContent = "Finalizando...";
    }

    try {
        const resposta = await fetch("/finalizar-pedido", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itens: carrinho })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || "Erro ao finalizar pedido.");
        }

        carrinho = [];
        salvarCarrinho();
        window.location.href = `/pedidos/${resultado.pedido_id}`;
    } catch (erro) {
        alert(erro.message || "Não foi possível finalizar o pedido.");
        console.error(erro);
        finalizandoPedido = false;

        if (botaoFinalizar) {
            botaoFinalizar.disabled = false;
            botaoFinalizar.textContent = "Finalizar pedido";
        }
    }
}

function resgatarPremioClube(botao) {
    if (carrinho.some(item => item.tipo === "resgate")) {
        alert("Você já adicionou uma recompensa do Clube neste carrinho!");
        return;
    }

    const id = Number(botao.dataset.id);
    const nome = botao.dataset.nome;
    const pontos = Number(botao.dataset.pontos);

    adicionarCarrinho(
        {
            id,
            nome: `${nome} (Clube Méqui - ${pontos} pts)`,
            preco: 0,
            tipo: "resgate",
            batata: "",
            bebida: "",
            molho: ""
        },
        botao
    );
}


/* ========================================
   9. INICIALIZAÇÃO DE EVENTOS
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Seletores "Só lanche" / "Combo"
    document.querySelectorAll(".tipo-pedido").forEach(seletor => {
        seletor.addEventListener("change", () => {
            if (seletor.value === "combo") {
                abrirModalCombo(seletor);
            }
        });
    });

    // Botões de adicionar item no cardápio
    document.querySelectorAll(".botao-adicionar").forEach(botao => {
        botao.addEventListener("click", () => {
            const cartao = botao.closest(".cardapio-item");
            const seletor = cartao?.querySelector(".tipo-pedido");

            if (seletor && seletor.value === "combo") {
                abrirModalCombo(seletor);
                return;
            }

            adicionarCarrinho(
                {
                    id: Number(botao.dataset.id),
                    nome: botao.dataset.nome,
                    preco: Number(botao.dataset.preco),
                    tipo: "individual",
                    batata: "",
                    bebida: "",
                    molho: ""
                },
                botao
            );
        });
    });

    // Controles do modal de combo
    document.getElementById("modal-batata")?.addEventListener("change", atualizarPrecoModal);
    document.getElementById("modal-bebida")?.addEventListener("change", atualizarPrecoModal);
    document.getElementById("confirmar-modal-combo")?.addEventListener("click", confirmarCombo);
    document.getElementById("cancelar-modal-combo")?.addEventListener("click", fecharModalCombo);
    document.getElementById("fechar-modal-combo")?.addEventListener("click", fecharModalCombo);

    const modal = document.getElementById("modal-combo");
    modal?.addEventListener("click", evento => {
        if (evento.target === modal) fecharModalCombo();
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") fecharModalCombo();
    });

    // Ações da página do carrinho
    document.getElementById("limpar-carrinho")?.addEventListener("click", limparCarrinho);
    document.getElementById("finalizar-pedido")?.addEventListener("click", finalizarPedido);

    mostrarCarrinho();
});
