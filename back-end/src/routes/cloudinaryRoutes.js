import multer from "multer";
import express from "express";
import { uploadImageBufferToCloudinary } from "../services/cloudinaryService.js";


const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 } // 8MB
});

export default function cloudinaryRoutes(app) {
    app.post("/api/upload-image", upload.single("image"), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Nenhuma imagem enviada."
                });
            }

            const { buffer, mimetype } = req.file;
            const { secureUrl, publicId } = await uploadImageBufferToCloudinary(buffer, mimetype);

            return res.status(200).json({
                success: true,
                message: "Upload realizado com sucesso!",
                url: secureUrl,
                publicId
            });
        } catch (err) {
            console.error("[🔴 CLOUDINARY] Fatal error \"/api/upload-image\"\n\n", err.message);
            return res.status(500).json({
                success: false,
                message: "Erro ao enviar imagem.",
                error: err.message
            });
        }
    });
}