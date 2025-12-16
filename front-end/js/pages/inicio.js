document.addEventListener("DOMContentLoaded", async () => {
    const nome = localStorage.getItem("nome") || sessionStorage.getItem("nome");
    const usuario = localStorage.getItem("usuario") || sessionStorage.getItem("usuario");

    if (!usuario) {
        window.location.href = "../index.html";
        return;
    }

    const userNameEl = document.getElementById("userName");
    const userCircleEl = document.getElementById("userCircle");
    if (userNameEl) userNameEl.textContent = nome || usuario;
    if (userCircleEl) userCircleEl.textContent = (nome || usuario).charAt(0).toUpperCase();

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "../index.html";
    });
    
    inicializarDashboard();
});
    
//
// ================================
// 📊 INICIALIZAÇÃO DO DASHBOARD
// ================================
function inicializarDashboard() {
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    const inputInicio = document.getElementById("inicio");
    const inputFim = document.getElementById("fim");

    if (inputInicio) inputInicio.value = trintaDiasAtras.toISOString().split("T")[0];
    if (inputFim) inputFim.value = hoje.toISOString().split("T")[0];

    atualizarDashboard();

    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) {
        btnFiltrar.addEventListener("click", atualizarDashboard);
    }
}


//
// ================================
// 📌 Dados temporários (zerados)
// ================================
function gerarDadosZerados() {
    return {
        faturamento: 0,
        custoOperacional: 0,
        ticketMedio: 0,
        margem: 0,
        margemPercentual: 0,
        contasPagar: 0,
        contasReceber: 0,
        top: [
            { produto: "Produto 1", total: 0, unit: 0 },
            { produto: "Produto 2", total: 0, unit: 0 },
            { produto: "Produto 3", total: 0, unit: 0 },
            { produto: "Produto 4", total: 0, unit: 0 },
            { produto: "Produto 5", total: 0, unit: 0 },
        ],
    };
}


//
// ================================
// 🔄 Atualizar Dashboard
// ================================
async function atualizarDashboard() {
    try {
        // 🔹 AQUI futuramente irá puxar do MongoDB
        const data = gerarDadosZerados();

        mostrarDashboard(data);

    } catch (err) {
        console.error("Erro ao atualizar dashboard:", err);
    }
}


//
// ================================
// 🎨 Renderizar Dashboard
// ================================
function mostrarDashboard(data) {
    const cards = document.getElementById("cards");
    const ranking = document.getElementById("ranking");

    if (!cards || !ranking) return;

    cards.innerHTML = `
        <div class="linha-cards">
            <div class="card auto-shine" style="background:#d7f2de;">
                <div class="card-icon">💰</div>
                <div class="card-content">
                    <h3>Faturamento Bruto</h3>
                    <div>R$ ${data.faturamento?.toLocaleString() ?? "0"}</div>
                </div>
            </div>

            <div class="card auto-shine" style="background:#f9e8b6;">
                <div class="card-icon">📦</div>
                <div class="card-content">
                    <h3>Custo Operacional</h3>
                    <div>R$ ${data.custoOperacional?.toLocaleString() ?? "0"}</div>
                </div>
            </div>

            <div class="card auto-shine" style="background:#e9d5ff;">
                <div class="card-icon">🏷️</div>
                <div class="card-content">
                    <h3>Ticket Médio</h3>
                    <div>R$ ${data.ticketMedio?.toLocaleString() ?? "0"}</div>
                </div>
            </div>
        </div>

        <div class="linha-cards">
            <div class="card auto-shine" style="background:#d6f0f9;">
                <div class="card-icon">📈</div>
                <div class="card-content">
                    <h3>Margem</h3>
                    <div>R$ ${data.margem?.toLocaleString() ?? "0"} (${data.margemPercentual ?? 0}%)</div>
                </div>
            </div>

            <div class="card auto-shine" style="background:#f9d5d5;">
                <div class="card-icon">💸</div>
                <div class="card-content">
                    <h3>Contas a Pagar</h3>
                    <div>R$ ${data.contasPagar?.toLocaleString() ?? "0"}</div>
                </div>
            </div>

            <div class="card auto-shine" style="background:#e0f8e0;">
                <div class="card-icon">💵</div>
                <div class="card-content">
                    <h3>Contas a Receber</h3>
                    <div>R$ ${data.contasReceber?.toLocaleString() ?? "0"}</div>
                </div>
            </div>
        </div>
    `;

    ranking.innerHTML =
        data.top?.length
            ? data.top
                  .map(
                      (item) =>
                          `<li>${item.produto} — R$ ${item.total.toLocaleString()} (${item.unit}un)</li>`
                  )
                  .join("")
            : "<li>Nenhum produto encontrado</li>";
}
