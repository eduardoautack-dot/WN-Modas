import jwt from "jsonwebtoken";
import { generateSecretCode } from "../services/jwtService.js";

export async function protectRoute(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Token não fornecido ou em formato inválido."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.decode(token);
        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Token inválido."
            });
        }

        const userSecretKey = generateSecretCode(decoded.id);
        let verifiedUser;
        try {
            verifiedUser = jwt.verify(token, userSecretKey);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: "Sessão expirada ou token inválido."
            });
        }

        req.user = verifiedUser;
        next();

    } catch (error) {
        console.error("Erro no middleware protectRoute:", error);
        return res.status(500).json({
            success: false,
            message: "Erro interno ao validar o token."
        });
    }
}
