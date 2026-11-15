/* ========================================
   1. CONFIGURAÇÕES DO CARRINHO E TOTEM
======================================== */

let carrinho = carregarCarrinho();
let finalizandoPedido = false;
let comboSelecionado = null;

let etapaAtualTotem = 1;
let batataEscolhidaTotem = "Batata média";
let bebidaEscolhidaTotem = "Coca-Cola";
let molhoEscolhidoTotem = "Sem molho";

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
    "Suco de Laranja": 10,
    "Suco de Uva": 10,
    "Fanta": 8,
    "Água": 5
};

const PRECO_MOLHOS = {
    "Sem molho": 0,
    "Ketchup": 0,
    "Mostarda": 0,
    "Barbecue": 0
};


/* ========================================
   2. IDENTIFICAR CADA ITEM
======================================== */

function criarChave(produto) {
    return [
        produto.id,
        produto.tipo || "individual",
        produto.batata || "",
        produto.bebida || "",
        produto.molho || ""
    ].join("-");
}


/* ========================================
   3. CARREGAR E SALVAR CARRINHO
======================================== */

function carregarCarrinho() {
    try {
        const dados = JSON.parse(localStorage.getItem("carrinho")) || [];

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
                const item = {
                    ...produto,
                    tipo: produto.tipo === "combo" ? "combo" : "individual",
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
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}


/* ========================================
   4. FUNÇÕES VISUAIS DO TOTEM (HTML ONCLICK)
======================================== */

function selecionarOpcaoVisual(botao) {
    const container = botao.closest(".opcoes-pedido");
    const select = container.querySelector("select.tipo-pedido");
    container.querySelectorAll(".opcao-btn").forEach(b => b.classList.remove("ativo"));
    botao.classList.add("ativo");
    select.value = botao.dataset.valor;
    select.dispatchEvent(new Event("change"));
}

function atualizarResumoTotem() {
    const resumo = document.getElementById("resumo-totem-texto");
    if (resumo) {
        resumo.textContent = `${batataEscolhidaTotem} • ${bebidaEscolhidaTotem} • ${molhoEscolhidoTotem}`;
    }
}

function selecionarItemTotem(botao) {
    const grid = botao.parentElement;
    grid.querySelectorAll(".card-foto-totem").forEach(b => b.classList.remove("ativo"));
    botao.classList.add("ativo");

    const valor = botao.dataset.valor;
    const targetId = grid.dataset.target || botao.dataset.target;

    if (targetId === "modal-batata") {
        batataEscolhidaTotem = valor;
    } else if (targetId === "modal-bebida") {
        bebidaEscolhidaTotem = valor;
    }

    const select = document.getElementById(targetId);
    if (select) {
        select.value = valor;
    }

    atualizarResumoTotem();
    atualizarPrecoModal();
}

function selecionarMolhoTotem(botao) {
    const grid = botao.parentElement;
    grid.querySelectorAll(".card-foto-totem").forEach(b => b.classList.remove("ativo"));
    botao.classList.add("ativo");

    molhoEscolhidoTotem = botao.dataset.molho;
    atualizarResumoTotem();
    atualizarPrecoModal();
}

function irParaEtapaTotem(numero) {
    etapaAtualTotem = numero;

    document.querySelectorAll(".totem-etapa").forEach((el, idx) => {
        el.hidden = (idx + 1) !== etapaAtualTotem;
    });

    document.querySelectorAll(".totem-passo-ind").forEach((ind, idx) => {
        ind.classList.toggle("ativo", (idx + 1) <= etapaAtualTotem);
    });

    const btnCancelar = document.getElementById("cancelar-modal-combo");
    const btnVoltar = document.getElementById("btn-voltar-etapa");
    const btnAvancar = document.getElementById("btn-avancar-etapa");
    const btnConfirmar = document.getElementById("confirmar-modal-combo");

    if (btnCancelar) btnCancelar.hidden = (etapaAtualTotem !== 1);
    if (btnVoltar) btnVoltar.hidden = (etapaAtualTotem === 1);
    if (btnAvancar) btnAvancar.hidden = (etapaAtualTotem === 3);
    if (btnConfirmar) btnConfirmar.hidden = (etapaAtualTotem !== 3);
}

function mudarEtapaTotem(direcao) {
    const proxima = etapaAtualTotem + direcao;
    if (proxima >= 1 && proxima <= 3) {
        irParaEtapaTotem(proxima);
    }
}

function resetarSelecoesVisuaisModal() {
    batataEscolhidaTotem = "Batata média";
    bebidaEscolhidaTotem = "Coca-Cola";
    molhoEscolhidoTotem = "Sem molho";

    const selectBatata = document.getElementById("modal-batata");
    const selectBebida = document.getElementById("modal-bebida");
    if (selectBatata) selectBatata.value = "Batata média";
    if (selectBebida) selectBebida.value = "Coca-Cola";

    document.querySelectorAll("#etapa-combo-1 .card-foto-totem").forEach(b => {
        b.classList.toggle("ativo", b.dataset.valor === "Batata média");
    });

    document.querySelectorAll("#etapa-combo-2 .card-foto-totem").forEach(b => {
        b.classList.toggle("ativo", b.dataset.valor === "Coca-Cola");
    });

    document.querySelectorAll("#etapa-combo-3 .card-foto-totem").forEach(b => {
        b.classList.toggle("ativo", b.dataset.molho === "Sem molho");
    });

    irParaEtapaTotem(1);
    atualizarResumoTotem();
}


/* ========================================
   5. CONFIGURAR EVENTOS
======================================== */


document.addEventListener("DOMContentLoaded", function () {

    // Seletores individual / combo
    document.querySelectorAll(".tipo-pedido").forEach(seletor => {
        seletor.addEventListener("change", function () {
            if (this.value === "combo") {
                abrirModalCombo(this);
            }
        });
    });

    // Botões de adicionar produto
    document.querySelectorAll(".botao-adicionar").forEach(botao => {
        botao.addEventListener("click", function () {
            const cartao = this.closest(".cardapio-item");
            const seletor = cartao.querySelector(".tipo-pedido");

            // Evita adicionar combo sem passar pela personalização
            if (seletor && seletor.value === "combo") {
                abrirModalCombo(seletor);
                return;
            }

            const produto = {
                id: Number(this.dataset.id),
                nome: this.dataset.nome,
                preco: Number(this.dataset.preco),
                tipo: "individual",
                batata: "",
                bebida: "",
                molho: ""
            };

            adicionarCarrinho(produto, this);
        });
    });

    // Eventos da janela modal
    const batataModal = document.getElementById("modal-batata");
    const bebidaModal = document.getElementById("modal-bebida");

    if (batataModal) {
        batataModal.addEventListener("change", atualizarPrecoModal);
    }

    if (bebidaModal) {
        bebidaModal.addEventListener("change", atualizarPrecoModal);
    }

    document.getElementById("confirmar-modal-combo")
        ?.addEventListener("click", confirmarCombo);

    document.getElementById("cancelar-modal-combo")
        ?.addEventListener("click", fecharModalCombo);

    document.getElementById("fechar-modal-combo")
        ?.addEventListener("click", fecharModalCombo);

    const modal = document.getElementById("modal-combo");

    if (modal) {
        modal.addEventListener("click", function (evento) {
            if (evento.target === modal) {
                fecharModalCombo();
            }
        });
    }

    // Tecla ESC fecha a janela
    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape") {
            fecharModalCombo();
        }
    });

    // Limpar carrinho
    document.getElementById("limpar-carrinho")
        ?.addEventListener("click", limparCarrinho);

    // Finalizar pedido
    document.getElementById("finalizar-pedido")
        ?.addEventListener("click", finalizarPedido);

    mostrarCarrinho();
});


