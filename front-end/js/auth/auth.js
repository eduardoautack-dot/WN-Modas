import { logout } from "../auth/logout.js";
import { API_URL } from "../config/config.js";

export async function validateSession() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return null;

        const res = await fetch(API_URL + "/api/validate-session", {
            headers: { "Authorization": "Bearer " + token }
        });

        const json = await res.json();
        if (!json.success) {
            return logout();
        }

        return json.usuario;

    } catch (err) {
        console.error("Erro na validação de sessão:", err);
        return null;
    }
}
