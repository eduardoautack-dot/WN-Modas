import { API_URL } from "../config/config.js";
import { SCHEMAS } from "../config/schemas.js";
import { scrollToElement } from "../utils/dom.js";
import { formatBRL, parseBRL } from "../utils/money.js";
import { uploadToCloudinary } from "../services/cloudinaryService.js";
import { brToISO, isoToBR, addMonthsISO, isFutureISODate } from "../utils/date.js";
import { buscarCNPJ, mostrarMensagem, mostrarLoader, esconderLoader, buscarCEP } from "../utils/utils.js";
import { formatarCPF, formatarCEP, formatarCNPJ, somenteNumeros, formatarTelefone, moedaParaNumeroInteligente, aplicarMascaraMoedaInteligente } from "../masks.js";

// ========================================================
// 🔹 Autenticação básica
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
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

    inicializarSistema();
});

// ========================================================
// 🔹 ESTADO GERAL
// ========================================================

let abaAtiva = "clientes";
let tabelaContainerEl = null;

const dados = {
    clientes: [],
    produtos: [],
    fornecedores: [],
    despesas: []
};

// ==========================================================
// 🔥 DESPESAS (produção) - lógica condicional + cálculos
// ==========================================================

function setupDespesasForm(modalBg) {
    const el = (id) => modalBg.querySelector("#" + id);
    const groupOf = (id) => el(id)?.closest(".form-group");

    const dueDate = el("dueDate");
    const type = el("type");
    const paymentMethod = el("paymentMethod");
    const status = el("status");

    const installments = el("installments");
    const installmentValue = el("installmentValue");
    const endDate = el("endDate");
    const value = el("value");

    const gInstallments = groupOf("installments");
    const gInstallmentValue = groupOf("installmentValue");
    const gEndDate = groupOf("endDate");

    if (installments && !installments.value) installments.value = "1";
    if (status && !status.value) status.value = "Em andamento";
    if (endDate) endDate.readOnly = true;

    const isCredit = () => (paymentMethod?.value || "") === "Cartão de Crédito";

    const recalc = () => {
        if (!isCredit()) return;

        const qtd = Math.max(1, Number(installments?.value || 1));
        const parcela = moedaParaNumeroInteligente(installmentValue?.value || "");
        const total = Number((qtd * (parcela || 0)).toFixed(2));

        if (value) {
            value.value = total ? total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
            value.readOnly = true;
        }

        if (dueDate?.value && endDate) {
            endDate.value = addMonthsISO(dueDate.value, qtd);
        }

        if (type && qtd > 1) type.value = "Parcela Mensal";
    };

    const toggle = () => {
        const credit = isCredit();

        if (gInstallments) gInstallments.style.display = credit ? "" : "none";
        if (gInstallmentValue) gInstallmentValue.style.display = credit ? "" : "none";
        if (gEndDate) gEndDate.style.display = credit ? "" : "none";

        if (value) {
            value.readOnly = credit;
            if (!credit) {
                if (endDate) endDate.value = "";
                if (installments) installments.value = "1";
                if (installmentValue) installmentValue.value = "";
            }
        }

        if (credit) recalc();
    };

    paymentMethod?.addEventListener("change", toggle);
    installments?.addEventListener("input", recalc);
    installmentValue?.addEventListener("input", recalc);
    dueDate?.addEventListener("change", recalc);

    const todayISO = new Date().toISOString().slice(0, 10);
    if (dueDate) {
        dueDate.max = todayISO;
    }

    toggle();
}

// ========================================================
// 🔹 INICIALIZAÇÃO
// ========================================================

function inicializarSistema() {
    tabelaContainerEl = document.getElementById("tabela-container") || document.getElementById("tabelaContainer");
    if (!tabelaContainerEl) {
        console.warn("⚠️ tabela-container não encontrado no DOM.");
        return;
    }

    inicializarEventos();
    carregarTabela("clientes");
}

// ========================================================
// 🔹 SKELETONS (tabela)
// ========================================================

function mostrarSkeletons(linhas = 6, colunas = 4) {
    if (!tabelaContainerEl) return;
    const cols = "<div class='skeleton-cell'></div>".repeat(colunas);
    const rows = Array.from({ length: linhas }, () => `<div class='skeleton-row'>${cols}</div>`).join("");
    tabelaContainerEl.innerHTML = `<div class='skeleton-table'>${rows}</div>`;
}

// ========================================================
// 🔹 CARREGAR TABELA (via API REST)
// ========================================================

async function carregarTabela(aba) {
    abaAtiva = aba;
    const schema = SCHEMAS[aba];
    if (!schema) {
        console.warn("⚠️ Schema não encontrado para aba:", aba);
        return;
    }

    mostrarLoader();
    mostrarSkeletons(6, (schema.listFields || []).length || 3);

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(API_URL + schema.apiPath, {
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": "Bearer " + token } : {})
            }
        });

        const json = await res.json();
        if (!json.success) {
            tabelaContainerEl.innerHTML = `<p class="sem-dados">${json.message || "Erro ao carregar dados."}</p>`;
            return;
        }

        dados[aba] = Array.isArray(json.data) ? json.data : [];
        renderTabela();

    } catch (err) {
        console.error("❌ Erro ao carregar tabela:", err);
        tabelaContainerEl.innerHTML = "<p class='erro-dados'>Erro ao carregar dados.</p>";
    } finally {
        esconderLoader();
    }
}

// ========================================================
// 🔹 RENDERIZAR TABELA
// ========================================================

function renderTabela() {
    if (!tabelaContainerEl) return;
    const schema = SCHEMAS[abaAtiva];
    if (!schema) return;

    const items = dados[abaAtiva] || [];
    if (!items.length) {
        tabelaContainerEl.innerHTML = "<p class='sem-dados'>Nenhum dado encontrado.</p>";
        return;
    }

    const listFields = schema.listFields || schema.fields.filter(f => f.visible).map(f => f.name);
    const headers = listFields.map(fieldName => {
        const field = schema.fields.find(f => f.name === fieldName);
        return field ? field.label : fieldName;
    });

    let html = `
        <table class="main-table">
            <thead>
                <tr>
                    ${headers.map(h => `<th>${h}</th>`).join("")}
                    <th style="text-align:center;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach((doc, i) => {
        const cols = listFields.map(fieldName => {
            let v = doc[fieldName];

            if (v === null || v === undefined) v = "";

            if (fieldName === "birthdate" && v) {
                valor = isoToBR(valor);
            }

            if (fieldName == "salePrice" || fieldName == "value") {
                v = formatBRL(Number(v))
            };

            if (fieldName === "stock") {
                v = (v ?? 0) + " un";
            }   

            return `<td>${v}</td>`;
        }).join("");

        html += `
            <tr class="fade-in-row">
                ${cols}
                <td class="actions">
                    <button class="view" title="Ver Detalhes" onclick="verDetalhesRegistro(${i})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="edit" title="Editar" onclick="editarRegistro(${i})">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                    </button>
                    <button class="delete" title="Excluir" onclick="excluirRegistro(${i})">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6m3-3h8l1 3H7l1-3Z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    tabelaContainerEl.innerHTML = html;
}

// ========================================================
// 🔹 CONTROLE DE ABAS
// ========================================================

