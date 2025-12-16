import { protectRoute } from "./middlewares/protectRoute.js";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import path from "path";
import "../load-env.js";

const app = express();

// ===============================
// MIDDLEWARES
// ===============================

app.use(cors({ origin: "*", methods: "GET,POST,PUT,DELETE" }));
app.use(express.json({ limit: "15mb" }));

// ===============================
// 🔐 ROTAS DA API PÚBLICA
// ===============================

import cloudinaryRoutes from "./routes/cloudinaryRoutes.js"; cloudinaryRoutes(app);

// ===============================
// 🔐 MIDDLEWARE DE PROTEÇÃO
// ===============================

app.use("/api", (req, res, next) => {
    const rotasPublicas = [ "/login", "/validate-session", "/upload-image" ];
    if (rotasPublicas.includes(req.path)) return next();
    return protectRoute(req, res, next);
});

// ===============================
// ROTAS DA API
// ===============================

import loginRoutes from "./routes/loginRoutes.js"; loginRoutes(app);
import expensesRoutes from "./routes/expensesRoutes.js"; expensesRoutes(app);
import productsRoutes from "./routes/productsRoutes.js"; productsRoutes(app);
import suppliersRoutes from "./routes/suppliersRoutes.js"; suppliersRoutes(app);
import customersRoutes from "./routes/customersRoutes.js"; customersRoutes(app);

// ===============================
// SERVIR FRONT-END
// ===============================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../front-end")));

app.get("/", (_, res) => {
    res.sendFile(path.join(__dirname, "../front-end/index.html"));
});

app.get("/inicio", (_, res) => {
    res.sendFile(path.join(__dirname, "../front-end/pages/inicio.html"));
});

// ===============================
// SERVIDOR
// ===============================
app.listen(3000, () => {
    console.log('[🟢 - SERVER] API running on http://localhost:3000');
});