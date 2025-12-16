import jwt from "jsonwebtoken";
import { generateSecretCode } from "../services/jwtService.js";

export function verifyToken(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header) {
            return res.status(401).json({
                success: false,
                message: "Token não enviado."
            });
        }

        const token = header.split(" ")[1];
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Token inválido."
            });
        }

        const secret = generateSecretCode(decoded.id);
        const usuario = jwt.verify(token, secret);
        req.user = usuario;

        next();

    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Sessão expirada ou token inválido."
        });
    }
}