function inicializarEventos() {
    const tabsContainer = document.querySelector(".tabs");
    const tabs = tabsContainer?.querySelectorAll("button");
    if (!tabs || !tabs.length) return;

    let indicator = tabsContainer.querySelector(".tab-indicator");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "tab-indicator";
        tabsContainer.appendChild(indicator);
    }

    const moverIndicador = (btn) => {
        const rect = btn.getBoundingClientRect();
        const parentRect = tabsContainer.getBoundingClientRect();
        const left = rect.left - parentRect.left;
        indicator.style.width = `${rect.width}px`;
        indicator.style.transform = `translateX(${left}px)`;
    };

    tabs.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabs.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            abaAtiva = btn.dataset.tab;

            moverIndicador(btn);
            carregarTabela(abaAtiva);
        });
    });

    const activeBtn = Array.from(tabs).find(b => b.classList.contains("active")) || tabs[0];
    if (activeBtn) {
        moverIndicador(activeBtn);
        abaAtiva = activeBtn.dataset.tab;
    }

    const btnNovo = document.getElementById("btnNovo");
    if (btnNovo) {
        btnNovo.addEventListener("click", () => abrirModalRegistro());
    }

    const btnExportar = document.getElementById("btnExportar");
    if (btnExportar) {
        btnExportar.addEventListener("click", exportarPlanilhaAtual);
    }
}

// ========================================================
// 🔹 EXPORTAR PLANILHA (aba atual)
// ========================================================

