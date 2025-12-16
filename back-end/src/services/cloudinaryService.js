import "dotenv/config";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const DEFAULT_FOLDER = process.env.CLOUDINARY_FOLDER || "wn-modas/products";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "unsigned_preset";

export async function uploadImageBufferToCloudinary(buffer, mimetype) {
    if (!CLOUD_NAME) {
        throw new Error("CLOUDINARY_CLOUD_NAME não definido no .env");
    }

    if (!UPLOAD_PRESET) {
        throw new Error("CLOUDINARY_UPLOAD_PRESET não definido no .env");
    }

    const base64 = buffer.toString("base64");
    const fileData = `data:${mimetype || "image/jpeg"};base64,${base64}`;

    const body = new URLSearchParams();
    body.append("file", fileData);
    body.append("upload_preset", UPLOAD_PRESET);
    if (DEFAULT_FOLDER) {
        body.append("folder", DEFAULT_FOLDER);
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    const response = await fetch(url, {
        method: "POST",
        body
    });

    const data = await response.json();
    if (!response.ok || data.error) {
        console.error("❌ Erro Cloudinary:", data);
        const msg = data?.error?.message || "Erro ao enviar imagem para o Cloudinary";
        throw new Error(msg);
    }

    return {
        secureUrl: data.secure_url,
        publicId: data.public_id
    };
}