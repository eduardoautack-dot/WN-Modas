import { API_URL } from "../config/config.js";

// ==================================================
// 🔹 AUTOPREENCHIMENTO DE "LEMBRAR DE MIM"
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
    const rememberData = JSON.parse(localStorage.getItem("remember"));

    if (rememberData?.lembrar) {
        document.getElementById("usuario").value = rememberData.usuario || "";
        document.getElementById("senha").value = rememberData.senha || "";
        document.getElementById("lembrar").checked = true;
    }
});

// ==================================================
// 🔹 FUNÇÃO DE LOGIN
// ==================================================
async function validarLogin(e) {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const lembrar = document.getElementById("lembrar").checked;

    const loader = document.getElementById("loader");
    const erro = document.getElementById("erro");
    const boxEl = document.getElementById("loginBox");

    erro.textContent = "";
    loader.style.display = "block";

    try {
        const res = await fetch(API_URL + "/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: usuario, password: senha })
        });

        const json = await res.json();

        if (!json.success) {
            loader.style.display = "none";
            erro.textContent = json.message;
            return;
        }

        localStorage.setItem("token", json.token);
        localStorage.setItem("nome", json.user.nome);
        localStorage.setItem("usuario", json.user.username);

        if (lembrar) {
            localStorage.setItem("remember", JSON.stringify({
                lembrar: true,
                usuario,
                senha
            }));
        } else {
            localStorage.removeItem("remember");
        }

        boxEl.classList.add("fade-out");
        // setTimeout(() => window.location.href = "/inicio", 500);
        setTimeout(() => window.location.href = "pages/inicio.html", 500);

    } catch (err) {
        loader.style.display = "none";
        erro.textContent = "Erro ao conectar ao servidor.";
    }
}

document.getElementById("btnLogin")
    .addEventListener("click", validarLogin);