async function exportarPlanilhaAtual() {
    const schema = SCHEMAS[abaAtiva];
    if (!schema) return;

    const dadosAba = dados[abaAtiva] || [];
    if (!dadosAba.length) {
        mostrarMensagem("Nenhum dado para exportar.", "erro");
        return;
    }

    try {
        const headers = schema.fields
            .filter(f => f.name !== "orders")
            .map(f => f.label);

        const linhas = dadosAba.map(doc => {
            return schema.fields
                .filter(f => f.name !== "orders")
                .map(f => doc[f.name] ?? "");
        });

        /* global XLSX */
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...linhas]);
        XLSX.utils.book_append_sheet(wb, ws, schema.display || "Dados");

        const nomeArquivo = `${schema.key || "export"}-${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);

    } catch (err) {
        console.error("Erro ao exportar planilha:", err);
        mostrarMensagem("Erro ao exportar planilha.", "erro");
    }
}

// ========================================================
// 🔹 Novo Registro (modal com ícones + 2 colunas)
// ========================================================

async function abrirModalRegistro() {
 const schema = SCHEMAS[abaAtiva];
    if (!schema) {
        alert("Aba não configurada corretamente.");
        return;
    }

    const modalBg = document.createElement("div");
    modalBg.className = "modal-bg";
    modalBg.style.display = "flex";

    // Helper: ícone por tipo de campo
    const iconForField = (campo) => {
        const label = campo.label.toLowerCase();
        if (label.includes("cpf") || label.includes("cnpj") || label.includes("razão") ||
            label.includes("fantasia") || label.includes("estadual") || label.includes("descrição")) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <path d="M7 8h10M7 12h7M7 16h4"/>
            </svg>`;
        }

        if (label.includes("nome")) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/>
                <path d="M6 20a6 6 0 0 1 12 0"/>
            </svg>`;
        }

        if (label.includes("sku")) {
            return `<svg viewBox="0 0 1024 1024" fill="#000000" class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier"><path d="M300 462.4h424.8v48H300v-48zM300 673.6H560v48H300v-48z" fill="">
                    </path><path d="M818.4 981.6H205.6c-12.8 0-24.8-2.4-36.8-7.2-11.2-4.8-21.6-11.2-29.6-20-8.8-8.8-15.2-18.4-20-29.6-4.8-12-7.2-24-7.2-36.8V250.4c0-12.8 2.4-24.8 7.2-36.8 4.8-11.2 11.2-21.6 20-29.6 8.8-8.8 18.4-15.2 29.6-20 12-4.8 24-7.2 36.8-7.2h92.8v47.2H205.6c-25.6 0-47.2 20.8-47.2 47.2v637.6c0 25.6 20.8 47.2 47.2 47.2h612c25.6 0 47.2-20.8 47.2-47.2V250.4c0-25.6-20.8-47.2-47.2-47.2H725.6v-47.2h92.8c12.8 0 24.8 2.4 36.8 7.2 11.2 4.8 21.6 11.2 29.6 20 8.8 8.8 15.2 18.4 20 29.6 4.8 12 7.2 24 7.2 36.8v637.6c0 12.8-2.4 24.8-7.2 36.8-4.8 11.2-11.2 21.6-20 29.6-8.8 8.8-18.4 15.2-29.6 20-12 5.6-24 8-36.8 8z" fill=""></path>
                    <path d="M747.2 297.6H276.8V144c0-32.8 26.4-59.2 59.2-59.2h60.8c21.6-43.2 66.4-71.2 116-71.2 49.6 0 94.4 28 116 71.2h60.8c32.8 0 59.2 26.4 59.2 59.2l-1.6 153.6z m-423.2-47.2h376.8V144c0-6.4-5.6-12-12-12H595.2l-5.6-16c-11.2-32.8-42.4-55.2-77.6-55.2-35.2 0-66.4 22.4-77.6 55.2l-5.6 16H335.2c-6.4 0-12 5.6-12 12v106.4z" fill=""></path>
                </g>
            </svg>`
        }

        if (label.includes("e-mail") || label.includes("email")) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2"/>
                <path d="m3 7 9 6 9-6"/>
            </svg>`;
        }

        if (label.includes("telefone") || label.includes("celular")) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 2h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 4a2 2 0 0 1 2-2Z"/>
            </svg>`;
        }

        if (label.includes("cep") || label.includes("endereço") || label.includes("endereco") || label.includes("estado")) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10Z"/>
                <circle cx="12" cy="11" r="2.5"/>
            </svg>`;
        }

        if (campo.type === "date" || label.includes("data") || label.includes("parcelas")) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>`;
        }

        if (campo.type === "select" || label.includes("gênero")) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 5h18l-3 7H6l-3-7Z"/>
                <path d="M6 12v5a6 6 0 0 0 12 0v-5"/>
            </svg>`;
        }

        if (label.includes("venda") || label.includes("valor") || label.includes("custo")) {
            return `<svg fill="#000000" viewBox="-5 0 19 19" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.699 11.907a3.005 3.005 0 0 1-1.503 2.578 4.903 4.903 0 0 1-1.651.663V16.3a1.03 1.03 0 1 1-2.059 0v-1.141l-.063-.011a5.199 5.199 0 0 1-1.064-.325 3.414 3.414 0 0 1-1.311-.962 1.029 1.029 0 1 1 1.556-1.347 1.39 1.39 0 0 0 .52.397l.002.001a3.367 3.367 0 0 0 .648.208h.002a4.964 4.964 0 0 0 .695.084 3.132 3.132 0 0 0 1.605-.445c.5-.325.564-.625.564-.851a1.005 1.005 0 0 0-.245-.65 2.06 2.06 0 0 0-.55-.44 2.705 2.705 0 0 0-.664-.24 3.107 3.107 0 0 0-.65-.066 6.046 6.046 0 0 1-1.008-.08 4.578 4.578 0 0 1-1.287-.415A3.708 3.708 0 0 1 1.02 9.04a3.115 3.115 0 0 1-.718-1.954 2.965 2.965 0 0 1 .321-1.333 3.407 3.407 0 0 1 1.253-1.335 4.872 4.872 0 0 1 1.611-.631V2.674a1.03 1.03 0 1 1 2.059 0v1.144l.063.014h.002a5.464 5.464 0 0 1 1.075.368 3.963 3.963 0 0 1 1.157.795A1.03 1.03 0 0 1 6.39 6.453a1.901 1.901 0 0 0-.549-.376 3.516 3.516 0 0 0-.669-.234l-.066-.014a3.183 3.183 0 0 0-.558-.093 3.062 3.062 0 0 0-1.572.422 1.102 1.102 0 0 0-.615.928 1.086 1.086 0 0 0 .256.654l.002.003a1.679 1.679 0 0 0 .537.43l.002.002a2.57 2.57 0 0 0 .703.225h.002a4.012 4.012 0 0 0 .668.053 5.165 5.165 0 0 1 1.087.112l.003.001a4.804 4.804 0 0 1 1.182.428l.004.002a4.115 4.115 0 0 1 1.138.906l.002.002a3.05 3.05 0 0 1 .753 2.003z"/>
            </svg>`;
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="5" width="16" height="14" rx="2"/>
        </svg>`;
    };

    // ==========================================================
    // 🔥 GERAR INPUTS (incluindo correção dos campos de data)
    // ==========================================================
    const camposHTML = schema.fields
        .filter(f => f.name !== "id" && f.type !== "array" && f.name !== "stock")
        .map((campo) => {
            let inputHTML = "";
            if (!campo.visible) return;

            if (campo.type === "select") {
                const opcoes = (campo.options || [])
                    .map(o => `<option value="${o}">${o}</option>`)
                    .join("");

                inputHTML = `
                    <div class="input-wrapper">
                        <span class="icon-addon">${iconForField(campo)}</span>
                        <select id="${campo.name}">
                            <option value="">Selecione</option>
                            ${opcoes}
                        </select>
                    </div>`;
            }

            else if (campo.type === "image") {
                inputHTML = `
                <div class="input-wrapper file-input-wrapper">
                    <span class="icon-addon">📦</span>
                    <div class="fake-input-file">
                        <label class="upload-button">
                            Selecionar imagem
                            <input type="file" id="${campo.name}" accept="image/*">
                        </label>
                        <span class="upload-file-name" id="file_${campo.name}">
                            Nenhum arquivo escolhido
                        </span>
                    </div>
                </div>

                <div class="preview-image-box" id="preview_${campo.name}" style="display:none;">
                    <div class="preview-wrapper">
                        <img id="img_${campo.name}" src="" alt="Preview">
                        <div class="preview-footer-overlay">
                            <button type="button" class="preview-remove-btn" id="remove_${campo.name}">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>`;
            }

            else {
                inputHTML = `
                <div class="input-wrapper">
                    <span class="icon-addon">${iconForField(campo)}</span>
                    <input type="${campo.type}" id="${campo.name}" placeholder="${campo.label}">
                </div>`;
            }

            return `
                <div class="form-group">
                    <label>${campo.label}${campo.required ? ' <span class="obrigatorio">*</span>' : ''}</label>
                    ${inputHTML}
                    <small class="erro-msg" data-erro="${campo.name}"></small>
                </div>`;
            })
        .join("");

    // ==========================================================
    // Template do modal
    // ==========================================================
    modalBg.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h2>Novo ${schema.display}</h2>
                <button class="btn-cancelar" id="btnCancelarModal"><span>✕</span> Cancelar</button>
            </div>

            <div class="modal-body">
                <div class="form-section-full">DADOS PRINCIPAIS</div>
                ${camposHTML}
            </div>

            <div class="modal-footer">
                <button id="btnSalvarRegistro" class="btn-salvar">Salvar Registro</button>
                <div class="loader" id="loader" style="display:none;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modalBg);

    // ==========================================================
    // Aplicação de Máscaras
    // ==========================================================
    schema.fields.forEach((campo) => {
        const input = modalBg.querySelector(`#${campo.name}`);
        if (!input) return;

        const label = campo.label.toLowerCase();
        if (label.includes("cpf")) input.addEventListener("input", e => formatarCPF(e.target));
        if (label.includes("telefone")) input.addEventListener("input", e => formatarTelefone(e.target));

        // moeda
        if (campo.name.toLowerCase().includes("price") || campo.name.toLowerCase().includes("value")) {
            aplicarMascaraMoedaInteligente(input);
        }

        // cnpj → consulta
        if (campo.name === "cnpj") {
            let timeout = null;
            input.addEventListener("input", (e) => {
                formatarCNPJ(e.target);
                const digits = somenteNumeros(e.target.value);

                clearTimeout(timeout);

                if (digits.length === 14) {
                    timeout = setTimeout(() => buscarCNPJ(digits, modalBg), 400);
                }
            });
        }

        // cep → consulta
        if (label.includes("cep")) {
            let timeout = null;

            input.addEventListener("input", (e) => {
                formatarCEP(e.target);
                const digits = somenteNumeros(e.target.value);

                clearTimeout(timeout);

                if (digits.length === 8) {
                    timeout = setTimeout(() => buscarCEP(digits, modalBg), 400);
                }
            });
        }

        // upload imagem
        if (campo.type === "image") {
            const box = modalBg.querySelector(`#preview_${campo.name}`);
            const img = modalBg.querySelector(`#img_${campo.name}`);
            const labelArq = modalBg.querySelector(`#file_${campo.name}`);
            const btnRemove = modalBg.querySelector(`#remove_${campo.name}`);

            input.addEventListener("change", () => {
                const file = input.files[0];
                if (!file) return;

                labelArq.textContent = file.name;

                const reader = new FileReader();
                reader.onload = () => {
                    img.src = reader.result;
                    box.style.display = "flex";
                };
                reader.readAsDataURL(file);
            });

            btnRemove.addEventListener("click", () => {
                input.value = "";
                img.src = "";
                box.style.display = "none";
                labelArq.textContent = "Nenhum arquivo escolhido";
            });
        }
    });

    if (schema.key === "despesas") {
        setupDespesasForm(modalBg);
    }

    // ---------------------------------------------------------
    // FECHAR
    // ---------------------------------------------------------
    modalBg.querySelector("#btnCancelarModal").addEventListener("click", () => modalBg.remove());
    modalBg.addEventListener("click", e => { if (e.target === modalBg) modalBg.remove(); });

    // ---------------------------------------------------------
    // SALVAR
    // ---------------------------------------------------------
    modalBg.querySelector("#btnSalvarRegistro").addEventListener("click", async () => {
        const btn = modalBg.querySelector("#btnSalvarRegistro");
        const loader = modalBg.querySelector("#loader");

        btn.disabled = true;
        loader.style.display = "inline-block";

        try {
            let erros = [];
            const payload = {};

            // ==========================================================
            // DESPESAS (produção) - payload + validação específica
            // ==========================================================
            if (schema.key === "despesas") {
                const get = (id) => modalBg.querySelector("#" + id);
                const setErro = (name, msg) => {
                    const input = get(name);
                    const msgErro = modalBg.querySelector(`[data-erro="${name}"]`);
                    if (msgErro) msgErro.textContent = msg || "";
                    input?.classList.toggle("erro-campo", !!msg);
                };

                const toBR = (iso) => {
                    if (!iso) return "";
                    const [y, m, d] = iso.split("-");
                    if (!y || !m || !d) return iso;
                    return `${d}/${m}/${y}`;
                };

                const dueISO = (get("dueDate")?.value || "").trim();
                const category = (get("category")?.value || "").trim();
                const type = (get("type")?.value || "").trim();
                const paymentMethod = (get("paymentMethod")?.value || "").trim();
                const status = (get("status")?.value || "Em andamento").trim();
                const description = (get("description")?.value || "").trim();

                ["dueDate", "category", "type", "paymentMethod", "value", "installments", "installmentValue"].forEach((k) => setErro(k, ""));

                if (!dueISO) { erros.push("Data"); setErro("dueDate", "⚠️ Campo obrigatório."); }
                if (!category) { erros.push("Categoria"); setErro("category", "⚠️ Campo obrigatório."); }
                if (!type) { erros.push("Tipo"); setErro("type", "⚠️ Campo obrigatório."); }
                if (!paymentMethod) { erros.push("Método de Pagamento"); setErro("paymentMethod", "⚠️ Campo obrigatório."); }

                if (isFutureISODate(dueISO)) {
                    mostrarMensagem("⚠️ A data não pode ser maior que hoje.", "erro");
                    setErro("dueDate", "⚠️ A data não pode ser maior que hoje.");
                }

                const isCredit = paymentMethod === "Cartão de Crédito";

                if (isCredit) {
                    const qtd = Math.max(1, Number((get("installments")?.value || "1").trim()));
                    const parcela = moedaParaNumeroInteligente((get("installmentValue")?.value || "").trim());
                    const total = Number((qtd * (parcela || 0)).toFixed(2));

                    if (!qtd || qtd < 1) { erros.push("Qtd. de Parcelas"); setErro("installments", "⚠️ Informe as parcelas."); }
                    if (!parcela || parcela <= 0) { erros.push("Valor da Parcela"); setErro("installmentValue", "⚠️ Informe o valor."); }
                    if (!total || total <= 0) { erros.push("Valor Total"); setErro("value", "⚠️ Valor inválido."); }

                    payload.installments = qtd;
                    payload.value = total;
                    payload.type = (qtd > 1) ? "Parcela Mensal" : type;
                } else {
                    const total = moedaParaNumeroInteligente((get("value")?.value || "").trim());
                    if (!total || total <= 0) { erros.push("Valor Total"); setErro("value", "⚠️ Valor inválido."); }

                    payload.installments = 1;
                    payload.value = total;
                    payload.type = type;
                }

                payload.dueDate = get("dueDate").value; // YYYY-MM-DD
                payload.description = description || "";
                payload.category = category;
                payload.paymentMethod = paymentMethod;
                payload.status = status;

                // IMPORTANTE: aqui você precisa "pular" o for padrão.
                // Então coloque um `else { ...for padrão... }`
            }


            for (const campo of schema.fields.filter(f => f.name !== "id" && f.type !== "array")) {
                const input = modalBg.querySelector(`#${campo.name}`);
                const msgErro = modalBg.querySelector(`[data-erro="${campo.name}"]`);

                if (msgErro) msgErro.textContent = "";
                input?.classList.remove("erro-campo");

                let valor = (input?.value || "").trim();

                if (campo.type === "image") {
                    const file = input.files?.[0];

                    if (file) {
                        payload[campo.name] = await uploadToCloudinary(file);
                    } else {
                        payload[campo.name] = "https://png.pngtree.com/png-vector/20221125/ourmid/pngtree-no-image-available-icon-flatvector-illustration-picture-coming-creative-vector-png-image_40968940.jpg";
                    }
                    continue;
                }

                if (campo.type === "number" && campo.name.toLowerCase().includes("value") || campo.name.toLowerCase().includes("price")) {
                    payload[campo.name] = moedaParaNumeroInteligente(valor);
                    continue;
                }

                if (campo.required && !valor) {
                    erros.push(campo.label);
                    msgErro.textContent = "⚠️ Campo obrigatório.";
                    input.classList.add("erro-campo");
                    if (!erros) erros = input;
                }

                payload[campo.name] = valor || null;
            }

            if (erros.length) {
                mostrarMensagem("Preencha todos os campos obrigatórios.", "erro");

                // 🔥 scroll para o primeiro campo com erro
                const primeiroErro = modalBg.querySelector(".erro-campo");
                scrollToElement(primeiroErro);

                btn.disabled = false;
                loader.style.display = "none";
                return;
            }

            if (schema.key === "clientes") {
                payload.orders = [];
            }
            
            const token = localStorage.getItem("token");
            const res = await fetch(API_URL + schema.apiPath, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: "Bearer " + token } : {})
                },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (!json.success) {
                console.log(json)
                mostrarMensagem(json.message || "Erro ao salvar.", "erro");
            
            } else {
                mostrarMensagem("Registro atualizado com sucesso! ✨", "sucesso");
                await carregarTabela(abaAtiva);
                modalBg.remove();
            }

        } catch (err) {
            console.error("❌ Erro ao salvar registro:", err);
            mostrarMensagem("Erro ao salvar registro.", "erro");

        } finally {
            btn.disabled = false;
            loader.style.display = "none";
        }
    });
}

