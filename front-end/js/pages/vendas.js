import { API_URL } from "../config/config.js";

/*
    =====================================================
    🔐 USUÁRIO
    =====================================================
*/

function carregarUsuario() {
    const nome = localStorage.getItem("nome") || sessionStorage.getItem("nome");
    const usuario = localStorage.getItem("usuario") || sessionStorage.getItem("usuario");

    if (!usuario) {
        window.location.href = "../index.html";
        return;
    }

    document.getElementById("userName").textContent = nome || usuario;
    document.getElementById("userCircle").textContent = (nome || usuario)[0].toUpperCase();

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "../index.html";
    });
}

/*
    =====================================================
    📌 Estado da venda atual
    =====================================================
*/
let clienteSelecionado = null;
let clienteCriadoAgora = null;

let vendaAtual = criarVendaVazia();

function criarVendaVazia() {
    return {
        cliente: null,
        itens: [],
        subtotal: 0,
        desconto: {
            tipo: "valor",
            valor: 0
        },
        total: 0
    };
}

/*
    =====================================================
    📌 Função para resetar modal de venda
    =====================================================
*/
function resetarModalVenda() {
    vendaAtual = criarVendaVazia();

    // CPF
    const cpfInput = document.getElementById("cpfVenda");
    if (cpfInput) cpfInput.value = "";

    // Cliente
    clienteSelecionado = null;
    document.getElementById("clienteEncontrado")?.classList.add("hidden");
    document.getElementById("cadastroCliente")?.classList.add("hidden");

    // Produtos
    document.getElementById("produtoVenda").value = "";
    document.getElementById("quantidadeVenda").value = 1;
    document.getElementById("valorUnitarioVenda").value = "";

    // Desconto
    document.getElementById("descontoValor").value = 0;
    document.getElementById("descontoTipo").value = "valor";

    // Total
    document.getElementById("totalVenda").textContent =
        "R$ 0,00";
}


/*
    =====================================================
    📌 Máscara de CPF no front-end
    =====================================================
*/
window.mascaraCPF = function (el) {
    let v = el.value.replace(/\D/g, "");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    el.value = v;
};

/*
    =====================================================
    📌 Buscar cliente por CPF
    =====================================================
*/
window.buscarClientePorCPF = async function () {
    const cpf = document.getElementById("cpfVenda").value.replace(/\D/g, "");

    if (cpf.length !== 11) return;

    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/customers/cpf/${cpf}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {})
        }
    });

    const json = await res.json();
    const boxCliente = document.getElementById("clienteEncontrado");
    const boxCadastro = document.getElementById("cadastroCliente");

    if (json.success && json.data) {
        clienteSelecionado = json.data;

        document.getElementById("clienteNome").textContent = json.data.name;
        document.getElementById("clienteEmail").textContent = json.data.email || "-";

        boxCliente.classList.remove("hidden");
        boxCadastro.classList.add("hidden");
    } else {
        clienteSelecionado = null;
        boxCliente.classList.add("hidden");
        boxCadastro.classList.remove("hidden");
    }
};

