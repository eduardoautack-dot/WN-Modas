import { API_URL } from "../config/config.js";
import { somenteNumeros } from "../masks.js";

export function esconderLoader() {
    const loader = document.getElementById("globalLoader");
    if (loader) loader.style.display = "none";
}

export function mostrarMensagem(mensagem, tipo = "sucesso") {
    let toast = document.getElementById("toastMsg");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastMsg";
        toast.className = "toast-msg";
        toast.innerHTML = `
            <div class="toast-emoji">✨</div>
            <div class="toast-content"><p></p></div>
        `;
        document.body.appendChild(toast);
    }

    toast.classList.remove("sucesso", "erro");
    toast.classList.add(tipo);
    toast.querySelector(".toast-content p").textContent = mensagem;
    toast.classList.add("visivel");

    setTimeout(() => {
        toast.classList.remove("visivel");
    }, 2600);
}

export function mostrarLoader() {
    let loader = document.getElementById("globalLoader");
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "globalLoader";
        loader.style.position = "fixed";
        loader.style.top = "15px";
        loader.style.right = "20px";
        loader.style.zIndex = "1100";
        loader.style.display = "none";
        loader.innerHTML = `
            <div style="
                padding: 8px 14px;
                background: rgba(59,42,30,0.92);
                color: #fff;
                border-radius: 999px;
                font-size: 13px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 14px rgba(0,0,0,0.25);
            ">
                <span class="loader-circle" style="
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid rgba(255,255,255,0.45);
                    border-top-color: #eabf91;
                    animation: spin 0.8s linear infinite;
                "></span>
                <span>Carregando...</span>
            </div>
        `;
        document.body.appendChild(loader);
    }
    loader.style.display = "block";
}

export async function buscarCEP(cep, modalBg) {
    try {
        const limpa = somenteNumeros(cep);
        if (limpa.length !== 8) return;

        mostrarMensagem("🔍 Buscando endereço…", "sucesso");

        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (data.erro) {
            mostrarMensagem("CEP não encontrado.", "erro");
            return;
        }

        const preencher = (campo, valor) => {
            const input = modalBg.querySelector(`#${campo}`);
            if (!input) return;

            if (valor === null || valor === undefined || valor === "") {
                return;
            }

            if (Array.isArray(valor)) {
                input.value = valor[0] || "";

            } else {
                input.value = valor;
            }
        };

        const bloquear = (campo) => {
            const input = modalBg.querySelector(`#${campo}`);
            if (input) input.setAttribute("readonly", true);
        };

        preencher("address", `${data.logradouro || `Rua não localizada`}, ${data.bairro || `Bairro não localizado`}, ${data.localidade || `Cidade não localizada`} - ${data.uf || `Estado não localizado`}`.replace(/(, | - )$/, ""));
        bloquear("address");
        
        mostrarMensagem("Endereço preenchido com sucesso! ✨", "sucesso");

    } catch (err) {
        console.error("Erro buscarCEP:", err);
        mostrarMensagem("Erro ao consultar CEP.", "erro");
    }
};

export async function buscarCNPJ(cnpj, modalBg) {
    try {
        const limpa = somenteNumeros(cnpj);
        if (limpa.length !== 14) return;

        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/suppliers/cnpj/${limpa}`, {
            headers: {
                "Content-Type": "application/json",
                ...(token ? { 
                    "Authorization": "Bearer " + token 
                } : {})
            }
        });

        const json = await res.json();
        if (!json.success) {
            mostrarMensagem(json.message || "Erro ao consultar CNPJ.", "erro");
            return;
        }

        const data = json.data;

        const preencher = (campo, valor) => {
            const input = modalBg.querySelector(`#${campo}`);
            if (!input) return;

            if (valor === null || valor === undefined || valor === "") {
                return;
            }

            if (Array.isArray(valor)) {
                input.value = valor[0] || "";

            } else {
                input.value = valor;
            }
        };

        const bloquear = (campo) => {
            const input = modalBg.querySelector(`#${campo}`);
            if (input) input.setAttribute("readonly", true);
        };

        preencher("tradeName", data.tradeName); bloquear("tradeName");
        preencher("state", data.state); bloquear("state");
        preencher("phone", data.phone); bloquear("phone");
        preencher("name", data.name); bloquear("name");
        bloquear("stateRegistration");

        mostrarMensagem("Dados do CNPJ preenchidos automaticamente! 🎉", "sucesso");

    } catch (err) {
        console.error("Erro buscarCNPJ:", err);
        mostrarMensagem("Erro ao consultar CNPJ.", "erro");
    }
}

export function calcularStatusAuto(data) {
    const hoje = new Date();
    const venc = new Date(data.dueDate);
    const pago = data.paymentDate ? new Date(data.paymentDate) : null;

    // Pago
    if (pago) return "Pago";

    // Parcelado
    if (data.type === "Parcelado") {
        return venc < hoje ? "Atrasado" : "Parcelado (Em Andamento)";
    }

    // Recorrente
    if (data.type === "Recorrente") {
        return venc < hoje ? "Atrasado" : "Pendente";
    }

    // Única
    if (data.type === "Única") {
        return venc < hoje ? "Atrasado" : "Pendente";
    }

    return data.status || "Pendente";
}
