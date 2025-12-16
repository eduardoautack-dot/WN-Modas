import { API_URL } from "../config/config.js";

const API_UPLOAD_URL = `${API_URL}/api/upload-image`;

function ensureUploadOverlay() {
    let overlay = document.getElementById("upload-loading-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "upload-loading-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.35)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";
    overlay.style.backdropFilter = "blur(2px)";
    overlay.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    overlay.style.color = "#fff";
    overlay.style.fontSize = "15px";
    overlay.style.visibility = "hidden";
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.2s ease";

    overlay.innerHTML = `
        <div style="
            background:#222;
            padding:14px 20px;
            border-radius:12px;
            display:flex;
            align-items:center;
            gap:10px;
            box-shadow:0 10px 30px rgba(0,0,0,0.35);
        ">
            <div style="
                width:18px;
                height:18px;
                border-radius:50%;
                border:3px solid rgba(255,255,255,0.3);
                border-top-color:#fff;
                animation:spin-upload 0.6s linear infinite;
            "></div>
            <span>Enviando imagem...</span>
        </div>
    `;

    const style = document.createElement("style");
    style.innerHTML = `
        @keyframes spin-upload {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    return overlay;
}

function showUploadOverlay() {
    const overlay = ensureUploadOverlay();
    overlay.style.visibility = "visible";
    overlay.style.opacity = "1";
}

function hideUploadOverlay() {
    const overlay = ensureUploadOverlay();
    overlay.style.opacity = "0";
    setTimeout(() => {
        overlay.style.visibility = "hidden";
    }, 200);
}

export async function uploadToCloudinary(file) {
    if (!file) return null;

    const formData = new FormData();
    formData.append("image", file);

    showUploadOverlay();

    try {
        const res = await fetch(API_UPLOAD_URL, {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            console.error("❌ Erro upload front:", data);
            const msg = data.message || "Erro ao enviar imagem.";
            throw new Error(msg);
        }

        return data.url;
    } catch (err) {
        console.error("💥 uploadToCloudinary:", err);
        alert("Erro ao enviar a imagem. Tente novamente.\n\nDetalhes: " + err.message);
        throw err;
    } finally {
        hideUploadOverlay();
    }
}