/*
    =====================================================
    📌 Carregar produtos no select
    =====================================================
*/
async function carregarProdutosVenda() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/products`, {
        headers: {
            ...(token ? { Authorization: "Bearer " + token } : {})
        }
    });

    const json = await res.json();
    if (!json.success) return;

    const select = document.getElementById("produtoVenda");
    json.data.forEach(p => {
        const option = new Option(`${p.name} (${p.sku})`, p._id);
        option.dataset.price = p.salePrice ?? 0;
        option.dataset.stock = p.stock ?? 0;
        select.appendChild(option);
    });
}

/*
    =====================================================
    📌 Quando produto é selecionado
    =====================================================
*/
document.getElementById("produtoVenda")?.addEventListener("change", e => {
    const opt = e.target.selectedOptions[0];
    if (!opt) return;

    document.getElementById("valorUnitarioVenda").value = Number(opt.dataset.price).toFixed(2);
});

/*
    =====================================================
    📌 Adicionar produto à venda
    =====================================================
*/
window.adicionarProdutoVenda = function () {
    const select = document.getElementById("produtoVenda");
    const quantidadeEl = document.getElementById("quantidadeVenda");

    const produtoId = select.value;
    if (!produtoId) {
        alert("Selecione um produto.");
        return;
    }

    const quantidade = Number(quantidadeEl.value);
    if (quantidade <= 0) {
        alert("Quantidade inválida.");
        return;
    }

    const produto = produtosDisponiveis.find(p => p._id === produtoId);
    if (!produto) {
        alert("Produto não encontrado.");
        return;
    }

    // 🔁 Se já existe, soma quantidade
    const existente = vendaAtual.itens.find(i => i.productId === produto._id);

    if (existente) {
        existente.quantidade += quantidade;
        existente.total = existente.quantidade * existente.preco;
    } else {
        vendaAtual.itens.push({
            productId: produto._id,
            nome: produto.name,
            preco: produto.salePrice,
            quantidade,
            total: produto.salePrice * quantidade
        });
    }

    atualizarResumoVenda();
};


/*
    =====================================================
    📌 Renderizar itens da venda
    =====================================================
*/
function renderItensVenda() {
    const container = document.getElementById("listaItensVenda");

    container.innerHTML = vendaAtual.itens.map((i, idx) => `
        <div class="item-venda">
            <span>${i.name} — ${i.quantity}x</span>
            <strong>R$ ${i.total.toFixed(2)}</strong>
            <button onclick="removerItemVenda(${idx})">✖</button>
        </div>
    `).join("");
}

/*
    =====================================================
    📌 Remover item da venda
    =====================================================
*/
window.removerItemVenda = function (index) {
    vendaAtual.itens.splice(index, 1);
    renderItensVenda();
    atualizarTotalVenda();
};

/*
    =====================================================
    📌 Atualizar total da venda
    =====================================================
*/
function atualizarTotalVenda() {
    const total = vendaAtual.itens.reduce((acc, i) => acc + i.total, 0);
    document.getElementById("totalVenda").textContent = `R$ ${total.toFixed(2)}`;
}

/*
    =====================================================
    📌 Abrir modal de venda
    =====================================================
*/
window.abrirModalVenda = function () {
    resetarModalVenda();
    carregarProdutosVenda();
    document.getElementById("modalVenda").style.display = "flex";
};

/*
    =====================================================
    📌 Fechar modal de venda
    =====================================================
*/
window.fecharModalVenda = function () {
    document.getElementById("modalVenda").style.display = "none";
    resetarModalVenda();
};

/*
    =====================================================
    📌 Desconto
    =====================================================
*/
function calcularSubtotal() {
    return vendaAtual.itens.reduce((acc, i) => acc + i.total, 0);
}

function atualizarResumoVenda() {
    const subtotal = calcularSubtotal();

    let desconto = 0;
    if (vendaAtual.desconto.tipo === "percentual") {
        desconto = subtotal * (vendaAtual.desconto.valor / 100);
    } else {
        desconto = vendaAtual.desconto.valor;
    }

    vendaAtual.subtotal = subtotal;
    vendaAtual.total = Math.max(subtotal - desconto, 0);

    document.getElementById("totalVenda").textContent =
        vendaAtual.total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
}

/*
    =====================================================
    📌 Salvar venda no back-end
    =====================================================
*/
window.salvarVenda = async function () {
    try {
        if (!vendaAtual.itens.length) {
            alert("Adicione ao menos um produto.");
            return;
        }

        const token = localStorage.getItem("token");

        let customerId = null;

        // ============================
        // 1️⃣ CLIENTE EXISTENTE
        // ============================
        if (clienteSelecionado && clienteSelecionado._id) {
            customerId = clienteSelecionado._id;
        }

        // ============================
        // 2️⃣ CADASTRO RÁPIDO
        // ============================
        else {
            const nome = document.getElementById("clienteNomeNovo")?.value?.trim();
            const email = document.getElementById("clienteEmailNovo")?.value?.trim();
            const telefone = document.getElementById("clienteTelefoneNovo")?.value?.trim();
            const cpf = document.getElementById("cpfVenda").value.replace(/\D/g, "");

            if (!nome || !cpf) {
                alert("Informe os dados do cliente.");
                return;
            }

            const resCliente = await fetch(`${API_URL}/api/customers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: "Bearer " + token } : {})
                },
                body: JSON.stringify({
                    name: nome,
                    email,
                    phone: telefone,
                    cpf
                })
            });

            const jsonCliente = await resCliente.json();

            if (!jsonCliente.success) {
                alert(jsonCliente.message || "Erro ao cadastrar cliente.");
                return;
            }

            customerId = jsonCliente.data._id;
        }

        // ============================
        // 3️⃣ SALVAR VENDA
        // ============================
        const payloadVenda = {
            customerId,
            itens: vendaAtual.itens,
            subtotal: vendaAtual.subtotal,
            desconto: vendaAtual.desconto,
            total: vendaAtual.total
        };

        const resVenda = await fetch(`${API_URL}/api/sales`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: "Bearer " + token } : {})
            },
            body: JSON.stringify(payloadVenda)
        });

        const jsonVenda = await resVenda.json();

        if (!jsonVenda.success) {
            alert(jsonVenda.message || "Erro ao salvar venda.");
            return;
        }

        console.log("ITENS DA VENDA:", vendaAtual.itens);


        fecharModalVenda();
        carregarVendas();

    } catch (err) {
        console.error("Erro ao salvar venda:", err);
        alert("Erro interno ao salvar venda.");
    }
};

/*
    =====================================================
    📌 Carregar lista de vendas
    =====================================================
*/
async function carregarVendas() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/sales`, {
        headers: { ...(token ? { Authorization: "Bearer " + token } : {}) }
    });

    const json = await res.json();
    if (!json.success) return;

    if (json.data.length === 0) {
        document.getElementById("vendasContainer").innerHTML =
            "<p>Nenhuma venda encontrada.</p>";
        return;
    }

    renderTabelaVendas(json.data);
}

/*
    =====================================================
    📌 Renderização da tabela de vendas
    =====================================================
*/
function renderTabelaVendas(vendas) {
    const container = document.getElementById("vendasContainer");

    let html = `
        <table class="vendas-tabela">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>CPF</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    vendas.forEach(v => {
        html += `
            <tr>
                <td>#${v.id}</td>
                <td>${v.customer.name}</td>
                <td>${v.customer.cpf}</td>
                <td>R$ ${v.total.toFixed(2)}</td>
                <td><span class="badge badge-${v.status?.toLowerCase() || "pendente"}">${v.status || "Pendente"}</span></td>
                <td>${new Date(v.createdAt).toLocaleString("pt-BR")}</td>
                <td><button class="btn-ver" onclick="abrirDetalhesVenda(${v.id})">👁️</button></td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}

/*
    =====================================================
    📌 Carregar quando iniciar
    =====================================================
*/
document.addEventListener("DOMContentLoaded", () => {
    carregarUsuario();
    carregarVendas();

    document.getElementById("descontoValor")
        ?.addEventListener("input", atualizarResumoVenda);

    document.getElementById("descontoTipo")
        ?.addEventListener("change", atualizarResumoVenda);
});

document.getElementById("descontoValor").addEventListener("input", atualizarResumoVenda);
document.getElementById("descontoTipo").addEventListener("change", atualizarResumoVenda);
