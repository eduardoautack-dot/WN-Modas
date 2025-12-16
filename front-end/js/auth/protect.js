import { validateSession } from "./auth.js";
import { logout } from "./logout.js";

document.addEventListener("DOMContentLoaded", async () => {
    const usuario = await validateSession();

    if (!usuario) {
        console.warn("Sessão inválida → Forçando logout...");
        return logout();
    }

    const nome = localStorage.getItem("nome");
    const user = localStorage.getItem("usuario");

    if (!nome || !user) {
        console.warn("Dados inconsistentes → Forçando logout...");
        return logout();
    }

    const nameEl = document.getElementById("userName");
    const circleEl = document.getElementById("userCircle");

    if (nameEl) nameEl.textContent = nome;
    if (circleEl) circleEl.textContent = nome.charAt(0).toUpperCase();

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
});