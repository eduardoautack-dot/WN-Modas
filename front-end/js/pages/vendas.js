import { API_URL } from "../config/config.js";

/*
    ===============================
    🔐 USUÁRIO
    ===============================
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
    ===============================
    📦 CARREGAR VENDAS
    ===============================
*/

async function carregarVendas() {
    const token = localStorage.getItem("token");

    if (!token) {
        console.warn("Token não encontrado, redirecionando...");
        window.location.href = "../index.html";
        return;
    }

    const res = await fetch(`${API_URL}/api/sales`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        }
    });

    if (res.status === 401) {
        alert("Sessão expirada. Faça login novamente.");
        localStorage.clear();
        window.location.href = "../index.html";
        return;
    }

    const json = await res.json();

    if (!json.success) {
        mostrarSemDados();
        return;
    }

    renderTabelaVendas(json.data);
}

/*
    ===============================
    📊 RESUMO
    ===============================
*/

function renderResumoVendas(vendas) {
    const container = document.getElementById("resumoVendas");
    if (!container) return;

    const totalVendas = vendas.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const qtdPedidos = vendas.length;
    const ticketMedio = qtdPedidos ? totalVendas / qtdPedidos : 0;

    container.innerHTML = `
        <div class="vendas-cards">
            <div class="card">
                <h4>Faturamento</h4>
                <strong>R$ ${totalVendas.toFixed(2)}</strong>
            </div>
            <div class="card">
                <h4>Pedidos</h4>
                <strong>${qtdPedidos}</strong>
            </div>
            <div class="card">
                <h4>Ticket Médio</h4>
                <strong>R$ ${ticketMedio.toFixed(2)}</strong>
            </div>
        </div>
    `;
}

/*
    ===============================
    📋 TABELA
    ===============================
*/

let vendaAtual = {
    cliente: null,
    itens: [] // ← múltiplos produtos
};

