import { validateSession } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const usuario = await validateSession();
    if (usuario) window.location.href = "pages/inicio.html";
});