/* ========================================
   6. ABRIR E FECHAR JANELA DO COMBO
======================================== */

function abrirModalCombo(seletor) {
    const cartao = seletor.closest(".cardapio-item");
    const botao = cartao.querySelector(".botao-adicionar");
    const modal = document.getElementById("modal-combo");

    if (!modal || !botao) return;

    comboSelecionado = {
        id: Number(botao.dataset.id),
        nome: botao.dataset.nome,
        preco: Number(botao.dataset.preco),
        precoCombo: Number(botao.dataset.precoCombo),
        seletor: seletor
    };

    const nomeProduto = document.getElementById("modal-nome-produto");
    if (nomeProduto) {
        nomeProduto.textContent = comboSelecionado.nome;
    }

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

    // Reseta o seletor e os botões visuais do card para "Só lanche"
    if (comboSelecionado && comboSelecionado.seletor) {
        comboSelecionado.seletor.value = "individual";
        const container = comboSelecionado.seletor.closest(".opcoes-pedido");
        if (container) {
            container.querySelectorAll(".opcao-btn").forEach(b => {
                b.classList.toggle("ativo", b.dataset.valor === "individual");
            });
        }
    }

    comboSelecionado = null;
}


/* ========================================
   7. CALCULAR E ATUALIZAR PREÇO DO COMBO
======================================== */

