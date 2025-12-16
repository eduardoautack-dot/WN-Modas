import crypto from "crypto";
import jwt from "jsonwebtoken";

const BASE_SECRET = process.env.JWT_BASE_SECRET;

export function generateSecretCode(id) {
    return crypto
        .createHash("sha256")
        .update(BASE_SECRET + id.toString())
        .digest("hex");
}

export function generateToken(usuario) {
    const secret = generateSecretCode(usuario._id);

    return jwt.sign(
        {
            id: usuario._id.toString(),
            nome: usuario.nome,
            username: usuario.username
        },
        secret,
        { expiresIn: process.env.JWT_EXPIRATION }
    );
}