import { dbConnect } from "../config/database.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { generateToken } from "../services/jwtService.js";

export default function loginRoutes(app) {
    app.post("/api/login", async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Você não preencheu todos os campos!"
                });
            }

            const db = await dbConnect();
            const loginCollection = db.collection("login");

            const userDB = await loginCollection.findOne({ username });

            if (!userDB || userDB.password !== password) {
                return res.status(401).json({
                    success: false,
                    message: "O usuário ou a senha inserida não está correta."
                });
            }

            const token = generateToken(userDB);

            return res.json({
                success: true,
                message: "Login realizado com sucesso!",
                user: {
                    id: userDB._id.toString(),
                    nome: userDB.full_name,
                    username: userDB.username,
                },
                
                token
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                error: `[Erro interno] ${err.message}`
            });
        }
    });

    app.get("/api/validate-session", verifyToken, (req, res) => {
        return res.json({
            success: true,
            usuario: req.user
        });
    });
}