// ==========================================================
// 🔹 Ver Detalhes
// ==========================================================

window.verDetalhesRegistro = async function (indice) {
    try {
        const schema = SCHEMAS[abaAtiva];
        const lista = dados[abaAtiva] || [];
        const registro = lista[indice];

        if (!schema || !registro) {
            mostrarMensagem("Registro não encontrado.", "erro");
            return;
        }

        const modalBg = document.createElement("div");
        modalBg.className = "modal-bg";
        modalBg.style.display = "flex";

        const infoHTML = schema.fields
            .filter(f => !f.hidden && f.name !== "orders" && f.name !== "id")
            .map(f => {
                let valor = registro[f.name];

                // preços em moeda
                if (["price", "cost", "saleprice", "costprice"].some(k => f.name.toLowerCase().includes(k))) {
                    if (valor !== null && valor !== undefined && valor !== "") {
                        valor = formatBRL(Number(valor));

                    } else {
                        valor = "Não preenchido";
                    }
                }

                // estoque
                if (f.name === "stock") {
                    if (valor === null || valor === undefined || valor === "") valor = 0;
                }

                // data de nascimento
                if (f.name === "birthdate" && valor) {
                    valor = isoToBR(valor);
                }

                // imagens
                if (f.type === "image") {
                    if (!valor) return "";
                    return `
                        <div class="detalhe-item detalhe-span-2 detalhe-item-imagem">
                            <strong>${f.label}:</strong>
                            <img class="detalhe-img-produto"
                                 src="${valor}"
                                 alt="Imagem do Produto">
                        </div>
                    `;
                }

                if (valor === null || valor === undefined || valor === "") {
                    valor = "Não preenchido";
                }

                if (f.name === "stock") {
                    valor = (valor ?? 0) + " un";
                }

                const spanClass = (f.name === "address") ? "detalhe-span-2" : "";

                return `
                    <div class="detalhe-item ${spanClass}">
                        <strong>${f.label}:</strong>
                        <span>${valor}</span>
                    </div>
                `;
            })
            .join("");

        modalBg.innerHTML = `
            <div class="modal-card detalhes">
                <div class="modal-header">
                    <h2>📋 Detalhes — ${schema.display}</h2>
                    <button class="btn-cancelar" id="fecharDetalhes">
                        <span>✕</span> Fechar
                    </button>
                </div>

                <div class="modal-body">
                    <div class="detalhes-container" id="detalhesContainer">
                        ${infoHTML}
                    </div>

                    <div id="extraContainer"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modalBg);

        // Fechar modal
        modalBg.querySelector("#fecharDetalhes").addEventListener("click", () => modalBg.remove());
        modalBg.addEventListener("click", e => { if (e.target === modalBg) modalBg.remove(); });

        const container = modalBg.querySelector("#detalhesContainer");
        const extraContainer = modalBg.querySelector("#extraContainer");

        // =========================
        // CLIENTES (já existia)
        // =========================
        if (schema.key === "clientes") {
            const pedidosCliente = Array.isArray(registro.orders) ? registro.orders : [];

            let paginaAtual = 1;
            const porPagina = 5;
            const totalPaginas = Math.ceil(pedidosCliente.length / porPagina);

            function renderPedidos() {
                const inicio = (paginaAtual - 1) * porPagina;
                const fim = inicio + porPagina;
                const pagina = pedidosCliente.slice(inicio, fim);

                const linhas = pagina.length
                    ? pagina.map(p => `
                        <tr>
                            <td>${p.idPedido || "-"}</td>
                            <td>${isoToBR(p.data) || "-"}</td>
                            <td>${p.canal || "-"}</td>
                            <td>${p.status || "-"}</td>
                            <td>${(formatBRL(p.total || 0))}</td>
                        </tr>
                    `).join("")
                    : `<tr><td colspan="5" style="text-align:center;">Nenhum pedido encontrado.</td></tr>`;

                const totalPedidos = pedidosCliente.length;
                const totalGasto = pedidosCliente.reduce((acc, p) => acc + Number(p.total || 0), 0);
                const ultimoPedido = pedidosCliente[0];
                const ultimaData = ultimoPedido ? isoToBR(ultimoPedido.data) : "-";

                const gastoFormatado = formatBRL(totalGasto)

                extraContainer.innerHTML = `
                    <div class="resumo-cliente">
                        <div class="resumo-item">
                            <div class="resumo-icon">
                                <svg viewBox="0 0 24 24">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                                    <path d="M3.27 6.96 12 12l8.73-5.04"/>
                                    <path d="M12 12v10"/>
                                </svg>
                            </div>
                            <div>
                                <strong>Total de Pedidos</strong>
                                <span>${totalPedidos}</span>
                            </div>
                        </div>
                        
                        <div class="resumo-item">
                            <div class="resumo-icon">
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                                    <path d="M16 2v4M8 2v4M3 10h18"/>
                                </svg>
                            </div>
                            <div>
                                <strong>Última Compra</strong>
                                <span>${ultimaData}</span>
                            </div>
                        </div>

                        <div class="resumo-item">
                            <div class="resumo-icon">
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="6" width="18" height="12" rx="2"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </div>
                            <div>
                                <strong>Total Gasto</strong>
                                <span>${gastoFormatado}</span>
                            </div>
                        </div>
                    </div>

                    <h3>🛍️ Últimos Pedidos</h3>
                    <table class="tabela-pedidos">
                        <thead>
                            <tr>
                                <th>ID Pedido</th>
                                <th>Data</th>
                                <th>Canal</th>
                                <th>Status</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>${linhas}</tbody>
                    </table>

                    ${totalPaginas > 1 ? `
                        <div class="paginacao">
                            <button ${paginaAtual === 1 ? "disabled" : ""} id="prevPag">⬅</button>
                            <span>Página ${paginaAtual} de ${totalPaginas}</span>
                            <button ${paginaAtual === totalPaginas ? "disabled" : ""} id="nextPag">⮕</button>
                        </div>
                    ` : ""}
                `;

                const btnPrev = extraContainer.querySelector("#prevPag");
                const btnNext = extraContainer.querySelector("#nextPag");
                if (btnPrev) btnPrev.addEventListener("click", () => { paginaAtual--; renderPedidos(); });
                if (btnNext) btnNext.addEventListener("click", () => { paginaAtual++; renderPedidos(); });
            }

            renderPedidos();

            // layout clientes
            const itens = Array.from(container.children);
            const colEsq = document.createElement("div");
            const colDir = document.createElement("div");
            colEsq.className = "cliente-col-esquerda";
            colDir.className = "cliente-col-direita";

            const mover = (fragmento, destino) => {
                const idx = itens.findIndex(el => {
                    const label = el.querySelector("strong")?.innerText.toLowerCase() || "";
                    return label.replace(":", "").includes(fragmento);
                });
                if (idx >= 0) {
                    destino.appendChild(itens[idx]);
                    itens.splice(idx, 1);
                }
            };

            mover("nome", colEsq);
            mover("e-mail", colEsq);
            mover("cep", colEsq);
            mover("endereço", colEsq);

            mover("cpf", colDir);
            mover("telefone", colDir);
            mover("gênero", colDir);
            mover("nascimento", colDir);

            itens.forEach(el => colEsq.appendChild(el));

            container.innerHTML = "";
            container.classList.add("cliente-layout");
            container.appendChild(colEsq);
            container.appendChild(colDir);

            extraContainer.style.gridColumn = "1 / -1";
            extraContainer.style.width = "100%";
        }

        // =========================
        // FORNECEDORES  🔽 (NOVO)
        // =========================
        if (schema.key === "fornecedores") {
            const itens = Array.from(container.children);

            const pick = (fragmento) => {
                const idx = itens.findIndex(el => {
                    const label = el.querySelector("strong")?.innerText.toLowerCase() || "";
                    return label.replace(":", "").includes(fragmento);
                });
                if (idx === -1) return null;
                const el = itens[idx];
                itens.splice(idx, 1);
                return el;
            };

            const cnpj         = pick("cnpj");
            const razaoSocial  = pick("razão social") || pick("razao social");
            const nomeFantasia = pick("nome fantasia");
            const telefone     = pick("telefone");
            const ie           = pick("inscrição estadual") || pick("inscricao estadual");
            const estado       = pick("estado");
            const email        = pick("e-mail") || pick("email");

            const layout = document.createElement("div");
            layout.className = "fornecedor-layout";

            // Linha 1: CNPJ | Razão Social | Nome Fantasia
            const row1 = document.createElement("div");
            row1.className = "fornecedor-row3";
            if (cnpj)        row1.appendChild(cnpj);
            if (razaoSocial) row1.appendChild(razaoSocial);
            if (nomeFantasia)row1.appendChild(nomeFantasia);
            layout.appendChild(row1);

            // Linha 2: Telefone | IE | Estado | Email
            const row2 = document.createElement("div");
            row2.className = "fornecedor-row4";
            if (telefone) row2.appendChild(telefone);
            if (ie)       row2.appendChild(ie);
            if (estado)   row2.appendChild(estado);
            if (email)    row2.appendChild(email);
            if (row2.childElementCount > 0) layout.appendChild(row2);

            // Qualquer campo que sobrar
            if (itens.length) {
                const rowExtra = document.createElement("div");
                rowExtra.className = "fornecedor-row-extra";
                itens.forEach(el => rowExtra.appendChild(el));
                layout.appendChild(rowExtra);
            }

            container.innerHTML = "";
            container.appendChild(layout);
        }

        // =========================
        // PRODUTOS (já existia)
        // =========================
        if (schema.key === "produtos") {
            const imagemCampo = schema.fields.find(f => f.type === "image");
            const valorImagem = imagemCampo ? registro[imagemCampo.name] : null;

            const estoqueCampo = schema.fields.find(f => f.name === "stock");
            let valorEstoque = estoqueCampo ? registro[estoqueCampo.name] : 0;
            valorEstoque = `${valorEstoque} un`;

            const itens = Array.from(container.children);

            const pick = (label) =>
                itens.find(el =>
                    (el.querySelector("strong")?.innerText.toLowerCase() || "").includes(label)
                );

            const nome = pick("nome");
            const sku = pick("sku");
            const categoria = pick("categoria");
            const precoCusto = pick("custo");
            const precoVenda = pick("venda");
            const estoque = pick("estoque");

            const layout = document.createElement("div");
            layout.className = "produto-layout-master";

            const esquerda = document.createElement("div");
            esquerda.className = "produto-col-esquerda";

            const direita = document.createElement("div");
            direita.className = "produto-col-direita";

            if (valorImagem) {
                direita.innerHTML = `
                    <div class="produto-imagem-wrapper">
                        <img src="${valorImagem}" class="detalhe-img-produto">
                    </div>
                `;
            }

            if (nome) {
                nome.classList.add("produto-fullrow");
                esquerda.appendChild(nome);
            }

            const row1 = document.createElement("div");
            row1.className = "produto-row2";
            if (sku) row1.appendChild(sku);
            if (categoria) row1.appendChild(categoria);
            esquerda.appendChild(row1);

            const row2 = document.createElement("div");
            row2.className = "produto-row2";
            if (precoCusto) row2.appendChild(precoCusto);
            if (precoVenda) row2.appendChild(precoVenda);
            esquerda.appendChild(row2);

            if (estoque) {
                estoque.classList.add("produto-estoque-fullrow");
                esquerda.appendChild(estoque);
            }

            layout.appendChild(esquerda);
            layout.appendChild(direita);

            container.innerHTML = "";
            container.appendChild(layout);
        }

        // =========================
        // DESPESAS  💸
        // =========================
        if (schema.key === "despesas") {
            const despesa = registro;

            const valorFormatado = formatBRL(Number(despesa.value || 0))

            const status = despesa.status || "Pendente";
            const vencStr = isoToBR(despesa.dueDate);
            const pagtoStr = isoToBR(despesa.paymentDate);

            const statusHtml = `
                <span class="badge-status badge-${status.toLowerCase().replace(/[ ()]/g, "-")}">
                    ${status}
                </span>
            `;

            extraContainer.innerHTML = `
                <div class="despesa-resumo">
                    <div class="despesa-row">
                        <div class="despesa-card">
                            <span class="label">Vencimento</span>
                            <strong>${vencStr}</strong>
                        </div>
                        <div class="despesa-card">
                            <span class="label">Status</span>
                            <strong>${statusHtml}</strong>
                        </div>
                        <div class="despesa-card">
                            <span class="label">Valor</span>
                            <strong>${valorFormatado}</strong>
                        </div>
                    </div>

                    <div class="despesa-row">
                        <div class="despesa-card">
                            <span class="label">Tipo</span>
                            <strong>${despesa.type || "-"}</strong>
                        </div>
                        <div class="despesa-card">
                            <span class="label">Método de Pagamento</span>
                            <strong>${despesa.paymentMethod || "-"}</strong>
                        </div>
                        <div class="despesa-card">
                            <span class="label">Parcelas</span>
                            <strong>${despesa.type === "Parcelado" ? (despesa.installments || 0) + "x" : "-"}</strong>
                        </div>
                    </div>

                    <div class="despesa-row">
                        <div class="despesa-card despesa-card-full">
                            <span class="label">Data de Pagamento</span>
                            <strong>${pagtoStr}</strong>
                        </div>
                    </div>

                    <h3 class="despesa-historico-titulo">📜 Histórico</h3>
                    <div class="despesa-historico">
                        ${
                            Array.isArray(despesa.history) && despesa.history.length
                                ? despesa.history.map(item => `
                                    <div class="historico-item">
                                        <span class="historico-data">${isoToBR(item.date)}</span>
                                        <span class="historico-acao">${item.action || ""}</span>
                                        ${
                                            item.fromStatus || item.toStatus
                                                ? `<span class="historico-status">
                                                       ${item.fromStatus || ""} ${item.toStatus ? "→ " + item.toStatus : ""}
                                                   </span>`
                                                : ""
                                        }
                                    </div>
                                  `).join("")
                                : `<p class="historico-vazio">Nenhum evento registrado ainda.</p>`
                        }
                    </div>
                </div>
            `;
        }

    } catch (err) {
        console.error("❌ Erro ao abrir detalhes:", err);
        mostrarMensagem("Erro ao exibir detalhes.", "erro");
    }
};

// ==========================================================
// 🔹 Editar Registro
// ==========================================================

window.editarRegistro = async function (indice) {
    try {
        const schema = SCHEMAS[abaAtiva];
        const lista = dados[abaAtiva] || [];
        const registro = lista[indice];

        if (!schema || !registro) {
            mostrarMensagem("Registro não encontrado.", "erro");
            return;
        }

        const modalBg = document.createElement("div");
        modalBg.className = "modal-bg fade-in";
        modalBg.style.display = "flex";

        // Helper: ícone por tipo de campo
        const iconForField = (campo) => {
            const label = campo.label.toLowerCase();
            if (label.includes("cpf") || label.includes("cnpj") || label.includes("razão") ||
                label.includes("fantasia") || label.includes("estadual") || label.includes("descrição")) {
                return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                    <path d="M7 8h10M7 12h7M7 16h4"/>
                </svg>`;
            }

            if (label.includes("nome")) {
                return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/>
                    <path d="M6 20a6 6 0 0 1 12 0"/>
                </svg>`;
            }

            if (label.includes("sku")) {
                return `<svg viewBox="0 0 1024 1024" fill="#000000" class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier"><path d="M300 462.4h424.8v48H300v-48zM300 673.6H560v48H300v-48z" fill="">
                        </path><path d="M818.4 981.6H205.6c-12.8 0-24.8-2.4-36.8-7.2-11.2-4.8-21.6-11.2-29.6-20-8.8-8.8-15.2-18.4-20-29.6-4.8-12-7.2-24-7.2-36.8V250.4c0-12.8 2.4-24.8 7.2-36.8 4.8-11.2 11.2-21.6 20-29.6 8.8-8.8 18.4-15.2 29.6-20 12-4.8 24-7.2 36.8-7.2h92.8v47.2H205.6c-25.6 0-47.2 20.8-47.2 47.2v637.6c0 25.6 20.8 47.2 47.2 47.2h612c25.6 0 47.2-20.8 47.2-47.2V250.4c0-25.6-20.8-47.2-47.2-47.2H725.6v-47.2h92.8c12.8 0 24.8 2.4 36.8 7.2 11.2 4.8 21.6 11.2 29.6 20 8.8 8.8 15.2 18.4 20 29.6 4.8 12 7.2 24 7.2 36.8v637.6c0 12.8-2.4 24.8-7.2 36.8-4.8 11.2-11.2 21.6-20 29.6-8.8 8.8-18.4 15.2-29.6 20-12 5.6-24 8-36.8 8z" fill=""></path>
                        <path d="M747.2 297.6H276.8V144c0-32.8 26.4-59.2 59.2-59.2h60.8c21.6-43.2 66.4-71.2 116-71.2 49.6 0 94.4 28 116 71.2h60.8c32.8 0 59.2 26.4 59.2 59.2l-1.6 153.6z m-423.2-47.2h376.8V144c0-6.4-5.6-12-12-12H595.2l-5.6-16c-11.2-32.8-42.4-55.2-77.6-55.2-35.2 0-66.4 22.4-77.6 55.2l-5.6 16H335.2c-6.4 0-12 5.6-12 12v106.4z" fill=""></path>
                    </g>
                </svg>`
            }

            if (label.includes("e-mail") || label.includes("email")) {
                return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2"/>
                    <path d="m3 7 9 6 9-6"/>
                </svg>`;
            }

            if (label.includes("telefone") || label.includes("celular")) {
                return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 2h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 4a2 2 0 0 1 2-2Z"/>
                </svg>`;
            }

            if (label.includes("cep") || label.includes("endereço") || label.includes("endereco") || label.includes("estado")) {
                return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10Z"/>
                    <circle cx="12" cy="11" r="2.5"/>
                </svg>`;
            }

            if (campo.type === "date" || label.includes("data") || label.includes("parcelas")) {
                return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>`;
            }

            if (campo.type === "select" || label.includes("gênero")) {
                return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 5h18l-3 7H6l-3-7Z"/>
                    <path d="M6 12v5a6 6 0 0 0 12 0v-5"/>
                </svg>`;
            }

            if (label.includes("venda") || label.includes("valor") || label.includes("custo")) {
                return `<svg fill="#000000" viewBox="-5 0 19 19" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.699 11.907a3.005 3.005 0 0 1-1.503 2.578 4.903 4.903 0 0 1-1.651.663V16.3a1.03 1.03 0 1 1-2.059 0v-1.141l-.063-.011a5.199 5.199 0 0 1-1.064-.325 3.414 3.414 0 0 1-1.311-.962 1.029 1.029 0 1 1 1.556-1.347 1.39 1.39 0 0 0 .52.397l.002.001a3.367 3.367 0 0 0 .648.208h.002a4.964 4.964 0 0 0 .695.084 3.132 3.132 0 0 0 1.605-.445c.5-.325.564-.625.564-.851a1.005 1.005 0 0 0-.245-.65 2.06 2.06 0 0 0-.55-.44 2.705 2.705 0 0 0-.664-.24 3.107 3.107 0 0 0-.65-.066 6.046 6.046 0 0 1-1.008-.08 4.578 4.578 0 0 1-1.287-.415A3.708 3.708 0 0 1 1.02 9.04a3.115 3.115 0 0 1-.718-1.954 2.965 2.965 0 0 1 .321-1.333 3.407 3.407 0 0 1 1.253-1.335 4.872 4.872 0 0 1 1.611-.631V2.674a1.03 1.03 0 1 1 2.059 0v1.144l.063.014h.002a5.464 5.464 0 0 1 1.075.368 3.963 3.963 0 0 1 1.157.795A1.03 1.03 0 0 1 6.39 6.453a1.901 1.901 0 0 0-.549-.376 3.516 3.516 0 0 0-.669-.234l-.066-.014a3.183 3.183 0 0 0-.558-.093 3.062 3.062 0 0 0-1.572.422 1.102 1.102 0 0 0-.615.928 1.086 1.086 0 0 0 .256.654l.002.003a1.679 1.679 0 0 0 .537.43l.002.002a2.57 2.57 0 0 0 .703.225h.002a4.012 4.012 0 0 0 .668.053 5.165 5.165 0 0 1 1.087.112l.003.001a4.804 4.804 0 0 1 1.182.428l.004.002a4.115 4.115 0 0 1 1.138.906l.002.002a3.05 3.05 0 0 1 .753 2.003z"/>
                </svg>`;
            }

            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="#4b3522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="5" width="16" height="14" rx="2"/>
            </svg>`;
        };

        const camposHTML = schema.fields
            .filter(f => f.name !== "id" && f.type !== "array" && f.name !== "stock")
            .map((campo) => {
                let valorAtual = registro[campo.name] || "";
                if (campo.type === "date" && valorAtual) {
                    valorAtual = brToISO(valorAtual);
                }


                const isMoneyField =
                    campo.name.toLowerCase().includes("price") ||
                    campo.name.toLowerCase().includes("value") ||
                    campo.name.toLowerCase().includes("installmentvalue");

                if (isMoneyField) {
                    if (schema.key == "despesas" && campo.name.toLowerCase().includes("installmentvalue")) {
                        valorAtual = Number(registro['value']) / Number(registro['installments']);
                    };
                    
                    valorAtual = formatBRL(valorAtual);
                }


                let inputHTML = "";
                if (campo.type === "select") {
                    const opcoes = (campo.options || [])
                        .map(o => `<option value="${o}" ${o === valorAtual ? "selected" : ""}>${o}</option>`)
                        .join("");

                    inputHTML = `
                        <div class="input-wrapper">
                            <span class="icon-addon">${iconForField(campo)}</span>
                            <select id="${campo.name}">
                                <option value="">Selecione</option>
                                ${opcoes}
                            </select>
                        </div>`;
                }

                else if (campo.type === "image") {
                    inputHTML = `
                        <div class="input-wrapper file-input-wrapper">
                            <span class="icon-addon">📦</span>

                            <div class="fake-input-file">
                                <label class="upload-button">
                                    Selecionar imagem
                                    <input type="file" id="${campo.name}" accept="image/*">
                                </label>

                                <span class="upload-file-name" id="file_${campo.name}">
                                    ${valorAtual ? "(Imagem atual)" : "Nenhum arquivo escolhido"}
                                </span>
                            </div>
                        </div>

                        <div class="preview-image-box" id="preview_${campo.name}" style="${valorAtual ? "display:flex;" : "display:none;"}">
                            <div class="preview-wrapper">
                                <img id="img_${campo.name}" src="${valorAtual}" alt="Preview">
                                <div class="preview-footer-overlay">
                                    <button type="button" class="preview-remove-btn" id="remove_${campo.name}">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                                            stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }

                else {
                    let htmlType = campo.type;
                    if (campo.type === "telefone" || campo.type === "cpf" || campo.type === "cnpj")
                        htmlType = "text";

                    const isMoneyField =
                    campo.name.toLowerCase().includes("price") ||
                    campo.name.toLowerCase().includes("value") ||
                    campo.name.toLowerCase().includes("installmentvalue");

                    if (isMoneyField) {
                    htmlType = "text";
                    }

                    inputHTML = `
                        <div class="input-wrapper">
                            <span class="icon-addon">${iconForField(campo)}</span>
                            <input type="${htmlType}" id="${campo.name}" value="${valorAtual}" placeholder="${campo.label}">
                        </div>`;
                }

                return `
                    <div class="form-group">
                        <label>${campo.label}${campo.required ? ' <span class="obrigatorio">*</span>' : ''}</label>
                        ${inputHTML}
                        <small class="erro-msg" data-erro="${campo.name}"></small>
                    </div>`;
            })
        .join("");

        modalBg.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h2>✏️ Editar ${schema.display}</h2>
                    <button class="btn-cancelar" id="btnCancelarModal"><span>✕</span> Cancelar</button>
                </div>
                <div class="modal-body">
                    <div class="form-section-full">Dados principais</div>
                    ${camposHTML}
                </div>
                <div class="modal-footer">
                    <button id="btnSalvarEdicao" class="btn-salvar">Salvar Alterações</button>
                    <div class="loader" id="loader" style="display:none;"></div>
                </div>
            </div>`;
        document.body.appendChild(modalBg);

        schema.fields.forEach((campo) => {
            const input = modalBg.querySelector(`#${campo.name}`);
            if (!input) return;
            const label = campo.label.toLowerCase();
            if (label.includes("cpf")) input.addEventListener("input", e => formatarCPF(e.target));
            if (label.includes("telefone")) input.addEventListener("input", e => formatarTelefone(e.target));

            let cnpjTimeout = null;
            if (campo.name === "cnpj") {
                input.addEventListener("input", (e) => {
                    formatarCNPJ(e.target);

                    const digits = somenteNumeros(e.target.value);
                    clearTimeout(cnpjTimeout);

                    if (digits.length === 14) {
                        cnpjTimeout = setTimeout(() => {
                            buscarCNPJ(digits, modalBg);
                        }, 400);
                    }
                });
            }

            let cepTimeout = null;
            if (label.includes("cep")) {
                input.addEventListener("input", (e) => {
                    formatarCEP(e.target);

                    const digits = somenteNumeros(e.target.value);
                    clearTimeout(cepTimeout);

                    if (digits.length === 8) {
                        cepTimeout = setTimeout(() => {
                            buscarEndereco(digits, modalBg);
                        }, 400);
                    }
                });
            }

            if (campo.type === "image") {
                const fileInput = modalBg.querySelector(`#${campo.name}`);
                const previewImg = modalBg.querySelector(`#img_${campo.name}`);
                const previewBox = modalBg.querySelector(`#preview_${campo.name}`);
                const fileLabel = modalBg.querySelector(`#file_${campo.name}`);
                const btnRemove = modalBg.querySelector(`#remove_${campo.name}`);

                if (!fileInput) return;
                fileInput.addEventListener("change", () => {
                    const file = fileInput.files?.[0];
                    if (!file) return;

                    fileLabel.textContent = file.name;

                    const reader = new FileReader();
                    reader.onload = () => {
                        previewImg.src = reader.result;
                        previewBox.style.display = "flex";
                    };
                    reader.readAsDataURL(file);
                });

                btnRemove.addEventListener("click", () => {
                    fileInput.value = "";
                    fileInput.dataset.removed = "true"; // 🔥 linha-chave

                    previewImg.src = "";
                    previewBox.style.display = "none";
                    fileLabel.textContent = "Nenhum arquivo escolhido";
                });
            }

            if (campo.type === "number" && campo.name.toLowerCase().includes("price")) {
                aplicarMascaraMoedaInteligente(input);
            }
        });
        
        // ==========================================================
        // 🔥 APLICA LÓGICA DE DESPESAS TAMBÉM NO EDITAR
        // ==========================================================
        if (schema.key === "despesas") {
            setupDespesasForm(modalBg);
        }
        
        const fecharModal = () => {
            modalBg.classList.remove("fade-in");
            modalBg.classList.add("fade-out");
            setTimeout(() => modalBg.remove(), 200);
        };
        
        modalBg.querySelector("#btnCancelarModal").addEventListener("click", fecharModal);
        modalBg.addEventListener("click", e => { if (e.target === modalBg) fecharModal(); });

        modalBg.querySelector("#btnSalvarEdicao").addEventListener("click", async () => {
            const btn = modalBg.querySelector("#btnSalvarEdicao");
            const loader = modalBg.querySelector("#loader");
            btn.disabled = true;
            loader.style.display = "inline-block";

            try {
                let erros = [];
                const payload = {};

                for (const campo of schema.fields.filter(f => f.name !== "id" && f.type !== "array" && f.name !== "stock")) {
                    const input = modalBg.querySelector(`#${campo.name}`);
                    const msgErro = modalBg.querySelector(`[data-erro="${campo.name}"]`);

                    if (msgErro) msgErro.textContent = "";
                    input?.classList.remove("erro-campo");

                    let valor = (input?.value || "").trim();

                    if (campo.type === "image") {
                        const file = input.files?.[0];

                        if (file) {
                            payload[campo.name] = await uploadToCloudinary(file);

                        } else if (input.dataset.removed === "true") {
                            payload[campo.name] = "https://png.pngtree.com/png-vector/20221125/ourmid/pngtree-no-image-available-icon-flatvector-illustration-picture-coming-creative-vector-png-image_40968940.jpg";

                        } else {
                            payload[campo.name] = registro[campo.name];
                        }

                        continue;
                    }

                    if (campo.type === "number" && campo.name.toLowerCase().includes("price")) {
                        payload[campo.name] = moedaParaNumeroInteligente(valor);
                        continue;
                    }

                    if (campo.required && !valor) {
                        erros.push(campo.label);
                        if (!primeiroCampoComErro) primeiroCampoComErro = input;
                        if (msgErro) msgErro.textContent = "⚠️ Campo obrigatório.";
                        input?.classList.add("erro-campo");
                    }

                    payload[campo.name] = valor || null;
                }

                if (erros.length) {
                    mostrarMensagem("Preencha todos os campos obrigatórios.", "erro");
                    btn.disabled = false;
                    loader.style.display = "none";
                    return;
                }

                if (schema.key === "clientes") {
                    payload.orders = registro.orders || [];
                }

                
                
                const token = localStorage.getItem("token");
                const id = registro.id;
                const res = await fetch(`${API_URL}${schema.apiPath}/${id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": "Bearer " + token } : {})
                    },
                    body: JSON.stringify(payload)
                });
                
                const json = await res.json();
                if (!json.success) {
                    mostrarMensagem(json.message || "Erro ao atualizar.", "erro");
                    btn.disabled = false;
                    loader.style.display = "none";
                    return;
                }

                mostrarMensagem("Registro atualizado com sucesso! ✨", "sucesso");
                fecharModal();
                await carregarTabela(abaAtiva);

            } catch (err) {
                console.error("❌ Erro ao editar registro:", err);
                mostrarMensagem("Erro ao editar registro.", "erro");
            } finally {
                btn.disabled = false;
                loader.style.display = "none";
            }
        });

    } catch (err) {
        console.error("❌ Erro geral em editarRegistro:", err);
        mostrarMensagem("Erro ao abrir edição.", "erro");
    }
};

// ==========================================================
// 🔹 Excluir Registro
// ==========================================================

window.excluirRegistro = async function (indice) {
    const schema = SCHEMAS[abaAtiva];
    const lista = dados[abaAtiva] || [];
    const registro = lista[indice];

    if (!schema || !registro) {
        mostrarMensagem("Registro não encontrado.", "erro");
        return;
    }

    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
        const token = localStorage.getItem("token");
        const id = registro.id;

        const res = await fetch(`${API_URL}${schema.apiPath}/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": "Bearer " + token } : {})
            }
        });

        const json = await res.json();
        if (!json.success) {
            mostrarMensagem(json.message || "Erro ao excluir.", "erro");
            return;
        }

        mostrarMensagem("Registro excluído com sucesso! 🗑", "sucesso");
        await carregarTabela(abaAtiva);

    } catch (err) {
        console.error("❌ Erro ao excluir registro:", err);
        mostrarMensagem("Erro ao excluir registro.", "erro");
    }
};