function calcularPrecoCombo(precoBase, batata, bebida, molho = "Sem molho") {
    const precoBatata = PRECO_BATATAS[batata];
    const precoBebida = PRECO_BEBIDAS[bebida];
    const precoMolho = PRECO_MOLHOS[molho] || 0;

    if (
        !Number.isFinite(precoBase) ||
        precoBatata === undefined ||
        precoBebida === undefined
    ) {
        return 0;
    }

    // O preço base inclui batata média (R$ 12) e Coca-Cola (R$ 8).
    return precoBase + (precoBatata - 12) + (precoBebida - 8) + precoMolho;
}

function atualizarPrecoModal() {
    if (!comboSelecionado) return;

    const preco = calcularPrecoCombo(
        comboSelecionado.precoCombo,
        batataEscolhidaTotem,
        bebidaEscolhidaTotem,
        molhoEscolhidoTotem
    );

    const elementoPreco = document.getElementById("modal-preco-combo");
    if (elementoPreco) {
        elementoPreco.textContent = formatarDinheiro(preco);
    }
}


/* ========================================
   8. CONFIRMAR COMBO
======================================== */

function confirmarCombo() {
    if (!comboSelecionado) return;

    const preco = calcularPrecoCombo(
        comboSelecionado.precoCombo,
        batataEscolhidaTotem,
        bebidaEscolhidaTotem,
        molhoEscolhidoTotem
    );

    const produto = {
        id: comboSelecionado.id,
        nome: comboSelecionado.nome,
        preco: preco,
        quantidade: 1,
        tipo: "combo",
        batata: batataEscolhidaTotem,
        bebida: bebidaEscolhidaTotem,
        molho: molhoEscolhidoTotem
    };

    adicionarCarrinho(produto);
    fecharModalCombo();
}


/* ========================================
   9. ADICIONAR E MOSTRAR PRODUTOS NO CARRINHO
======================================== */

let timerToastCarrinho = null;

function mostrarNotificacaoCarrinho(produto, botaoClicado = null) {
    // 1. Faz o botão "Carrinho" do topo dar um pulo
    const botaoTopo = document.querySelector(".botao-carrinho");
    if (botaoTopo) {
        botaoTopo.classList.remove("animar-pulo");
        void botaoTopo.offsetWidth;
        botaoTopo.classList.add("animar-pulo");
    }

    // 2. Muda o texto do botão do card para "Adicionado! ✓" por 1 segundo
    if (botaoClicado) {
        const textoOriginal = botaoClicado.textContent;
        botaoClicado.textContent = "Adicionado! ✓";
        botaoClicado.classList.add("adicionado");

        setTimeout(() => {
            botaoClicado.textContent = textoOriginal;
            botaoClicado.classList.remove("adicionado");
        }, 1000);
    }

    // 3. Cria ou atualiza a notificação flutuante (Toast)
    let toast = document.getElementById("toast-carrinho");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-carrinho";
        toast.className = "toast-carrinho";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
    }

    const tituloItem = produto.tipo === "combo"
        ? `Combo ${produto.nome}`
        : produto.nome;

    toast.classList.remove("visivel");
    void toast.offsetWidth;

    toast.innerHTML = `
        <div class="toast-icone">✓</div>
        <div class="toast-texto">
            <strong>Adicionado ao carrinho!</strong>
            <span>${tituloItem} • ${formatarDinheiro(produto.preco)}</span>
        </div>
        <div class="toast-barra"></div>
    `;

    toast.classList.add("visivel");

    clearTimeout(timerToastCarrinho);
    timerToastCarrinho = setTimeout(() => {
        toast.classList.remove("visivel");
    }, 2800);
}

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

    const produtoExistente = carrinho.find(
        item => item.chave === novoProduto.chave
    );

    if (produtoExistente) {
        produtoExistente.quantidade++;
    } else {
        carrinho.push(novoProduto);
    }

    salvarCarrinho();
    mostrarCarrinho();
    mostrarNotificacaoCarrinho(novoProduto, botaoClicado);
}