async function carregarProdutosVenda() {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/products`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        }
    });

    const json = await res.json();
    if (!json.success) return;

    const select = document.getElementById("produtoVenda");

    json.data.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p._id;
        opt.textContent = `${p.name} (${p.sku})`;
        opt.dataset.price = p.salePrice || 0;
        opt.dataset.stock = p.stock || 0;
        select.appendChild(opt);
    });
}


function renderTabelaVendas(vendas) {
    const container = document.getElementById("vendasContainer");

    if (!container) {
        console.error("Container #vendasContainer não encontrado");
        return;
    }

    if (!Array.isArray(vendas) || vendas.length === 0) {
        container.innerHTML = `
            <p class="sem-dados">Nenhuma venda encontrada.</p>
        `;
        return;
    }

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
                <td>${v.customer?.name || "—"}</td>
                <td>${v.customer?.cpf || "—"}</td>
                <td>R$ ${(v.total || 0).toFixed(2)}</td>
                <td>
                    <span class="badge badge-${v.status?.toLowerCase() || "pendente"}">
                        ${v.status || "Pendente"}
                    </span>
                </td>
                <td>${new Date(v.createdAt).toLocaleString("pt-BR")}</td>
                <td>
                    <button class="btn-ver" onclick="abrirDetalhesVenda(${v.id})">👁</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function resetarModalVenda() {
    clienteSelecionado = null;

    const cpfInput = document.getElementById("cpfVenda");
    if (cpfInput) cpfInput.value = "";

    const boxCliente = document.getElementById("clienteEncontrado");
    if (boxCliente) boxCliente.classList.add("hidden");

    const nomeLabel = document.getElementById("clienteNome");
    if (nomeLabel) nomeLabel.textContent = "";

    const emailLabel = document.getElementById("clienteEmail");
    if (emailLabel) emailLabel.textContent = "";

    const boxCadastro = document.getElementById("cadastroCliente");
    if (boxCadastro) boxCadastro.classList.add("hidden");

    const nomeNovo = document.getElementById("clienteNomeNovo");
    if (nomeNovo) nomeNovo.value = "";

    const emailNovo = document.getElementById("clienteEmailNovo");
    if (emailNovo) emailNovo.value = "";

    const telNovo = document.getElementById("clienteTelefoneNovo");
    if (telNovo) telNovo.value = "";

    const produto = document.getElementById("produtoVenda");
    if (produto) produto.value = "";

    const quantidade = document.getElementById("quantidadeVenda");
    if (quantidade) quantidade.value = 1;

    const valorUnitario = document.getElementById("valorUnitarioVenda");
    if (valorUnitario) valorUnitario.value = "";

    const total = document.getElementById("totalVenda");
    if (total) total.textContent = "R$ 0,00";

    vendaAtual = {
        cliente: null,
        itens: [] // ← múltiplos produtos
    };
}

function renderItensVenda() {
    const container = document.getElementById("listaItensVenda");

    container.innerHTML = vendaAtual.itens.map((i, idx) => `
        <div class="item-venda">
            <span>${i.name} (${i.quantity}x)</span>
            <strong>R$ ${i.total.toFixed(2)}</strong>
            <button onclick="removerItemVenda(${idx})">✖</button>
        </div>
    `).join("");
}

function atualizarTotalVenda() {
    const total = vendaAtual.itens.reduce((acc, i) => acc + i.total, 0);
    document.getElementById("totalVenda").textContent =
        `R$ ${total.toFixed(2)}`;
}

function adicionarProdutoVenda(produto) {
    const qtd = Number(document.getElementById("quantidadeVenda").value);

    vendaAtual.itens.push({
        productId: produto._id,
        name: produto.name,
        sku: produto.sku,
        quantity: qtd,
        unitPrice: produto.salePrice,
        total: qtd * produto.salePrice
    });

    renderItensVenda();
    atualizarTotalVenda();
}

window.abrirModalVenda = function () {
    resetarModalVenda();
    carregarProdutosVenda();
    document.getElementById("modalVenda").style.display = "flex";
};


window.fecharModalVenda = function () {
    document.getElementById("modalVenda").style.display = "none";
    resetarModalVenda();
};

async function abrirDetalhesVenda(id) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/sales/${id}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {})
        }
    });

    const json = await res.json();
    if (!json.success) {
        alert("Erro ao carregar venda");
        return;
    }

    renderDetalhesVenda(json.data);
    document.getElementById("modalVenda").classList.add("ativo");
}

function renderDetalhesVenda(venda) {
    const body = document.getElementById("modalVendaBody");

    body.innerHTML = `
        <h3>Venda #${venda.id}</h3>
        <p><strong>Cliente:</strong> ${venda.customer.name}</p>
        <p><strong>CPF:</strong> ${venda.customer.cpf}</p>

        <div class="itens-venda">
            ${venda.itens.map(i => `
                <div class="item">
                    ${i.qty}x ${i.name} — R$ ${i.subtotal}
                </div>
            `).join("")}
        </div>

        <h4>Total: R$ ${venda.total.toFixed(2)}</h4>
    `;
}

window.salvarVenda = async function () {
    if (!clienteSelecionado && !clienteCriadoAgora) {
        alert("Informe um cliente válido.");
        return;
    }

    if (!vendaAtual.itens.length) {
        alert("Adicione ao menos um produto.");
        return;
    }

    const payload = {
        customer: clienteSelecionado || clienteCriadoAgora,
        items: vendaAtual.itens,
        paymentMethod: "Pix"
    };

    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/sales`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {})
        },
        body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!json.success) {
        alert(json.message);
        return;
    }

    fecharModalVenda();
    carregarVendas();
};

function adicionarProdutoVenda() {
    const select = document.getElementById("produtoVenda");
    const opt = select.selectedOptions[0];
    const qtd = Number(document.getElementById("quantidadeVenda").value);

    if (!opt || !qtd || qtd <= 0) {
        alert("Selecione produto e quantidade válida.");
        return;
    }

    const estoque = Number(opt.dataset.stock);
    if (qtd > estoque) {
        alert("Quantidade maior que o estoque disponível.");
        return;
    }

    const item = {
        productId: opt.value,
        name: opt.textContent,
        quantity: qtd,
        unitPrice: Number(opt.dataset.price),
        total: qtd * Number(opt.dataset.price)
    };

    vendaAtual.itens.push(item);

    renderItensVenda();
    atualizarTotalVenda();
}

/*
    ===============================
    Utils
    ===============================
*/

window.mascaraCPF = function(input) {
    let value = input.value.replace(/\D/g, ""); // só números

    if (value.length > 11) value = value.slice(0, 11);

    value = value
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");

    input.value = value;
};

let clienteSelecionado = false;
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
    ===============================
    🚀 INIT
    ===============================
*/

document.addEventListener("DOMContentLoaded", () => {
    carregarUsuario();
    carregarVendas();
});

document.getElementById("produtoVenda").addEventListener("change", e => {
    const opt = e.target.selectedOptions[0];
    if (!opt) return;

    document.getElementById("valorUnitarioVenda").value =
        Number(opt.dataset.price).toFixed(2);
});
