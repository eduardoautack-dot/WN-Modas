import { dbConnect } from "../config/database.js";
import { getNextSequence } from "../utils/sequence.js";
import { ExpenseSchema, normalizeExpenseInput, validateExpense, getExpenseDbFieldsMap } from "../config/schema.js";

const DB_NAME = "website";
const COLLECTION = ExpenseSchema.collection;
const DB_FIELDS = getExpenseDbFieldsMap();

export default function expensesRoutes(app) {
    // ============================================
    // GET /api/expenses  (listar)
    // ============================================
    app.get("/api/expenses", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const { search } = req.query;
            let filter = {};

            if (search && search.trim() !== "") {
                const s = search.trim();
                filter = {
                    $or: [
                        { [DB_FIELDS["Categoria"]]: { $regex: s, $options: "i" } },
                        { [DB_FIELDS["Descrição"]]: { $regex: s, $options: "i" } },
                        { [DB_FIELDS["Origem"]]:    { $regex: s, $options: "i" } }
                    ]
                };
            }

            const expenses = await col
                .find(filter)
                .sort({ date: -1 })
                .toArray();

            return res.json({
                success: true,
                total: expenses.length,
                data: expenses
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao listar despesas:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao listar despesas.",
                error: err.message
            });
        }
    });

    // ============================================
    // GET /api/expenses/:id  (detalhar)
    // ============================================
    app.get("/api/expenses/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID inválido."
                });
            }

            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const expense = await col.findOne({ id });

            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: "Despesa não encontrada."
                });
            }

            return res.json({
                success: true,
                data: expense
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao buscar despesa:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao buscar despesa.",
                error: err.message
            });
        }
    });

    // ============================================
    // POST /api/expenses  (criar)
    // ============================================
    app.post("/api/expenses", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const expense = normalizeExpenseInput(req.body);
            const { valid, errors } = validateExpense(expense);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            const nextId = await getNextSequence(COLLECTION, DB_NAME);
            const now = new Date();

            const doc = {
                ...expense,
                id: nextId,
                createdAt: now,
                updatedAt: now
            };

            await col.insertOne(doc);

            return res.status(201).json({
                success: true,
                message: "Despesa cadastrada com sucesso!",
                data: doc
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao criar despesa:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao criar despesa.",
                error: err.message
            });
        }
    });

    // ============================================
    // PUT /api/expenses/:id  (atualizar)
    // ============================================
    app.put("/api/expenses/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID inválido."
                });
            }

            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const expense = normalizeExpenseInput(req.body);
            const { valid, errors } = validateExpense(expense);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            const now = new Date();
            const result = await col.findOneAndUpdate(
                { id },
                { $set: { ...expense, updatedAt: now } },
                { returnDocument: "after" }
            );

            if (!result.value) {
                return res.status(404).json({
                    success: false,
                    message: "Despesa não encontrada."
                });
            }

            return res.json({
                success: true,
                message: "Despesa atualizada com sucesso!",
                data: result.value
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao atualizar despesa:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao atualizar despesa.",
                error: err.message
            });
        }
    });

    // ============================================
    // DELETE /api/expenses/:id  (excluir)
    // ============================================
    app.delete("/api/expenses/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID inválido."
                });
            }

            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const result = await col.deleteOne({ id });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Despesa não encontrada."
                });
            }

            return res.json({
                success: true,
                message: "Despesa excluída com sucesso!"
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao excluir despesa:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao excluir despesa.",
                error: err.message
            });
        }
    });
}