function mostrarCarrinho() {
    const container = document.getElementById("carrinho-itens");

    if (!container) return;

    container.innerHTML = "";

    if (carrinho.length === 0) {
        const mensagem = document.createElement("p");
        mensagem.textContent = "Seu carrinho está vazio!";
        container.appendChild(mensagem);
    } else {
        carrinho.forEach(produto => {
            const item = document.createElement("div");
            item.className = "item-carrinho";

            const nome = document.createElement("h3");
            nome.textContent = produto.tipo === "combo"
                ? "Combo " + produto.nome
                : produto.nome;

            const preco = document.createElement("p");
            preco.textContent =
                "Preço unitário: " + formatarDinheiro(produto.preco);

            item.appendChild(nome);

            // Detalhes do combo (incluindo molho se houver)
            if (produto.tipo === "combo") {
                const detalhes = document.createElement("p");
                let textoDetalhes = produto.batata + " + " + produto.bebida;
                if (produto.molho && produto.molho !== "Sem molho") {
                    textoDetalhes += " + Molho " + produto.molho;
                }
                detalhes.textContent = textoDetalhes;
                item.appendChild(detalhes);
            }

            const quantidade = document.createElement("p");
            quantidade.className = "quantidade-produto";
            quantidade.textContent = "Quantidade: " + produto.quantidade;

            const subtotal = document.createElement("p");
            subtotal.className = "subtotal-produto";
            subtotal.textContent =
                "Subtotal: " +
                formatarDinheiro(produto.preco * produto.quantidade);

            const controles = document.createElement("div");
            controles.className = "controles-carrinho";

            const botaoDiminuir = document.createElement("button");
            botaoDiminuir.textContent = "−";
            botaoDiminuir.setAttribute("aria-label", "Diminuir quantidade");
            botaoDiminuir.addEventListener("click", () => {
                alterarQuantidade(produto.chave, -1);
            });

            const botaoAumentar = document.createElement("button");
            botaoAumentar.textContent = "+";
            botaoAumentar.setAttribute("aria-label", "Aumentar quantidade");
            botaoAumentar.addEventListener("click", () => {
                alterarQuantidade(produto.chave, 1);
            });

            const botaoRemover = document.createElement("button");
            botaoRemover.textContent = "Remover";
            botaoRemover.className = "botao-remover";
            botaoRemover.addEventListener("click", () => {
                removerProduto(produto.chave);
            });

            controles.appendChild(botaoDiminuir);
            controles.appendChild(botaoAumentar);
            controles.appendChild(botaoRemover);

            item.appendChild(preco);
            item.appendChild(quantidade);
            item.appendChild(subtotal);
            item.appendChild(controles);

            container.appendChild(item);
        });
    }

    atualizarTotal();
}


/* ========================================
   10. CONTROLES DO CARRINHO E TOTAL
======================================== */

function alterarQuantidade(chave, valor) {
    const produto = carrinho.find(item => item.chave === chave);
    if (!produto) return;

    produto.quantidade += valor;

    if (produto.quantidade <= 0) {
        removerProduto(chave);
        return;
    }

    salvarCarrinho();
    mostrarCarrinho();
}

function removerProduto(chave) {
    carrinho = carrinho.filter(produto => produto.chave !== chave);
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
    if (!elementoTotal) return;

    const total = carrinho.reduce((soma, produto) => {
        return soma + produto.preco * produto.quantidade;
    }, 0);

    elementoTotal.textContent = formatarDinheiro(total);
}

function formatarDinheiro(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


/* ========================================
   11. FINALIZAR PEDIDO
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
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                itens: carrinho
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Erro ao finalizar pedido."
            );
        }

        carrinho = [];
        salvarCarrinho();
        window.location.href = "/pedidos/" + resultado.pedido_id;

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
/* ========================================
   12. RESGATAR RECOMPENSA DO CLUBE MÉQUI
======================================== */

function resgatarPremioClube(botao) {
    const jaResgatado = carrinho.some(item => item.tipo === "resgate");
    if (jaResgatado) {
        alert("Você já adicionou uma recompensa do Clube neste carrinho!");
        return;
    }

    const id = Number(botao.dataset.id);
    const nome = botao.dataset.nome;
    const pontos = Number(botao.dataset.pontos);

    const produtoResgate = {
        id: id,
        nome: `${nome} (Clube Méqui - ${pontos} pts)`,
        preco: 0,
        tipo: "resgate",
        batata: "",
        bebida: "",
        molho: ""
    };

    adicionarCarrinho(produtoResgate, botao);
}
